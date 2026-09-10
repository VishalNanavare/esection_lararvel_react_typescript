<?php

use App\Mail\RawHtmlMail;
use App\Models\LoginAttempt;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;

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

test('a nonexistent username gets the exact same error as a wrong password', function () {
    User::create([
        'username' => 'real_user',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $wrongPasswordResponse = $this->post('/login', ['username' => 'real_user', 'password' => 'nope']);
    $wrongPasswordResponse->assertSessionHasErrors('username');
    $wrongMessage = $wrongPasswordResponse->getSession()->get('errors')->get('username');

    $noSuchUserResponse = $this->post('/login', ['username' => 'nobody_here', 'password' => 'nope']);
    $noSuchUserResponse->assertSessionHasErrors('username');
    $noSuchMessage = $noSuchUserResponse->getSession()->get('errors')->get('username');

    expect($wrongMessage)->toBe($noSuchMessage);
});

test('an inactive account cannot log in even with the correct password', function () {
    User::create([
        'username' => 'deactivated_user',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => false,
    ]);

    $response = $this->post('/login', ['username' => 'deactivated_user', 'password' => 'secret123']);

    $this->assertGuest();
    $response->assertSessionHasErrors('username');
});

test('login is blocked after 5 failed attempts from the same IP within 15 minutes', function () {
    User::create([
        'username' => 'ip_throttle_target',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    foreach (range(1, 5) as $i) {
        LoginAttempt::create([
            'ip_address' => '127.0.0.1',
            'username' => "attempt_{$i}",
            'successful' => false,
            'attempted_at' => now()->subMinutes(5),
        ]);
    }

    $response = $this->post('/login', ['username' => 'ip_throttle_target', 'password' => 'secret123']);

    $this->assertGuest();
    $response->assertSessionHasErrors('username');
    expect($response->getSession()->get('errors')->get('username')[0])->toContain('Too many failed login attempts');
});

test('login is blocked after 10 failed attempts against one username even from different IPs', function () {
    User::create([
        'username' => 'username_throttle_target',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    foreach (range(1, 10) as $i) {
        LoginAttempt::create([
            'ip_address' => "10.0.0.{$i}",
            'username' => 'username_throttle_target',
            'successful' => false,
            'attempted_at' => now()->subMinutes(5),
        ]);
    }

    $response = $this->from('/login')->post('/login', [
        'username' => 'username_throttle_target',
        'password' => 'secret123',
    ]);

    $this->assertGuest();
    $response->assertSessionHasErrors('username');
    expect($response->getSession()->get('errors')->get('username')[0])->toContain('Too many failed sign-in attempts for this account');
});

test('failed attempts older than the 15 minute window do not count toward the throttle', function () {
    User::create([
        'username' => 'stale_attempts_user',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    foreach (range(1, 5) as $i) {
        LoginAttempt::create([
            'ip_address' => '127.0.0.1',
            'username' => "old_attempt_{$i}",
            'successful' => false,
            'attempted_at' => now()->subMinutes(20),
        ]);
    }

    $response = $this->post('/login', ['username' => 'stale_attempts_user', 'password' => 'secret123']);

    $this->assertAuthenticated();
});

test('change password is rate limited after 10 attempts per minute', function () {
    $user = User::create([
        'username' => 'pwchange_throttle_user',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    RateLimiter::clear('pwchange:'.$user->id);
    for ($i = 0; $i < 10; $i++) {
        RateLimiter::hit('pwchange:'.$user->id, 60);
    }

    $response = $this->actingAs($user)->post('/change-password', [
        'current_password' => 'secret123',
        'new_password' => 'newpass1',
    ]);

    $response->assertSessionHasErrors('current_password');
    expect($response->getSession()->get('errors')->get('current_password')[0])->toContain('Too many password-change attempts');
});

test('change password enforces the 8-10 character policy', function () {
    $user = User::create([
        'username' => 'pwpolicy_user',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $tooShort = $this->actingAs($user)->post('/change-password', [
        'current_password' => 'secret123',
        'new_password' => 'short1',
    ]);
    $tooShort->assertSessionHasErrors('new_password');

    $tooLong = $this->actingAs($user)->post('/change-password', [
        'current_password' => 'secret123',
        'new_password' => 'wayTooLongPassword123',
    ]);
    $tooLong->assertSessionHasErrors('new_password');
});

test('changing password updates the session fingerprint so the current session survives', function () {
    $user = User::create([
        'username' => 'fingerprint_survivor',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $this->actingAs($user)->post('/change-password', [
        'current_password' => 'secret123',
        'new_password' => 'newpass1',
    ]);

    // The very next request under this session must not be treated as
    // "changed elsewhere" and logged out.
    $response = $this->actingAs($user->fresh())->get(route('dashboard'));
    $response->assertOk();
});

test('forgot password shows the same generic message whether or not the account exists', function () {
    Mail::fake();
    Setting::set('mail_smtp_host', 'smtp.example.com', 'mail', null);
    Setting::set('mail_from_email', 'noreply@example.com', 'mail', null);

    User::create([
        'username' => 'reset_target',
        'email' => 'reset_target@example.com',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $realResponse = $this->post('/forgot-password', ['identifier' => 'reset_target']);
    $fakeResponse = $this->post('/forgot-password', ['identifier' => 'nobody_by_this_name']);

    expect($realResponse->getSession()->get('success'))->toBe($fakeResponse->getSession()->get('success'));
    Mail::assertSent(RawHtmlMail::class, fn ($mail) => $mail->hasTo('reset_target@example.com'));
});

test('forgot password issues a working reset link that lets the user log in with a new password', function () {
    Mail::fake();
    Setting::set('mail_smtp_host', 'smtp.example.com', 'mail', null);
    Setting::set('mail_from_email', 'noreply@example.com', 'mail', null);

    $user = User::create([
        'username' => 'full_flow_user',
        'email' => 'full_flow@example.com',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $this->post('/forgot-password', ['identifier' => 'full_flow_user']);

    $user->refresh();
    expect($user->reset_token_hash)->not->toBeNull();
    expect($user->reset_expires_at)->not->toBeNull();

    $capturedLink = null;
    Mail::assertSent(RawHtmlMail::class, function ($mail) use (&$capturedLink) {
        $capturedLink = $mail->htmlBody;

        return true;
    });

    preg_match('#/reset-password/([a-f0-9]{64})#', (string) $capturedLink, $matches);
    $rawToken = $matches[1] ?? null;
    expect($rawToken)->not->toBeNull();
    expect(hash('sha256', $rawToken))->toBe($user->reset_token_hash);

    $showResponse = $this->get("/reset-password/{$rawToken}");
    $showResponse->assertOk();

    $resetResponse = $this->post('/reset-password', [
        'token' => $rawToken,
        'password' => 'newpass1',
        'password_confirmation' => 'newpass1',
    ]);
    $resetResponse->assertRedirect(route('login'));

    $user->refresh();
    expect($user->reset_token_hash)->toBeNull();

    $loginResponse = $this->post('/login', ['username' => 'full_flow_user', 'password' => 'newpass1']);
    $this->assertAuthenticatedAs($user->fresh());
    $loginResponse->assertRedirect(route('dashboard'));
});

test('an expired reset token is rejected', function () {
    $user = User::create([
        'username' => 'expired_token_user',
        'email' => 'expired@example.com',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
        'reset_token_hash' => hash('sha256', 'some-raw-token'),
        'reset_expires_at' => now()->subMinute(),
    ]);

    $response = $this->get('/reset-password/some-raw-token');
    $response->assertRedirect(route('password.forgot'));

    $submit = $this->post('/reset-password', [
        'token' => 'some-raw-token',
        'password' => 'newpass1',
        'password_confirmation' => 'newpass1',
    ]);
    $submit->assertRedirect(route('password.forgot'));

    $this->assertGuest();
});

test('forgot password requests are rate limited per IP', function () {
    Mail::fake();

    foreach (range(1, 3) as $i) {
        RateLimiter::hit('password-reset-request:127.0.0.1', 60);
    }

    $response = $this->post('/forgot-password', ['identifier' => 'anyone']);

    expect($response->getSession()->get('error'))->toContain('Too many reset requests');
});

test('session ends when the account is deactivated between requests', function () {
    $user = User::create([
        'username' => 'goes_inactive',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $this->post('/login', ['username' => 'goes_inactive', 'password' => 'secret123']);
    $this->assertAuthenticated();

    $user->is_active = false;
    $user->save();

    $this->travel(2)->minutes();
    $response = $this->get(route('dashboard'));

    $this->assertGuest();
    $response->assertRedirect(route('login'));
});

test('session ends when the password changes elsewhere between requests', function () {
    $user = User::create([
        'username' => 'pw_changed_elsewhere',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $this->post('/login', ['username' => 'pw_changed_elsewhere', 'password' => 'secret123']);
    $this->assertAuthenticated();

    $user->password = Hash::make('differentpass1');
    $user->save();

    $this->travel(2)->minutes();
    $response = $this->get(route('dashboard'));

    $this->assertGuest();
    $response->assertRedirect(route('login'));
});

test('session times out after being idle longer than the configured session lifetime', function () {
    $user = User::create([
        'username' => 'idle_timeout_user',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $this->post('/login', ['username' => 'idle_timeout_user', 'password' => 'secret123']);
    $this->assertAuthenticated();

    $this->travel((int) config('session.lifetime') + 1)->minutes();
    $response = $this->get(route('dashboard'));

    $this->assertGuest();
    $response->assertRedirect(route('login'));
});

test('session ends when the request IP changes mid-session', function () {
    $user = User::create([
        'username' => 'ip_hijack_target',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.5'])
        ->post('/login', ['username' => 'ip_hijack_target', 'password' => 'secret123']);
    $this->assertAuthenticated();

    $response = $this->withServerVariables(['REMOTE_ADDR' => '198.51.100.9'])->get(route('dashboard'));

    $this->assertGuest();
    $response->assertRedirect(route('login'));
});
