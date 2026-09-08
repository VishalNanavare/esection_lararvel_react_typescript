<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
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

        $ip = $request->ip();
        $username = trim($request->input('username'));
        $password = $request->input('password');

        // Check throttle: max 5 failed attempts in 5 minutes
        $recentFailures = LoginAttempt::where('ip_address', $ip)
            ->where('attempted_at', '>=', now()->subMinutes(5))
            ->where('successful', false)
            ->count();

        if ($recentFailures >= 5) {
            return back()->withErrors([
                'username' => 'Too many failed login attempts. Please try again after 5 minutes.',
            ]);
        }

        $user = User::where('username', $username)->first();

        $valid = false;
        if ($user && $user->is_active) {
            if ($user->password && Hash::check($password, $user->password)) {
                $valid = true;
            } elseif ($user->password_hash && password_verify($password, $user->password_hash)) {
                $valid = true;
                // Rehash and sync to modern password column if matched legacy
                $user->password = Hash::make($password);
                $user->save();
            }
        }

        // Record attempt
        LoginAttempt::create([
            'ip_address' => $ip,
            'username' => $username,
            'successful' => $valid,
            'attempted_at' => now(),
        ]);

        if (!$valid) {
            return back()->withErrors([
                'username' => 'Invalid username or password. Please verify your credentials.',
            ]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

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
            'new_password' => 'required|string|min:6|max:64|different:current_password',
        ]);

        /** @var User $user */
        $user = Auth::user();

        $currentValid = false;
        if ($user->password && Hash::check($request->input('current_password'), $user->password)) {
            $currentValid = true;
        } elseif ($user->password_hash && password_verify($request->input('current_password'), $user->password_hash)) {
            $currentValid = true;
        }

        if (!$currentValid) {
            return back()->withErrors([
                'current_password' => 'Current password does not match.',
            ]);
        }

        $newHash = Hash::make($request->input('new_password'));
        $user->password = $newHash;
        $user->password_hash = $newHash;
        $user->save();

        ActivityLog::record('auth.change_password', "User '{$user->username}' changed their password.");

        return back()->with('success', 'Your password has been changed successfully.');
    }
}
