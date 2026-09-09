<?php

use App\Mail\RawHtmlMail;
use App\Models\EmailLog;
use App\Models\Setting;
use App\Models\StudentDetail;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    $this->admin = User::create([
        'username' => 'admin_test_reminder_'.uniqid(),
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

test('bulk email module is blocked for non-admin staff', function () {
    $staff = User::create([
        'username' => 'bulk_email_staff_'.uniqid(),
        'full_name' => 'Non-Admin Staff',
        'password' => Hash::make('secret123'),
        'role' => 'staff',
        'is_active' => true,
    ]);

    $response = $this->actingAs($staff)->get('/bulk-email');
    $response->assertRedirect(route('dashboard'));
    $response->assertSessionHas('error');

    $logRes = $this->actingAs($staff)->get('/bulk-email/log');
    $logRes->assertRedirect(route('dashboard'));
});

test('bulk email send actually dispatches mail and logs sent status', function () {
    Mail::fake();

    Setting::set('mail_smtp_host', 'smtp.example.com', 'mail', $this->admin->id);
    Setting::set('mail_from_email', 'noreply@example.com', 'mail', $this->admin->id);

    StudentDetail::create([
        'array_space' => 'bulk_mail_test_1',
        'student_name' => 'Bulk Mail Student',
        'email' => 'student@example.com',
        'eligibility_case_no' => 'CASE-8001',
        'admission_taken_year' => '2025-26',
        'admission_taken_in' => 'BCom',
        'clg_add' => 'University of Mumbai',
    ]);

    $response = $this->actingAs($this->admin)->post('/bulk-email/send', [
        'audience' => 'student',
        'template_slug' => 'student_document_reminder',
    ]);

    $response->assertRedirect(route('bulk-email.log'));
    Mail::assertSent(RawHtmlMail::class, function ($mail) {
        return $mail->hasTo('student@example.com');
    });

    $log = EmailLog::where('recipient_email', 'student@example.com')->first();
    expect($log)->not->toBeNull();
    expect($log->status)->toBe('sent');
    expect($log->subject)->toContain('CASE-8001');
});

test('bulk email send is blocked when the feature toggle is off', function () {
    Mail::fake();
    Setting::set('feature_bulk_email_enabled', '0', 'feature', $this->admin->id);
    Setting::set('mail_smtp_host', 'smtp.example.com', 'mail', $this->admin->id);
    Setting::set('mail_from_email', 'noreply@example.com', 'mail', $this->admin->id);

    StudentDetail::create([
        'array_space' => 'bulk_mail_test_2',
        'student_name' => 'Toggle Off Student',
        'email' => 'toggle@example.com',
        'eligibility_case_no' => 'CASE-8002',
        'admission_taken_year' => '2025-26',
        'admission_taken_in' => 'BCom',
        'clg_add' => 'University of Mumbai',
    ]);

    $this->actingAs($this->admin)->post('/bulk-email/send', [
        'audience' => 'student',
        'template_slug' => 'student_document_reminder',
    ]);

    Mail::assertNothingSent();
});

test('retrying a failed email re-sends and flips status to sent', function () {
    Mail::fake();
    Setting::set('mail_smtp_host', 'smtp.example.com', 'mail', $this->admin->id);
    Setting::set('mail_from_email', 'noreply@example.com', 'mail', $this->admin->id);

    $log = EmailLog::create([
        'batch_ref' => 'test_batch',
        'template_slug' => 'student_document_reminder',
        'recipient_type' => 'student',
        'recipient_name' => 'Retry Student',
        'recipient_email' => 'retry@example.com',
        'subject' => 'Old subject',
        'status' => 'failed',
        'error_message' => 'Connection timed out',
        'attempts' => 1,
        'sent_by' => 'admin',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->admin)->post("/bulk-email/retry/{$log->id}");

    $response->assertRedirect();
    Mail::assertSent(RawHtmlMail::class, fn ($mail) => $mail->hasTo('retry@example.com'));

    $log->refresh();
    expect($log->status)->toBe('sent');
    expect($log->error_message)->toBeNull();
    expect($log->attempts)->toBe(2);
});
