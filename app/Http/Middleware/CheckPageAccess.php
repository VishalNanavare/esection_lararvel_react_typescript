<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPageAccess
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (!$user) {
            return redirect()->route('login');
        }

        if ($user->isAdmin()) {
            return $next($request);
        }

        if (empty($permissions)) {
            return $next($request);
        }

        // Check if user has ANY of the specified permissions
        if ($user->hasAnyPermission($permissions)) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to perform this action.'], 403);
        }

        return redirect()->route('dashboard')->with('error', 'Access Denied: You do not have permission to view that page.');
    }
}
