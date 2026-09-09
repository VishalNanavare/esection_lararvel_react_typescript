<?php

use App\Models\User;
use App\Models\UserPageAccess;

test('staff user with no granted permissions is redirected away from a permissioned page', function () {
    $staff = User::create([
        'username' => 'no_perms_staff',
        'full_name' => 'No Perms Staff',
        'password' => bcrypt('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $response = $this->actingAs($staff)->get(route('universities.index'));

    $response->assertRedirect(route('dashboard'));
    $response->assertSessionHas('error');
});

test('staff user with the matching permission can reach a permissioned page', function () {
    $staff = User::create([
        'username' => 'uni_viewer',
        'full_name' => 'University Viewer',
        'password' => bcrypt('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    UserPageAccess::create([
        'user_id' => $staff->id,
        'page_key' => 'universities.view',
        'granted_by' => $staff->id,
        'granted_at' => now(),
    ]);

    $response = $this->actingAs($staff)->get(route('universities.index'));

    $response->assertOk();
});

test('non-admin staff cannot reach any settings screen', function () {
    $staff = User::create([
        'username' => 'settings_blocked',
        'full_name' => 'Settings Blocked',
        'password' => bcrypt('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $response = $this->actingAs($staff)->get(route('settings.users'));

    $response->assertRedirect(route('dashboard'));
    $response->assertSessionHas('error');
});

test('admin bypasses every permission and admin check', function () {
    $admin = User::create([
        'username' => 'plan_admin',
        'full_name' => 'Plan Admin',
        'password' => bcrypt('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);

    $this->actingAs($admin)->get(route('universities.index'))->assertOk();
    $this->actingAs($admin)->get(route('settings.users'))->assertOk();
});
