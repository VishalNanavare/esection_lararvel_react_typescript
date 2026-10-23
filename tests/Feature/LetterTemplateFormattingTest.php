<?php

use App\Http\Controllers\PdfController;
use App\Http\Controllers\SettingsController;
use App\Models\Setting;
use App\Models\User;

use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->user = User::create([
        'username' => 'test_admin_user',
        'full_name' => 'Admin User',
        'password' => Hash::make('password123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
});

test('formatTemplateText preserves b, i, u, br tags and strips script tags', function () {
    $input = "Hello <b>World</b>, <i>Italic</i>, <u>Underline</u>!<script>alert('bad')</script>";
    $output = SettingsController::formatTemplateText($input);

    expect($output)->toContain('<b>World</b>')
        ->toContain('<i>Italic</i>')
        ->toContain('<u>Underline</u>')
        ->not->toContain('<script>')
        ->not->toContain('alert');
});

test('formatTemplateText converts leading spaces and multiple spaces to non-breaking spaces for PDF indentation', function () {
    $input = "Sir/Madam,\n        University of Mumbai has decided to verify in <b>Institue or Distance and Open Learning</b>.\n       The following student/s";
    $output = SettingsController::formatTemplateText($input);

    expect($output)->toContain('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;University of Mumbai')
        ->toContain('<b>Institue or Distance and Open Learning</b>')
        ->toContain('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The following student/s');
});

test('renderLetterTemplate returns bold tags and preserved indentations', function () {
    $text = "Sir/Madam,\n        University of Mumbai has decided to verify in <b>Institue or Distance and Open Learning</b> for {course}.";
    Setting::set('letter_dispatch_body', $text, 'letter_templates', $this->user->id);

    $pdfCtrl = app(PdfController::class);
    $rendered = $pdfCtrl->renderLetterTemplate('dispatch', ['course' => 'MCom Part-I', 'academic_year' => '2025-26']);

    expect($rendered['body'])->toContain('<b>Institue or Distance and Open Learning</b>')
        ->toContain('&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;University of Mumbai')
        ->toContain('<strong>MCom Part-I</strong>');
});

test('preview letter template endpoint accepts formatted body and returns PDF', function () {
    $response = $this->actingAs($this->user)->post('/settings/letter-templates/dispatch/preview', [
        'subject' => 'Verification Letter',
        'body' => "Sir/Madam,\n        University of Mumbai has decided to verify in <b>Institue or Distance and Open Learning</b>.",
        'closing' => 'Thanking you.',
    ]);

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain('application/pdf');
});
