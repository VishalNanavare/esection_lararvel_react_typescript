<?php

namespace App\Http\Controllers;

use App\Mail\RawHtmlMail;
use App\Models\ActivityLog;
use App\Models\LoginAttempt;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    /** Failed attempts from one IP before that IP is refused. */
    private const MAX_FAILURES_PER_IP = 5;

    /** Failed attempts against one username, from any IP, before it is refused. */
    private const MAX_FAILURES_PER_USERNAME = 10;

    /** How far back the failure counters look, and the effective cooldown. */
    private const THROTTLE_WINDOW_MINUTES = 15;

    private const PASSWORD_CHANGE_ATTEMPTS_PER_MINUTE = 10;

    private const RESET_REQUESTS_PER_MINUTE = 3;

    private const RESET_TOKEN_VALID_MINUTES = 60;

    public const MIN_PASSWORD_LENGTH = 8;

    public const MAX_PASSWORD_LENGTH = 10;

    public function showLogin(): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Auth/Login', [
            'title' => 'Sign In - E-Section Portal',
        ]);
    }

    public function login(Request $request): RedirectResponse
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $ip = (string) $request->ip();
        $username = trim($request->input('username'));
        $password = (string) $request->input('password');

        $windowStart = now()->subMinutes(self::THROTTLE_WINDOW_MINUTES);

        $ipFailures = LoginAttempt::where('ip_address', $ip)
            ->where('attempted_at', '>=', $windowStart)
            ->where('successful', false)
            ->count();

        if ($ipFailures >= self::MAX_FAILURES_PER_IP) {
            return back()->withErrors([
                'username' => 'Too many failed login attempts. Please try again in '.self::THROTTLE_WINDOW_MINUTES.' minutes.',
            ]);
        }

        $usernameFailures = LoginAttempt::where('username', $username)
            ->where('attempted_at', '>=', $windowStart)
            ->where('successful', false)
            ->count();

        if ($usernameFailures >= self::MAX_FAILURES_PER_USERNAME) {
            return back()->withErrors([
                'username' => 'Too many failed sign-in attempts for this account. Please try again in '.self::THROTTLE_WINDOW_MINUTES.' minutes.',
            ]);
        }

        $user = User::where('username', $username)->first();

        // Always spend a bcrypt verification, even for a nonexistent or
        // inactive account, so response timing can't be used to tell real
        // usernames from invented ones.
        $valid = false;
        if ($user && $user->is_active) {
            if ($user->password && Hash::check($password, $user->password)) {
                $valid = true;
            } elseif ($user->password_hash && password_verify($password, $user->password_hash)) {
                $valid = true;
                // Rehash and sync to the modern password column if matched via legacy hash.
                $user->password = Hash::make($password);
                $user->save();
            }
        } else {
            password_verify($password, User::DUMMY_HASH);
        }

        LoginAttempt::create([
            'ip_address' => $ip,
            'username' => $username,
            'successful' => $valid,
            'attempted_at' => now(),
        ]);

        if (! $valid) {
            return back()->withErrors([
                'username' => 'Invalid username or password. Please verify your credentials.',
            ]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();
        $request->session()->put('pw_fingerprint', User::sessionFingerprint((string) ($user->password ?: $user->password_hash)));
        $request->session()->put('login_ip', $ip);
        $request->session()->put('last_seen', now()->timestamp);
        $request->session()->put('auth_revalidated_at', now()->timestamp);

        ActivityLog::record('auth.login', "User '{$user->username}' logged in successfully.");

        return redirect()->intended(route('dashboard'));
    }

    public function logout(Request $request): RedirectResponse
    {
        $username = Auth::user()?->username;

        if ($username) {
            ActivityLog::record('auth.logout', "User '{$username}' logged out.");
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    public function changePassword(Request $request): RedirectResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:'.self::MIN_PASSWORD_LENGTH.'|max:'.self::MAX_PASSWORD_LENGTH.'|different:current_password',
        ]);

        /** @var User $user */
        $user = Auth::user();

        $rateLimitKey = 'pwchange:'.$user->id;
        if (RateLimiter::tooManyAttempts($rateLimitKey, self::PASSWORD_CHANGE_ATTEMPTS_PER_MINUTE)) {
            return back()->withErrors([
                'current_password' => 'Too many password-change attempts. Please wait a minute and try again.',
            ]);
        }
        RateLimiter::hit($rateLimitKey, 60);

        $currentValid = false;
        if ($user->password && Hash::check($request->input('current_password'), $user->password)) {
            $currentValid = true;
        } elseif ($user->password_hash && password_verify($request->input('current_password'), $user->password_hash)) {
            $currentValid = true;
        }

        if (! $currentValid) {
            return back()->withErrors([
                'current_password' => 'Current password does not match.',
            ]);
        }

        $newHash = Hash::make($request->input('new_password'));
        $user->password = $newHash;
        $user->password_hash = $newHash;
        $user->save();

        RateLimiter::clear($rateLimitKey);
        $request->session()->put('pw_fingerprint', User::sessionFingerprint($newHash));

        ActivityLog::record('auth.change_password', "User '{$user->username}' changed their password.");

        return back()->with('success', 'Your password has been changed successfully.');
    }

    public function showForgotPassword(): Response
    {
        return Inertia::render('Auth/ForgotPassword', [
            'title' => 'Forgot Password - E-Section Portal',
        ]);
    }

    /**
     * Always shows the same generic outcome whether or not the submitted
     * username/email matched a real, active account with a usable email on
     * file — an outcome that differs by account existence is itself an
     * enumeration oracle.
     */
    public function sendResetLink(Request $request): RedirectResponse
    {
        $request->validate([
            'identifier' => 'required|string|max:190',
        ]);

        $ip = (string) $request->ip();
        $rateLimitKey = 'password-reset-request:'.$ip;

        if (RateLimiter::tooManyAttempts($rateLimitKey, self::RESET_REQUESTS_PER_MINUTE)) {
            return redirect()->route('login')->with('error', 'Too many reset requests. Please wait a minute and try again.');
        }
        RateLimiter::hit($rateLimitKey, 60);

        try {
            $this->issueResetToken(trim($request->input('identifier')));
        } catch (\Throwable $e) {
            report($e);
        }

        return redirect()->route('login')->with('success', 'If an account matches that username or email, a reset link has been sent to the address on file.');
    }

    private function issueResetToken(string $usernameOrEmail): void
    {
        if ($usernameOrEmail === '') {
            return;
        }

        $user = filter_var($usernameOrEmail, FILTER_VALIDATE_EMAIL)
            ? User::where('email', $usernameOrEmail)->first()
            : User::where('username', $usernameOrEmail)->first();

        if ($user === null || ! $user->is_active) {
            return;
        }

        if (! $user->email || ! filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
            return;
        }

        if (! Setting::isMailConfigured()) {
            return;
        }

        $rawToken = bin2hex(random_bytes(32));
        $user->reset_token_hash = hash('sha256', $rawToken);
        $user->reset_expires_at = now()->addMinutes(self::RESET_TOKEN_VALID_MINUTES);
        $user->save();

        $resetLink = route('password.reset.show', ['token' => $rawToken]);

        $rendered = $this->renderAuthEmail('password_reset', [
            'full_name' => $user->full_name ?: $user->username,
            'username' => $user->username,
            'reset_link' => $resetLink,
            'valid_for' => self::RESET_TOKEN_VALID_MINUTES.' minutes',
        ]);

        try {
            Setting::applyMailerConfig();
            Mail::mailer(Setting::MAIL_MAILER_NAME)
                ->to($user->email)
                ->send(new RawHtmlMail($rendered['body'], $rendered['subject']));
        } catch (\Throwable $e) {
            report($e);

            return;
        }

        ActivityLog::record('auth.password_reset.request', "Password reset requested for '{$user->username}'.");
    }

    public function showResetPassword(string $token): Response|RedirectResponse
    {
        if (! $this->resetTokenIsValid($token)) {
            return redirect()->route('password.forgot')->with('error', 'This reset link is invalid or has expired. Request a new one below.');
        }

        return Inertia::render('Auth/ResetPassword', [
            'title' => 'Reset Password - E-Section Portal',
            'token' => $token,
        ]);
    }

    public function resetPassword(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => 'required|string',
            'password' => 'required|string|min:'.self::MIN_PASSWORD_LENGTH.'|max:'.self::MAX_PASSWORD_LENGTH,
            'password_confirmation' => 'required|string|same:password',
        ]);

        $token = $request->input('token');
        $user = $this->findByValidResetToken($token);

        if ($user === null) {
            return redirect()->route('password.forgot')->with('error', 'This reset link is invalid or has expired. Request a new one.');
        }

        $newHash = Hash::make($request->input('password'));
        $user->password = $newHash;
        $user->password_hash = $newHash;
        $user->reset_token_hash = null;
        $user->reset_expires_at = null;
        $user->save();

        ActivityLog::record('auth.password_reset.complete', "Password reset completed for '{$user->username}'.");

        return redirect()->route('login')->with('success', 'Your password has been reset. You can now log in.');
    }

    private function resetTokenIsValid(string $rawToken): bool
    {
        return $rawToken !== '' && $this->findByValidResetToken($rawToken) !== null;
    }

    private function findByValidResetToken(string $rawToken): ?User
    {
        if ($rawToken === '') {
            return null;
        }

        return User::where('reset_token_hash', hash('sha256', $rawToken))
            ->where('reset_expires_at', '>=', now())
            ->first();
    }

    /**
     * Mirrors BulkEmailController::renderEmailTemplate()'s algorithm exactly
     * (plain subject, escaped-not-bolded body) for the one auth-flow email
     * template ('password_reset') that lives outside Bulk Email.
     *
     * @return array{subject: string, body: string}
     */
    private function renderAuthEmail(string $slug, array $tokenValues): array
    {
        $definitions = SettingsController::getEmailTemplateDefinitions();
        $def = $definitions[$slug] ?? ['default_subject' => '', 'default_body' => ''];

        $subject = Setting::get("email_{$slug}_subject", $def['default_subject']);
        $body = Setting::get("email_{$slug}_body", $def['default_body']);

        $subjectReplacements = [];
        $bodyReplacements = [];
        foreach ($tokenValues as $token => $value) {
            $subjectReplacements['{'.$token.'}'] = (string) $value;
            $bodyReplacements['{'.$token.'}'] = e((string) $value);
        }

        return [
            'subject' => strtr($subject, $subjectReplacements),
            'body' => strtr(nl2br(e($body)), $bodyReplacements),
        ];
    }
}
