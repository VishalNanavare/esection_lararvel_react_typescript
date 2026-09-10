<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Keeps a logged-in session honest between requests, mirroring esection_ci4's
 * AuthFilter: role/is_active/page-access are cached into the session at
 * login, and without this nothing ever re-checks that cache against the
 * database for the life of the session.
 */
class RevalidateSession
{
    /** How stale the cached account state is allowed to get before being re-checked. */
    private const REVALIDATE_INTERVAL_SECONDS = 60;

    public function handle(Request $request, Closure $next): Response
    {
        if (! Auth::check()) {
            return $next($request);
        }

        if ($response = $this->endIfIdle($request)) {
            return $response;
        }

        if ($response = $this->endIfIpChanged($request)) {
            return $response;
        }

        if ($response = $this->revalidateIfStale($request)) {
            return $response;
        }

        return $next($request);
    }

    /** Enforces config('session.lifetime') as an IDLE timeout, not just a cookie hint. */
    private function endIfIdle(Request $request): ?Response
    {
        $limitSeconds = ((int) config('session.lifetime')) * 60;
        if ($limitSeconds <= 0) {
            return null;
        }

        $lastSeen = $request->session()->get('last_seen');
        $now = now()->timestamp;

        if ($lastSeen !== null && ($now - (int) $lastSeen) > $limitSeconds) {
            $this->endSession($request);

            return $this->unauthorized($request, 'Your session timed out after a period of inactivity. Please sign in again.');
        }

        $request->session()->put('last_seen', $now);

        return null;
    }

    /** A session whose IP changed mid-flight is treated as hijacked, not roamed. */
    private function endIfIpChanged(Request $request): ?Response
    {
        $loginIp = $request->session()->get('login_ip');

        if ($loginIp === null) {
            // Predates this check — adopt rather than end, so deploying it
            // doesn't sign out everyone already logged in.
            $request->session()->put('login_ip', $request->ip());

            return null;
        }

        if ($loginIp !== $request->ip()) {
            $this->endSession($request);

            return $this->unauthorized($request, 'Your session ended because your connection changed. Please sign in again.');
        }

        return null;
    }

    private function revalidateIfStale(Request $request): ?Response
    {
        $lastCheck = (int) ($request->session()->get('auth_revalidated_at') ?? 0);

        if (now()->timestamp - $lastCheck < self::REVALIDATE_INTERVAL_SECONDS) {
            return null;
        }

        $authUser = Auth::user();
        $fresh = $authUser ? User::find($authUser->getAuthIdentifier()) : null;

        if ($fresh === null || ! $fresh->is_active) {
            $this->endSession($request);

            return $this->unauthorized($request, 'Your session has ended because your account is no longer active.');
        }

        $fingerprint = User::sessionFingerprint((string) ($fresh->password ?: $fresh->password_hash));
        $seen = $request->session()->get('pw_fingerprint');

        if ($seen === null) {
            $request->session()->put('pw_fingerprint', $fingerprint);
        } elseif (! hash_equals($fingerprint, (string) $seen)) {
            $this->endSession($request);

            return $this->unauthorized($request, 'Your password was changed, so this session has ended. Please sign in again.');
        }

        $request->session()->put('auth_revalidated_at', now()->timestamp);

        return null;
    }

    private function endSession(Request $request): void
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
    }

    private function unauthorized(Request $request, string $message): Response
    {
        if ($request->expectsJson()) {
            return response()->json(['message' => $message], 401);
        }

        return redirect()->route('login')->with('error', $message);
    }
}
