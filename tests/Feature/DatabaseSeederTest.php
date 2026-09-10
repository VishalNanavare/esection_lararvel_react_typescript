<?php

use App\Models\AcademicYear;
use App\Models\AccessPage;
use App\Models\CollegeDetail;
use App\Models\ConfStudData;
use App\Models\Course;
use App\Models\Regularization;
use App\Models\Setting;
use App\Models\StreamDetail;
use App\Models\StudentDetail;
use App\Models\StudentReminder;
use App\Models\UniversityReminderBatch;
use App\Models\User;
use App\Models\UserPageAccess;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Hash;

test('database seeder runs cleanly and populates reference and demo data', function () {
    $this->seed(DatabaseSeeder::class);

    $admin = User::where('username', 'admin')->first();
    expect($admin)->not->toBeNull();
    expect($admin->role)->toBe('admin');
    expect(Hash::check('qwerty@123', $admin->password))->toBeTrue();

    expect(User::where('role', 'staff')->count())->toBe(6);

    expect(AccessPage::count())->toBeGreaterThan(0);
    expect(UserPageAccess::count())->toBeGreaterThan(0);

    expect(AcademicYear::where('year_label', '2025-26')->where('is_current', true)->exists())->toBeTrue();
    expect(Course::count())->toBeGreaterThan(0);
    expect(StreamDetail::count())->toBeGreaterThan(0);
    expect(CollegeDetail::count())->toBeGreaterThan(0);

    expect(Setting::get('institute_name'))->not->toBeEmpty();
    expect(Setting::get('feature_delete_enabled'))->toBe('1');
    // A real seed must never ship SMTP credentials.
    expect(Setting::get('mail_smtp_password'))->toBeNull();

    expect(StudentDetail::count())->toBeGreaterThanOrEqual(5);
    expect(ConfStudData::count())->toBeGreaterThanOrEqual(2);
    expect(Regularization::count())->toBeGreaterThanOrEqual(1);
    expect(StudentReminder::count())->toBeGreaterThanOrEqual(1);
    expect(UniversityReminderBatch::count())->toBeGreaterThanOrEqual(1);
});

test('database seeder is safe to run twice without duplicating or erroring', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    expect(User::where('username', 'admin')->count())->toBe(1);
    expect(CollegeDetail::count())->toBe(5);
    expect(AcademicYear::count())->toBe(3);
});
