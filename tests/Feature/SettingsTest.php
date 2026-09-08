<?php

use App\Models\AcademicYear;
use App\Models\AccessPage;
use App\Models\Course;
use App\Models\Setting;
use App\Models\StreamDetail;
use App\Models\User;
use App\Models\UserPageAccess;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->admin = User::create([
        'username' => 'admin_settings_user',
        'full_name' => 'System Administrator',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
});

test('guests are redirected from settings to login', function () {
    $this->get('/settings')->assertRedirect('/login');
    $this->get('/settings/institute')->assertRedirect('/login');
    $this->get('/settings/users')->assertRedirect('/login');
});

test('admin can view settings hub and institute details', function () {
    $this->actingAs($this->admin)->get('/settings')->assertOk();

    $res = $this->actingAs($this->admin)->get('/settings/institute');
    $res->assertOk();
    $res->assertInertia(fn ($page) => $page->component('Settings/Institute'));
});

test('admin can update institute details', function () {
    $response = $this->actingAs($this->admin)->post('/settings/institute', [
        'institute_name' => 'IDOL University of Mumbai Test',
        'institute_university_title' => 'UNIVERSITY OF MUMBAI',
        'institute_address' => 'Vidyanagari, Santacruz East, Mumbai',
        'institute_contact' => 'test@idol.mu.ac.in',
        'institute_signatory_name' => 'Prof. S. Patil',
        'institute_signatory_designation' => 'Deputy Registrar',
        'institute_signature_space_lines' => 4,
    ]);

    $response->assertRedirect();
    expect(Setting::get('institute_name'))->toBe('IDOL University of Mumbai Test');
    expect(Setting::get('institute_signatory_designation'))->toBe('Deputy Registrar');
});

test('admin can upload valid letterhead and logo', function () {
    $letterhead = \Illuminate\Http\UploadedFile::fake()->image('header.png', 1486, 368);
    $logo = \Illuminate\Http\UploadedFile::fake()->image('seal.png', 300, 300);

    $response = $this->actingAs($this->admin)->post('/settings/institute', [
        'institute_name' => 'IDOL University of Mumbai',
        'institute_signatory_designation' => 'Director',
        'letterhead' => $letterhead,
        'logo' => $logo,
    ]);

    $response->assertRedirect();
    $letterheadPath = Setting::get('institute_letterhead_path');
    $logoPath = Setting::get('institute_logo_path');

    expect($letterheadPath)->not->toBeNull();
    expect($logoPath)->not->toBeNull();
    expect(file_exists(public_path($letterheadPath)))->toBeTrue();
    expect(file_exists(public_path($logoPath)))->toBeTrue();

    // Clean up uploaded test files
    @unlink(public_path($letterheadPath));
    @unlink(public_path($logoPath));
});

test('letterhead with invalid dimensions is rejected', function () {
    $badLetterhead = \Illuminate\Http\UploadedFile::fake()->image('bad.png', 800, 600);

    $response = $this->actingAs($this->admin)->post('/settings/institute', [
        'institute_name' => 'IDOL University of Mumbai',
        'letterhead' => $badLetterhead,
    ]);

    $response->assertSessionHasErrors('letterhead');
});

test('admin can update feature toggles', function () {
    $response = $this->actingAs($this->admin)->post('/settings/features', [
        'feature_export_enabled' => true,
        'feature_bulk_email_enabled' => false,
        'feature_delete_enabled' => true,
        'feature_import_enabled' => true,
    ]);

    $response->assertRedirect();
    expect(Setting::get('feature_export_enabled'))->toBe('1');
    expect(Setting::get('feature_bulk_email_enabled'))->toBe('0');
    expect(Setting::get('feature_import_enabled'))->toBe('1');
});

test('admin can create, activate and delete academic years', function () {
    $this->actingAs($this->admin)->post('/settings/academic-years', [
        'year_label' => '2029-2030',
    ])->assertRedirect();

    $year = AcademicYear::where('year_label', '2029-2030')->first();
    expect($year)->not->toBeNull();

    $this->actingAs($this->admin)->post("/settings/academic-years/{$year->id}/activate")->assertRedirect();
    $year->refresh();
    expect($year->is_current)->toBeTrue();

    $this->actingAs($this->admin)->delete("/settings/academic-years/{$year->id}")->assertRedirect();
    $this->assertDatabaseMissing('academic_years', ['id' => $year->id]);
});

test('admin can manage courses and stream divisions', function () {
    $this->actingAs($this->admin)->post('/settings/courses', [
        'name' => 'Master of Science (Data Science)',
    ])->assertRedirect();

    $course = Course::where('name', 'Master of Science (Data Science)')->first();
    expect($course)->not->toBeNull();

    $this->actingAs($this->admin)->post('/settings/streams', [
        'Division' => 'M.Sc. Data Science Part-I',
        'course_name' => $course->name,
    ])->assertRedirect();

    $stream = StreamDetail::where('Division', 'M.Sc. Data Science Part-I')->first();
    expect($stream)->not->toBeNull();

    $this->actingAs($this->admin)->delete("/settings/streams/{$stream->id}")->assertRedirect();
    $this->actingAs($this->admin)->delete("/settings/courses/{$course->id}")->assertRedirect();
});

test('admin can manage staff user accounts', function () {
    $this->actingAs($this->admin)->post('/settings/users', [
        'username' => 'operator_alpha',
        'full_name' => 'Alpha Operator',
        'role' => 'staff',
        'password' => 'secret123',
    ])->assertRedirect();

    $user = User::where('username', 'operator_alpha')->first();
    expect($user)->not->toBeNull();

    // Update
    $this->actingAs($this->admin)->put("/settings/users/{$user->id}", [
        'full_name' => 'Alpha Operator Updated',
        'role' => 'staff',
    ])->assertRedirect();

    $user->refresh();
    expect($user->full_name)->toBe('Alpha Operator Updated');

    // Toggle active status
    $this->actingAs($this->admin)->post("/settings/users/{$user->id}/toggle")->assertRedirect();
    $user->refresh();
    expect($user->is_active)->toBeFalse();
});

test('admin can update document numbering prefix', function () {
    $this->actingAs($this->admin)->post('/settings/numbering', [
        'case_no_prefix' => 'IDOL-ELIG',
    ])->assertRedirect();

    expect(Setting::get('case_no_prefix'))->toBe('IDOL-ELIG');
});

test('admin can manage access rights matrix', function () {
    $staff = User::create([
        'username' => 'staff_matrix_test',
        'full_name' => 'Matrix Test',
        'role' => 'staff',
        'password' => Hash::make('secret123'),
        'is_active' => true,
    ]);

    $this->actingAs($this->admin)->post('/settings/access-rights', [
        'matrix' => [
            $staff->id => ['students.new'],
        ],
    ])->assertRedirect();

    $this->assertDatabaseHas('user_page_access', [
        'user_id' => $staff->id,
        'page_key' => 'students.new',
    ]);
});

test('admin can view activity audit log', function () {
    $this->actingAs($this->admin)->get('/settings/activity-log')->assertOk();
});
