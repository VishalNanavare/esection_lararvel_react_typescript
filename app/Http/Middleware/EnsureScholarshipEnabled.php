<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureScholarshipEnabled
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(Setting::get('feature_scholarship_enabled', '0') === '1', 404, 'Scholarship module is currently disabled.');

        return $next($request);
    }
}
