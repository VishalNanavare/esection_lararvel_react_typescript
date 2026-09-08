<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'appName' => Setting::get('institute_name', 'E-Section Verification System'),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'username' => $user->username,
                    'full_name' => $user->full_name ?: $user->username,
                    'role' => $user->role,
                    'email' => $user->email,
                ] : null,
                'permissions' => $user ? $user->getPermissionKeys() : [],
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
            'features' => [
                'export' => Setting::get('feature_export_enabled', '1') === '1',
                'import' => Setting::get('feature_import_enabled', '1') === '1',
                'delete' => Setting::get('feature_delete_enabled', '1') === '1',
                'bulk_email' => Setting::get('feature_bulk_email_enabled', '1') === '1',
            ],
        ];
    }
}
