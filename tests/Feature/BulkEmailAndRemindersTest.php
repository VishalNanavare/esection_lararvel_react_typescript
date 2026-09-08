<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->admin = User::create([
        'username' => 'admin_test_reminder_' . uniqid(),
        'full_name' => 'System Administrator',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
});

test('reminders route redirects or serves university portal', function () {
    $response = $this->actingAs($this->admin)->get('/reminders');
    $response->assertRedirect('/reminders/university');

    $response2 = $this->actingAs($this->admin)->get('/reminders/university');
    $response2->assertStatus(200);
});

test('reminders university export returns csv stream', function () {
    $response = $this->actingAs($this->admin)->get('/reminders/university/export');
    $response->assertStatus(200);
    $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
});

test('regularization form is accessible and stores record', function () {
    $response = $this->actingAs($this->admin)->get('/regularization');
    $response->assertStatus(200);

    $postData = [
        'student_name' => 'Regular Test Student',
        'gender' => 'Mr.',
        'eligibility_case_no' => 'REG/TEST/001',
        'admission_letter_for' => 'The Principal',
        'admission_letter_date' => '2026-09-08',
        'admission_taken_year' => '2025-2026',
        'admission_taken_in' => 'B.Com.',
        'university_name' => 'University of Mumbai',
        'passing_course' => 'H.S.C.',
    ];

    $postRes = $this->actingAs($this->admin)->post('/regularization', $postData);
    $postRes->assertRedirect(route('regularization.history'));
});

test('bulk email compose and logs screens are accessible by admin', function () {
    $response = $this->actingAs($this->admin)->get('/bulk-email');
    $response->assertStatus(200);

    $previewRes = $this->actingAs($this->admin)->get('/bulk-email?audience=university&preview=1');
    $previewRes->assertStatus(200);

    $logRes = $this->actingAs($this->admin)->get('/bulk-email/log');
    $logRes->assertStatus(200);
});
