# E-Section Parity Fixes — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the four highest-leverage, most mechanical gaps found by the esection_laravel vs esection_ci4 parity audit: wire the already-built RBAC middleware to every route, fix a crash bug and two data-mismatch bugs in Confirmations/Reminders, and enforce the `feature_delete_enabled` toggle server-side on every hard-delete action.

**Architecture:** No new subsystems. Every task edits existing routes/controllers/models/React pages in place, following the app's existing Inertia + Eloquent conventions. Task 1 is route-file-only. Tasks 2–4 are small, targeted controller/model/frontend edits.

**Tech Stack:** Laravel 12 (PHP 8.5), Inertia.js + React + TypeScript, Pest for tests.

**Spec:** The parity audit report published at https://claude.ai/code/artifact/d157f443-bda9-4641-adf0-6923a00d1170 (root causes RC-1, and the standalone Critical findings for Reminders/Confirmations/feature-toggle enforcement). Local copies of the source findings live in `/private/tmp/claude-501/-opt-homebrew-var-www-esection/078a3807-d47a-4955-98b6-276b39a92380/scratchpad/findings-*.md`.

## Global Constraints

- Follow existing code conventions (check sibling files before writing new code) — per `AGENTS.md`/`CLAUDE.md` in this repo.
- Run `vendor/bin/pint --dirty --format agent` on every task before committing.
- Every task must leave `php artisan test --compact` fully green (55 baseline tests + whatever this plan adds).
- Do not change application dependencies.
- Do not create documentation files beyond this plan.
- All test users in the existing suite use `role: 'admin'`, which bypasses both `CheckAdminRole` and `CheckPageAccess` (see `app/Models/User.php:51-72`) — so Task 1's middleware changes must not break any existing test, only add new denial-path tests for non-admin/no-permission users.
- The Settings permission catalog (`SettingsController::getPermissionGroups()`, `app/Http/Controllers/SettingsController.php:419-495`) is the authoritative list of permission keys: `students.{view,create,edit,delete,import,export,print}`, `universities.{view,create,edit,toggle,export}`, `confirmations.{view,create,delete,export,print}`, `regularization.{view,create,edit,delete,export,print}`, `reminders_university.{view,create,export,print}`, `reminders_student.{view,create,delete,export,print}`. Use these exact strings — do not invent new ones.

---

### Task 1: Wire RBAC middleware to every route

**Files:**
- Modify: `routes/web.php` (entire authenticated route group, lines 23–191)
- Test: `tests/Feature/AccessControlTest.php` (new)

**Interfaces:**
- Consumes: `App\Http\Middleware\CheckAdminRole` (alias `admin`) and `App\Http\Middleware\CheckPageAccess` (alias `access:<key>,<key>...`), both already registered in `bootstrap/app.php:22-25`. Consumes `User::isAdmin()` and `User::hasAnyPermission(array $keys)`, both already implemented in `app/Models/User.php`.
- Produces: nothing new — this task only adds middleware to existing routes. No signature changes.

- [ ] **Step 1: Replace `routes/web.php` with the fully middleware-wired version**

Replace the entire file with this content (every route keeps its existing name/controller/method — only `->middleware(...)` is added, and the Settings block is wrapped in an `admin` group):

```php
<?php

use App\Http\Controllers\ApiController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Guest Authentication Routes
|--------------------------------------------------------------------------
*/
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
});

/*
|--------------------------------------------------------------------------
| Authenticated Application Routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::post('/change-password', [AuthController::class, 'changePassword'])->name('password.change');

    Route::get('/', function () {
        return redirect()->route('dashboard');
    });

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    /*
    |--------------------------------------------------------------------------
    | Student Verification & Batch Entry
    |--------------------------------------------------------------------------
    */
    Route::get('/students/new', [\App\Http\Controllers\StudentController::class, 'newForm'])->name('students.new')->middleware('access:students.view');
    Route::post('/students/batch', [\App\Http\Controllers\StudentController::class, 'storeBatch'])->name('students.batch.store')->middleware('access:students.create');
    Route::get('/students/history', [\App\Http\Controllers\StudentController::class, 'history'])->name('students.history')->middleware('access:students.view');
    Route::get('/students/history/export', [\App\Http\Controllers\StudentController::class, 'exportHistory'])->name('students.history.export')->middleware('access:students.export');
    Route::get('/students/batches/{arraySpace}', [\App\Http\Controllers\StudentController::class, 'batchDetail'])->name('students.batch.detail')->middleware('access:students.view');
    Route::get('/students/batch/{arraySpace}', [\App\Http\Controllers\StudentController::class, 'batchDetail'])->middleware('access:students.view');
    Route::put('/students/{id}', [\App\Http\Controllers\StudentController::class, 'update'])->name('students.update')->middleware('access:students.edit');
    Route::delete('/students/{id}', [\App\Http\Controllers\StudentController::class, 'destroy'])->name('students.destroy')->middleware('access:students.delete');
    Route::get('/students/import', [\App\Http\Controllers\StudentController::class, 'importForm'])->name('students.import')->middleware('access:students.import');
    Route::post('/students/read-candidate-sheet', [\App\Http\Controllers\StudentController::class, 'readCandidateSheet'])->name('students.read.sheet')->middleware('access:students.import');
    Route::post('/students/new/readSheet', [\App\Http\Controllers\StudentController::class, 'readCandidateSheet'])->middleware('access:students.import');

    /*
    |--------------------------------------------------------------------------
    | Demand Draft (DD) Confirmations
    |--------------------------------------------------------------------------
    */
    Route::get('/confirmations', [\App\Http\Controllers\ConfirmationController::class, 'index'])->name('confirmations.index')->middleware('access:confirmations.view');
    Route::post('/confirmations/store', [\App\Http\Controllers\ConfirmationController::class, 'store'])->name('confirmations.store')->middleware('access:confirmations.create');
    Route::get('/confirmations/history', [\App\Http\Controllers\ConfirmationController::class, 'history'])->name('confirmations.history')->middleware('access:confirmations.view');
    Route::get('/confirmations/export', [\App\Http\Controllers\ConfirmationController::class, 'export'])->name('confirmations.export')->middleware('access:confirmations.export');
    Route::get('/confirmations/batches/{arraySpace}', [\App\Http\Controllers\ConfirmationController::class, 'batchDetail'])->name('confirmations.batch.detail')->middleware('access:confirmations.view');
    Route::delete('/confirmations/{id}', [\App\Http\Controllers\ConfirmationController::class, 'destroy'])->name('confirmations.destroy')->middleware('access:confirmations.delete');

    /*
    |--------------------------------------------------------------------------
    | University Master Directory
    |--------------------------------------------------------------------------
    */
    Route::get('/universities', [\App\Http\Controllers\UniversityController::class, 'index'])->name('universities.index')->middleware('access:universities.view');
    Route::post('/universities', [\App\Http\Controllers\UniversityController::class, 'store'])->name('universities.store')->middleware('access:universities.create');
    Route::put('/universities/{id}', [\App\Http\Controllers\UniversityController::class, 'update'])->name('universities.update')->middleware('access:universities.edit');
    Route::post('/universities/{id}/toggle', [\App\Http\Controllers\UniversityController::class, 'toggleActive'])->name('universities.toggle')->middleware('access:universities.toggle');
    Route::get('/universities/export', [\App\Http\Controllers\UniversityController::class, 'export'])->name('universities.export')->middleware('access:universities.export');

    /*
    |--------------------------------------------------------------------------
    | Student Eligibility Regularization
    |--------------------------------------------------------------------------
    */
    Route::get('/regularization', [\App\Http\Controllers\RegularizationController::class, 'index'])->name('regularization.index')->middleware('access:regularization.view');
    Route::post('/regularization', [\App\Http\Controllers\RegularizationController::class, 'store'])->name('regularization.store')->middleware('access:regularization.create');
    Route::get('/regularization/history', [\App\Http\Controllers\RegularizationController::class, 'history'])->name('regularization.history')->middleware('access:regularization.view');
    Route::get('/regularization/export', [\App\Http\Controllers\RegularizationController::class, 'export'])->name('regularization.export')->middleware('access:regularization.export');
    Route::put('/regularization/{id}', [\App\Http\Controllers\RegularizationController::class, 'update'])->name('regularization.update')->middleware('access:regularization.edit');
    Route::delete('/regularization/{id}', [\App\Http\Controllers\RegularizationController::class, 'destroy'])->name('regularization.destroy')->middleware('access:regularization.delete');
    Route::post('/regularization/generateLetter', [\App\Http\Controllers\RegularizationController::class, 'store'])->middleware('access:regularization.create');

    /*
    |--------------------------------------------------------------------------
    | Marksheet & Candidate Reminders
    |--------------------------------------------------------------------------
    */
    Route::redirect('/reminders', '/reminders/university');
    Route::get('/reminders/university', [\App\Http\Controllers\ReminderController::class, 'universityIndex'])->name('reminders.university')->middleware('access:reminders_university.view');
    Route::post('/reminders/university', [\App\Http\Controllers\ReminderController::class, 'storeUniversityReminder'])->name('reminders.university.store')->middleware('access:reminders_university.create');
    Route::post('/reminders/generateUniversityReminder', [\App\Http\Controllers\ReminderController::class, 'storeUniversityReminder'])->middleware('access:reminders_university.create');
    Route::get('/reminders/university/export', [\App\Http\Controllers\ReminderController::class, 'universityExport'])->name('reminders.university.export')->middleware('access:reminders_university.export');
    Route::get('/reminders/university/history', [\App\Http\Controllers\ReminderController::class, 'universityHistory'])->name('reminders.university.history')->middleware('access:reminders_university.view');
    Route::get('/reminders/university/history/export', [\App\Http\Controllers\ReminderController::class, 'universityHistoryExport'])->name('reminders.university.history.export')->middleware('access:reminders_university.export');
    Route::get('/reminders/university/batches/{batchId}', [\App\Http\Controllers\ReminderController::class, 'universityBatchDetail'])->name('reminders.university.batch.detail')->middleware('access:reminders_university.view');
    Route::get('/reminders/student', [\App\Http\Controllers\ReminderController::class, 'studentIndex'])->name('reminders.student')->middleware('access:reminders_student.view');
    Route::post('/reminders/student', [\App\Http\Controllers\ReminderController::class, 'storeStudentReminder'])->name('reminders.student.store')->middleware('access:reminders_student.create');
    Route::post('/reminders/generateStudentReminder', [\App\Http\Controllers\ReminderController::class, 'storeStudentReminder'])->middleware('access:reminders_student.create');
    Route::get('/reminders/student/history', [\App\Http\Controllers\ReminderController::class, 'studentHistory'])->name('reminders.student.history')->middleware('access:reminders_student.view');
    Route::get('/reminders/student/export', [\App\Http\Controllers\ReminderController::class, 'studentExport'])->name('reminders.student.export')->middleware('access:reminders_student.export');
    Route::delete('/reminders/student/{id}', [\App\Http\Controllers\ReminderController::class, 'studentDestroy'])->name('reminders.student.destroy')->middleware('access:reminders_student.delete');

    /*
    |--------------------------------------------------------------------------
    | Bulk Email Dispatch & Send Logs
    |--------------------------------------------------------------------------
    */
    Route::get('/bulk-email', [\App\Http\Controllers\BulkEmailController::class, 'index'])->name('bulk-email.index');
    Route::post('/bulk-email/send', [\App\Http\Controllers\BulkEmailController::class, 'send'])->name('bulk-email.send');
    Route::get('/bulk-email/log', [\App\Http\Controllers\BulkEmailController::class, 'log'])->name('bulk-email.log');
    Route::post('/bulk-email/retry/{id}', [\App\Http\Controllers\BulkEmailController::class, 'retry'])->name('bulk-email.retry');
    Route::post('/bulk-email/retry-all', [\App\Http\Controllers\BulkEmailController::class, 'retryAll'])->name('bulk-email.retry-all');

    /*
    |--------------------------------------------------------------------------
    | Official PDF Document Generation Engine
    |--------------------------------------------------------------------------
    */
    Route::get('/pdf/dispatch/{arraySpace}', [\App\Http\Controllers\PdfController::class, 'dispatch'])->name('pdf.dispatch')->middleware('access:students.print');
    Route::get('/pdf/accounts/{arraySpace}', [\App\Http\Controllers\PdfController::class, 'accounts'])->name('pdf.accounts')->middleware('access:students.print');
    Route::get('/pdf/dispatchAccounts/{arraySpace}', [\App\Http\Controllers\PdfController::class, 'accounts'])->middleware('access:students.print');
    Route::get('/pdf/confirmation/{arraySpace}', [\App\Http\Controllers\PdfController::class, 'confirmation'])->name('pdf.confirmation')->middleware('access:confirmations.print');
    Route::get('/pdf/regularization/{id}', [\App\Http\Controllers\PdfController::class, 'regularization'])->name('pdf.regularization')->middleware('access:regularization.print');
    Route::get('/pdf/reminders/university/{batchId}', [\App\Http\Controllers\PdfController::class, 'universityReminder'])->name('pdf.reminder.university')->middleware('access:reminders_university.print');
    Route::get('/pdf/reminders/student/{id}', [\App\Http\Controllers\PdfController::class, 'studentReminder'])->name('pdf.reminder.student')->middleware('access:reminders_student.print');

    /*
    |--------------------------------------------------------------------------
    | System Settings & Administration
    |--------------------------------------------------------------------------
    */
    Route::middleware('admin')->group(function () {
        Route::get('/settings', [\App\Http\Controllers\SettingsController::class, 'index'])->name('settings.index');
        Route::get('/settings/institute', [\App\Http\Controllers\SettingsController::class, 'institute'])->name('settings.institute');
        Route::post('/settings/institute', [\App\Http\Controllers\SettingsController::class, 'updateInstitute'])->name('settings.institute.update');
        Route::get('/settings/features', [\App\Http\Controllers\SettingsController::class, 'features'])->name('settings.features');
        Route::post('/settings/features', [\App\Http\Controllers\SettingsController::class, 'updateFeatures'])->name('settings.features.update');
        Route::get('/settings/academic-years', [\App\Http\Controllers\SettingsController::class, 'academicYears'])->name('settings.academic-years');
        Route::post('/settings/academic-years', [\App\Http\Controllers\SettingsController::class, 'storeAcademicYear'])->name('settings.academic-years.store');
        Route::put('/settings/academic-years/{id}', [\App\Http\Controllers\SettingsController::class, 'updateAcademicYear'])->name('settings.academic-years.update');
        Route::post('/settings/academic-years/{id}/activate', [\App\Http\Controllers\SettingsController::class, 'setActiveAcademicYear'])->name('settings.academic-years.activate');
        Route::delete('/settings/academic-years/{id}', [\App\Http\Controllers\SettingsController::class, 'destroyAcademicYear'])->name('settings.academic-years.destroy');
        Route::get('/settings/courses', [\App\Http\Controllers\SettingsController::class, 'courses'])->name('settings.courses');
        Route::post('/settings/courses', [\App\Http\Controllers\SettingsController::class, 'storeCourse'])->name('settings.courses.store');
        Route::put('/settings/courses/{id}', [\App\Http\Controllers\SettingsController::class, 'updateCourse'])->name('settings.courses.update');
        Route::post('/settings/courses/{id}/toggle', [\App\Http\Controllers\SettingsController::class, 'toggleCourse'])->name('settings.courses.toggle');
        Route::delete('/settings/courses/{id}', [\App\Http\Controllers\SettingsController::class, 'destroyCourse'])->name('settings.courses.destroy');
        Route::post('/settings/streams', [\App\Http\Controllers\SettingsController::class, 'storeStream'])->name('settings.streams.store');
        Route::delete('/settings/streams/{id}', [\App\Http\Controllers\SettingsController::class, 'destroyStream'])->name('settings.streams.destroy');
        Route::get('/settings/numbering', [\App\Http\Controllers\SettingsController::class, 'numbering'])->name('settings.numbering');
        Route::post('/settings/numbering', [\App\Http\Controllers\SettingsController::class, 'updateNumbering'])->name('settings.numbering.update');
        Route::get('/settings/users', [\App\Http\Controllers\SettingsController::class, 'users'])->name('settings.users');
        Route::post('/settings/users', [\App\Http\Controllers\SettingsController::class, 'storeUser'])->name('settings.users.store');
        Route::put('/settings/users/{id}', [\App\Http\Controllers\SettingsController::class, 'updateUser'])->name('settings.users.update');
        Route::post('/settings/users/{id}/toggle', [\App\Http\Controllers\SettingsController::class, 'toggleUser'])->name('settings.users.toggle');
        Route::get('/settings/access-rights', [\App\Http\Controllers\SettingsController::class, 'accessRights'])->name('settings.access-rights');
        Route::post('/settings/access-rights', [\App\Http\Controllers\SettingsController::class, 'updateAccessRights'])->name('settings.access-rights.update');
        Route::get('/settings/letter-templates', [\App\Http\Controllers\SettingsController::class, 'letterTemplates'])->name('settings.letter-templates');
        Route::post('/settings/letter-templates/footer', [\App\Http\Controllers\SettingsController::class, 'updateLetterFooter'])->name('settings.letter-templates.footer');
        Route::post('/settings/letter-templates/{slug}', [\App\Http\Controllers\SettingsController::class, 'updateLetterTemplate'])->name('settings.letter-templates.update');
        Route::get('/settings/backup', [\App\Http\Controllers\SettingsController::class, 'backup'])->name('settings.backup');
        Route::post('/settings/backup/sql', [\App\Http\Controllers\SettingsController::class, 'runBackupSql'])->name('settings.backup.sql');
        Route::post('/settings/backup/excel', [\App\Http\Controllers\SettingsController::class, 'runBackupExcel'])->name('settings.backup.excel');
        Route::post('/settings/backup/password', [\App\Http\Controllers\SettingsController::class, 'updateBackupPassword'])->name('settings.backup.password');
        Route::post('/settings/backup/retention', [\App\Http\Controllers\SettingsController::class, 'updateBackupRetention'])->name('settings.backup.retention');
        Route::get('/settings/mail', [\App\Http\Controllers\SettingsController::class, 'mail'])->name('settings.mail');
        Route::post('/settings/mail', [\App\Http\Controllers\SettingsController::class, 'updateMail'])->name('settings.mail.update');
        Route::post('/settings/mail/test', [\App\Http\Controllers\SettingsController::class, 'testMail'])->name('settings.mail.test');
        Route::post('/settings/mail/templates/{slug}', [\App\Http\Controllers\SettingsController::class, 'updateEmailTemplate'])->name('settings.mail.template.update');
        Route::get('/settings/activity-log', [\App\Http\Controllers\SettingsController::class, 'activityLog'])->name('settings.activity-log');
    });

    /*
    |--------------------------------------------------------------------------
    | Internal AJAX API Endpoints
    |--------------------------------------------------------------------------
    */
    Route::prefix('api')->group(function () {
        Route::get('/colleges', [ApiController::class, 'colleges'])->name('api.colleges');
        Route::get('/colleges/{id}', [ApiController::class, 'collegeDetail'])->name('api.college.detail');
        Route::get('/states', [ApiController::class, 'states'])->name('api.states');
        Route::get('/streams', [ApiController::class, 'streams'])->name('api.streams');
        Route::get('/academic-years', [ApiController::class, 'academicYears'])->name('api.years');
        Route::get('/batch-filter-options/{field}', [ApiController::class, 'batchFilterOptions'])->name('api.filter.options');
        Route::get('/batch-years', fn () => app(ApiController::class)->batchFilterOptions('year'));
        Route::get('/batch-universities', fn () => app(ApiController::class)->batchFilterOptions('university'));
        Route::get('/batch-courses', fn () => app(ApiController::class)->batchFilterOptions('course'));
        Route::get('/students/next-case-no', [ApiController::class, 'nextCaseNo'])->name('api.next.case.no');
    });
});
```

Note: Bulk Email routes are intentionally left unchanged — the permission catalog has no `bulk_email.*` keys (CI4 gates that module by feature toggle, not per-action permission), so adding `access:` middleware there would invent a permission key that doesn't exist anywhere else in the app.

- [ ] **Step 2: Write the failing tests first**

Create `tests/Feature/AccessControlTest.php`:

```php
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
```

- [ ] **Step 3: Run the new tests to verify they fail against the old routes file**

Run: `php artisan test --compact --filter=AccessControlTest`
Expected: FAIL — the "no permissions" and "settings blocked" tests currently get 200 instead of a redirect, because no middleware is applied yet.

- [ ] **Step 4: Apply the Step 1 routes/web.php replacement**

- [ ] **Step 5: Run the new tests to verify they pass**

Run: `php artisan test --compact --filter=AccessControlTest`
Expected: PASS — 4/4 tests green.

- [ ] **Step 6: Run the full suite to confirm no regressions**

Run: `php artisan test --compact`
Expected: PASS — all 55 pre-existing tests plus the 4 new ones (59 total), 0 failures. (Every existing test user has `role: 'admin'`, which bypasses both middlewares per `User::isAdmin()`.)

- [ ] **Step 7: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add routes/web.php tests/Feature/AccessControlTest.php
git commit -m "Wire access-control middleware to every authenticated route

Applies the existing CheckPageAccess/CheckAdminRole middleware (previously
registered but never attached to a route) per the permission map already
defined in SettingsController::getPermissionGroups(), and wraps the entire
Settings section in the admin-only middleware, matching esection_ci4's
accessFilter/adminFilter route groups."
```

---

### Task 2: Fix the university-reminder-history-export crash

**Files:**
- Modify: `app/Http/Controllers/ReminderController.php:329-360` (`universityHistoryExport`)
- Test: `tests/Feature/ReminderTest.php` (add a test)

**Interfaces:**
- Consumes: `App\Models\UniversityReminderBatch` (existing model, `app/Models/UniversityReminderBatch.php`), its `notes()` relation (`HasMany<UniversityReminderNote>`).
- Produces: nothing new for other tasks.

**Root cause:** `UniversityReminderBatch::withCount('students')` calls a relation that does not exist on the model (only `notes()` does) — every hit on this export throws `BadMethodCallException`. The intended count is the number of distinct candidates the batch has ever had a reminder note logged for.

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/ReminderTest.php` (inside the existing test file, following its established `User::create([..., 'role' => 'admin', ...])` + `actingAs` pattern already used there):

```php
test('university reminder history export does not crash and reports distinct candidate counts', function () {
    $batch = \App\Models\UniversityReminderBatch::create([
        'academic_year' => '2025-26',
        'university_name' => 'University of Mumbai',
        'admission_taken_in' => 'BA',
        'head_name' => 'The Controller of Examinations',
        'created_by' => 'esection1',
    ]);

    // Two notes for the same student (a 1st and 2nd reminder) plus one for a different student.
    \App\Models\UniversityReminderNote::create([
        'batch_id' => $batch->id, 'student_id' => 1, 'note_text' => '1st Reminder',
        'note_date' => now()->toDateString(), 'created_by' => 'esection1', 'created_at' => now(),
    ]);
    \App\Models\UniversityReminderNote::create([
        'batch_id' => $batch->id, 'student_id' => 1, 'note_text' => '2nd Reminder',
        'note_date' => now()->toDateString(), 'created_by' => 'esection1', 'created_at' => now(),
    ]);
    \App\Models\UniversityReminderNote::create([
        'batch_id' => $batch->id, 'student_id' => 2, 'note_text' => '1st Reminder',
        'note_date' => now()->toDateString(), 'created_by' => 'esection1', 'created_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->get('/reminders/university/history/export');

    $response->assertOk();
    $csv = $response->streamedContent();
    expect($csv)->toContain('University of Mumbai');
    // 2 distinct students, not 3 notes.
    expect($csv)->toContain(",2,");
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `php artisan test --compact --filter="university reminder history export"`
Expected: FAIL with `BadMethodCallException: Call to undefined relationship [students]`.

- [ ] **Step 3: Fix the query**

In `app/Http/Controllers/ReminderController.php`, replace:

```php
        $query = UniversityReminderBatch::withCount('students');
```

with:

```php
        $query = UniversityReminderBatch::withCount(['notes as candidate_count' => function ($q) {
            $q->select(\Illuminate\Support\Facades\DB::raw('COUNT(DISTINCT student_id)'));
        }]);
```

And replace the row-building line:

```php
                    $b->students_count,
```

with:

```php
                    $b->candidate_count,
```

- [ ] **Step 4: Run the test again to verify it passes**

Run: `php artisan test --compact --filter="university reminder history export"`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `php artisan test --compact`
Expected: PASS, 0 failures.

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/ReminderController.php tests/Feature/ReminderTest.php
git commit -m "Fix crash in university reminder history export

UniversityReminderBatch::withCount('students') called a relation that
doesn't exist on the model — every export attempt threw
BadMethodCallException. Counts distinct candidates via the batch's real
notes() relation instead."
```

---

### Task 3: Fix Confirmations field-name mismatches and the pending-list export join bug

**Files:**
- Modify: `resources/js/pages/Confirmations/History.tsx`
- Modify: `resources/js/pages/Confirmations/BatchDetail.tsx`
- Modify: `app/Http/Controllers/ConfirmationController.php:301-336` (`export`)
- Test: `tests/Feature/ConfirmationTest.php` (add tests)

**Interfaces:**
- Consumes: `ConfirmationController::history()`'s existing `selectRaw` output (`array_space, uni_add, stream, en_time, en_by, dd_no, dd_amount, student_count` — unchanged), and `ConfirmationController::batchDetail()`'s raw `ConfStudData` rows (columns `uni_add`, `stream`, `en_by`, `mig_TC`, unchanged).
- Produces: nothing new for other tasks.

**Root cause:** the backend already returns the correct fields in both endpoints (verified by reading `ConfirmationController.php` directly) — the bug is entirely in the frontend TypeScript, which expects field names (`clg_name`, `course`, `en_user`, `mig_tc`) the backend never sends, so those columns silently render blank/undefined. Separately, `export()` uses an INNER JOIN, so it drops every pending (unconfirmed) student even though its button lives on the pending list.

- [ ] **Step 1: Write failing tests for the export join bug**

Add to `tests/Feature/ConfirmationTest.php` (following its existing `User::create` + `actingAs` setup pattern):

```php
test('pending list export includes students with no confirmation record yet', function () {
    $college = \App\Models\CollegeDetail::create([
        'Name' => 'University of Mumbai', 'States' => 'Maharashtra',
    ]);

    $pendingStudent = \App\Models\StudentDetail::create([
        'array_space' => 'test_pending_1',
        'student_name' => 'Pending Student',
        'admission_taken_year' => '2025-26',
        'admission_taken_in' => 'BA',
        'clg_add' => 'University of Mumbai',
        'eligibility_case_no' => 'CASE-0001',
    ]);

    $response = $this->actingAs($this->user)->get('/confirmations/export');

    $response->assertOk();
    expect($response->streamedContent())->toContain('Pending Student');
});
```

(Use the actual required columns from `database/migrations/*create_student_details_table*.php` if any of the above fields differ — check that file before writing the final field list.)

- [ ] **Step 2: Run it to confirm it fails**

Run: `php artisan test --compact --filter="pending list export includes students with no confirmation"`
Expected: FAIL — `Pending Student` is absent from the CSV because the INNER JOIN drops it.

- [ ] **Step 3: Fix the join**

In `app/Http/Controllers/ConfirmationController.php`, in `export()`, replace:

```php
        $query = StudentDetail::query()
            ->join('conf_stud_data', 'student_details.id', '=', 'conf_stud_data.student_id')
            ->select(
                'student_details.student_name',
                'student_details.student_nee_name',
                'student_details.eligibility_case_no',
                'student_details.clg_add',
                'student_details.admission_taken_year',
                'student_details.admission_taken_in',
                'conf_stud_data.mig_TC',
                'conf_stud_data.p_degree',
                'conf_stud_data.s_marks',
                'conf_stud_data.dd_no',
                'conf_stud_data.dd_amount',
                'conf_stud_data.bank_name',
                'conf_stud_data.dd_date'
            );
```

with:

```php
        $query = StudentDetail::query()
            ->leftJoin('conf_stud_data', 'student_details.id', '=', 'conf_stud_data.student_id')
            ->select(
                'student_details.student_name',
                'student_details.student_nee_name',
                'student_details.eligibility_case_no',
                'student_details.clg_add',
                'student_details.admission_taken_year',
                'student_details.admission_taken_in',
                'conf_stud_data.mig_TC',
                'conf_stud_data.p_degree',
                'conf_stud_data.s_marks',
                'conf_stud_data.dd_no',
                'conf_stud_data.dd_amount',
                'conf_stud_data.bank_name',
                'conf_stud_data.dd_date'
            );
```

(Read the surrounding 20 lines first — if a `->whereNotNull('conf_stud_data.id')` or similar filter exists further down that would re-exclude pending rows, remove it too; the pending list's own query in `index()` is the reference for "what counts as pending" and must stay a LEFT JOIN with no such filter.)

- [ ] **Step 4: Run the test again to verify it passes**

Run: `php artisan test --compact --filter="pending list export includes students with no confirmation"`
Expected: PASS.

- [ ] **Step 5: Fix the History.tsx field names**

In `resources/js/pages/Confirmations/History.tsx`, in the `ConfBatchSummary` interface, replace:

```typescript
interface ConfBatchSummary {
    array_space: string;
    clg_name: string;
    course: string;
    en_time: string;
    en_user: string;
    dd_no: string | null;
    dd_amount: string | null;
    student_count: number;
}
```

with:

```typescript
interface ConfBatchSummary {
    array_space: string;
    uni_add: string;
    stream: string;
    en_time: string;
    en_by: string;
    dd_no: string | null;
    dd_amount: string | null;
    student_count: number;
}
```

Then update every render site in the same file: `{b.clg_name}` → `{b.uni_add}`, `{b.course}` → `{b.stream}`, `{b.en_user || 'Staff'}` → `{b.en_by || 'Staff'}`.

- [ ] **Step 6: Fix the BatchDetail.tsx field names**

In `resources/js/pages/Confirmations/BatchDetail.tsx`, in the confirmation-record interface, replace:

```typescript
    course: string;
    clg_name: string;
    mig_tc: string;
```

with:

```typescript
    stream: string;
    uni_add: string;
    mig_TC: string;
```

And update `en_user: string;` to `en_by: string;` in the same interface.

Then update every render site: `firstRecord?.clg_name` → `firstRecord?.uni_add`, `firstRecord?.course` → `firstRecord?.stream`, `firstRecord?.en_user` → `firstRecord?.en_by`, `c.mig_tc === 'Yes'` → `c.mig_TC === 'Yes'`, and the `{c.mig_tc}` display → `{c.mig_TC}`.

- [ ] **Step 7: Manually verify no other `clg_name`/`course`/`en_user`/`mig_tc` references remain**

Run: `grep -n "clg_name\|en_user\|mig_tc\b" resources/js/pages/Confirmations/*.tsx`
Expected: no output (or only unrelated matches you've already checked by hand).

- [ ] **Step 8: Build the frontend and run the full test suite**

Run: `npm run build && php artisan test --compact`
Expected: build succeeds with no TypeScript errors; all tests pass, 0 failures.

- [ ] **Step 9: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add resources/js/pages/Confirmations/History.tsx resources/js/pages/Confirmations/BatchDetail.tsx app/Http/Controllers/ConfirmationController.php tests/Feature/ConfirmationTest.php
git commit -m "Fix Confirmations field-name mismatches and pending-export join

History.tsx and BatchDetail.tsx expected clg_name/course/en_user/mig_tc,
fields the backend never sends (it sends uni_add/stream/en_by/mig_TC) —
University, Program, Confirmed By, and the Migration/TC badge rendered
blank/undefined on every row. Also switches the pending-list Excel export
from an INNER JOIN to a LEFT JOIN so it stops silently excluding every
unconfirmed student."
```

---

### Task 4: Enforce `feature_delete_enabled` server-side on every hard-delete action

**Files:**
- Modify: `app/Models/Setting.php`
- Modify: `app/Http/Controllers/StudentController.php:331-349` (`destroy`)
- Modify: `app/Http/Controllers/RegularizationController.php:129-135` (`destroy`)
- Modify: `app/Http/Controllers/ReminderController.php:236-242` (`studentDestroy`)
- Modify: `app/Http/Controllers/SettingsController.php:257-263` (`destroyAcademicYear`) and `:363-367` (`destroyCourse`)
- Test: `tests/Feature/FeatureToggleEnforcementTest.php` (new)

**Interfaces:**
- Produces: `Setting::enabled(string $key, bool $default = true): bool` — a new static helper on the `Setting` model, used by all five destroy actions in this task and available for later phases.
- Consumes: nothing new.

**Root cause:** `feature_delete_enabled` (and its siblings) are shared to the frontend via `HandleInertiaRequests` so buttons can hide themselves, but no controller checks the flag before actually deleting — a direct request to any delete endpoint works even when the toggle is off. This is confirmed by grepping every controller's `destroy()`/`destroyAcademicYear()`/`destroyCourse()` method for `Setting::` — none reference it.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/FeatureToggleEnforcementTest.php`:

```php
<?php

use App\Models\Regularization;
use App\Models\Setting;
use App\Models\StudentDetail;
use App\Models\User;

beforeEach(function () {
    $this->admin = User::create([
        'username' => 'toggle_admin',
        'full_name' => 'Toggle Admin',
        'password' => bcrypt('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
});

test('deleting a student is blocked when feature_delete_enabled is off', function () {
    Setting::set('feature_delete_enabled', '0', 'feature', $this->admin->id);

    $student = StudentDetail::create([
        'array_space' => 'toggle_test_1',
        'student_name' => 'Delete Me',
        'admission_taken_year' => '2025-26',
        'admission_taken_in' => 'BA',
        'clg_add' => 'University of Mumbai',
        'eligibility_case_no' => 'CASE-0002',
    ]);

    $response = $this->actingAs($this->admin)->deleteJson(route('students.destroy', ['id' => $student->id]));

    $response->assertStatus(403);
    expect(StudentDetail::find($student->id))->not->toBeNull();
});

test('deleting a student succeeds when feature_delete_enabled is on (default)', function () {
    $student = StudentDetail::create([
        'array_space' => 'toggle_test_2',
        'student_name' => 'Delete Me Too',
        'admission_taken_year' => '2025-26',
        'admission_taken_in' => 'BA',
        'clg_add' => 'University of Mumbai',
        'eligibility_case_no' => 'CASE-0003',
    ]);

    $response = $this->actingAs($this->admin)->deleteJson(route('students.destroy', ['id' => $student->id]));

    $response->assertOk();
    expect(StudentDetail::find($student->id))->toBeNull();
});

test('deleting a regularization record is blocked when the toggle is off', function () {
    Setting::set('feature_delete_enabled', '0', 'feature', $this->admin->id);

    $record = Regularization::create([
        'student_name' => 'Reg Delete Me',
        'gender' => 'Mr.',
        'admission_letter_for' => 'The Controller of Examinations',
    ]);

    $response = $this->actingAs($this->admin)->delete(route('regularization.destroy', ['id' => $record->id]));

    $response->assertStatus(403);
    expect(Regularization::find($record->id))->not->toBeNull();
});
```

(Check `database/migrations/*create_regularizations_table*.php` and `*create_student_details_table*.php` first for any other `required`-in-practice columns your test DB needs — add them to the `create()` calls if inserts fail.)

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `php artisan test --compact --filter=FeatureToggleEnforcementTest`
Expected: the two "blocked when off" tests FAIL (records get deleted anyway, response is 200/302 not 403); the "on (default)" test already PASSES.

- [ ] **Step 3: Add the `Setting::enabled()` helper**

In `app/Models/Setting.php`, add this method inside the class, after `set()`:

```php
    public static function enabled(string $key, bool $default = true): bool
    {
        return self::get($key, $default ? '1' : '0') === '1';
    }
```

- [ ] **Step 4: Enforce the toggle in `StudentController::destroy`**

In `app/Http/Controllers/StudentController.php`, replace:

```php
    public function destroy(int $id): JsonResponse|RedirectResponse
    {
        $student = StudentDetail::findOrFail($id);
```

with:

```php
    public function destroy(int $id): JsonResponse|RedirectResponse
    {
        abort_unless(\App\Models\Setting::enabled('feature_delete_enabled'), 403, 'Deleting records is currently disabled by an administrator.');

        $student = StudentDetail::findOrFail($id);
```

- [ ] **Step 5: Enforce the toggle in `RegularizationController::destroy`**

In `app/Http/Controllers/RegularizationController.php`, replace:

```php
    public function destroy(int $id): RedirectResponse
    {
        $record = Regularization::findOrFail($id);
```

with:

```php
    public function destroy(int $id): RedirectResponse
    {
        abort_unless(\App\Models\Setting::enabled('feature_delete_enabled'), 403, 'Deleting records is currently disabled by an administrator.');

        $record = Regularization::findOrFail($id);
```

- [ ] **Step 6: Enforce the toggle in `ReminderController::studentDestroy`**

In `app/Http/Controllers/ReminderController.php`, replace:

```php
    public function studentDestroy(int $id): RedirectResponse
    {
        $record = StudentReminder::findOrFail($id);
```

with:

```php
    public function studentDestroy(int $id): RedirectResponse
    {
        abort_unless(\App\Models\Setting::enabled('feature_delete_enabled'), 403, 'Deleting records is currently disabled by an administrator.');

        $record = StudentReminder::findOrFail($id);
```

- [ ] **Step 7: Enforce the toggle in `SettingsController::destroyAcademicYear` and `destroyCourse`**

In `app/Http/Controllers/SettingsController.php`, replace:

```php
    public function destroyAcademicYear(int $id): RedirectResponse
    {
        $year = AcademicYear::findOrFail($id);
        $year->delete();

        return redirect()->back()->with('success', 'Academic Year removed.');
    }
```

with:

```php
    public function destroyAcademicYear(int $id): RedirectResponse
    {
        abort_unless(Setting::enabled('feature_delete_enabled'), 403, 'Deleting records is currently disabled by an administrator.');

        $year = AcademicYear::findOrFail($id);
        $year->delete();

        return redirect()->back()->with('success', 'Academic Year removed.');
    }
```

And replace:

```php
    public function destroyCourse(int $id): RedirectResponse
    {
        Course::findOrFail($id)->delete();
        return redirect()->back()->with('success', 'Course removed.');
    }
```

with:

```php
    public function destroyCourse(int $id): RedirectResponse
    {
        abort_unless(Setting::enabled('feature_delete_enabled'), 403, 'Deleting records is currently disabled by an administrator.');

        Course::findOrFail($id)->delete();
        return redirect()->back()->with('success', 'Course removed.');
    }
```

(`SettingsController.php` already has `use App\Models\Setting;` at the top — check before adding a duplicate import.)

- [ ] **Step 8: Run the tests again to verify they pass**

Run: `php artisan test --compact --filter=FeatureToggleEnforcementTest`
Expected: PASS, 3/3.

- [ ] **Step 9: Run the full suite**

Run: `php artisan test --compact`
Expected: PASS, 0 failures. (If any pre-existing delete test now unexpectedly 403s, it means that test's `beforeEach` never seeds `feature_delete_enabled` — since `Setting::get()` defaults to `'1'` when no row exists, this should not happen; investigate rather than weakening the new check if it does.)

- [ ] **Step 10: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Models/Setting.php app/Http/Controllers/StudentController.php app/Http/Controllers/RegularizationController.php app/Http/Controllers/ReminderController.php app/Http/Controllers/SettingsController.php tests/Feature/FeatureToggleEnforcementTest.php
git commit -m "Enforce feature_delete_enabled server-side on every hard-delete

The toggle was shared to the frontend to hide buttons but never checked
by any controller — a direct request to a delete endpoint worked
regardless of the setting. Adds a Setting::enabled() helper and guards
Students, Regularization, Candidate Reminders, Academic Year, and Course
deletes with it, matching esection_ci4's feature_enabled() checks."
```

---

## Self-Review Notes

- **Spec coverage:** this plan covers RC-1 (Task 1) in full for every route with a defined permission key; the Reminders crash bug (Task 2); the Confirmations field-mismatch + export-join bugs (Task 3); and the feature-toggle-enforcement root cause (Task 3 of the audit's RC-3), scoped to the four delete actions with the clearest, safest fix. It intentionally does NOT cover RC-2 (letter templates), RC-4/RC-5 (mail transport, secrets encryption, backup pipeline), RC-6 (auth/session hardening), or RC-7 (the Confirmations DD→checklist UI rebuild, despite the user's decision to match CI4 — that's a larger, separable follow-up plan). It also does not extend feature-toggle enforcement to `feature_export_enabled`/`feature_import_enabled`/`feature_bulk_email_enabled` beyond what Task 4 covers — those are follow-up work.
- **Placeholder scan:** no TBD/TODO markers; every step has runnable code.
- **Type consistency:** `Setting::enabled()` is defined once in Task 4 Step 3 and used identically (with and without the `\App\Models\` prefix depending on whether the file already imports `Setting`) in every subsequent step of the same task.
