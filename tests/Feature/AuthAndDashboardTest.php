<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

test('guest is redirected from dashboard to login', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('user can authenticate using valid credentials', function () {
    $user = User::create([
        'username' => 'test_admin',
        'full_name' => 'Test Administrator',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);

    $response = $this->post('/login', [
        'username' => 'test_admin',
        'password' => 'secret123',
    ]);

    $this->assertAuthenticatedAs($user);
    $response->assertRedirect(route('dashboard'));
});

test('user cannot authenticate with invalid password', function () {
    $user = User::create([
        'username' => 'test_staff',
        'full_name' => 'Test Staff',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $response = $this->from(route('login'))->post('/login', [
        'username' => 'test_staff',
        'password' => 'wrongpassword',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors('username');
});

test('authenticated user can view dashboard', function () {
    $user = User::create([
        'username' => 'test_viewer',
        'full_name' => 'Test Viewer',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->get(route('dashboard'));
    $response->assertOk();
});

test('user can log out', function () {
    $user = User::create([
        'username' => 'test_logout',
        'full_name' => 'Test Logout',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $response = $this->actingAs($user)->post(route('logout'));
    $this->assertGuest();
    $response->assertRedirect(route('login'));
});
