<?php

use App\Http\Controllers\ApiController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BulkEmailController;
use App\Http\Controllers\ConfirmationController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\PdfController;
use App\Http\Controllers\RegularizationController;
use App\Http\Controllers\ReminderController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\StudentController;
use App\Http\Controllers\UniversityController;
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
    Route::get('/students/new', [StudentController::class, 'newForm'])->name('students.new')->middleware('access:students.create');
    Route::post('/students/batch', [StudentController::class, 'storeBatch'])->name('students.batch.store')->middleware('access:students.create');
    Route::get('/students/history', [StudentController::class, 'history'])->name('students.history')->middleware('access:students.view');
    Route::get('/students/history/export', [StudentController::class, 'exportHistory'])->name('students.history.export')->middleware('access:students.export');
    Route::get('/students/batches/{arraySpace}', [StudentController::class, 'batchDetail'])->name('students.batch.detail')->middleware('access:students.view');
    Route::get('/students/batch/{arraySpace}', [StudentController::class, 'batchDetail'])->middleware('access:students.view');
    Route::put('/students/{id}', [StudentController::class, 'update'])->name('students.update')->middleware('access:students.edit');
    Route::delete('/students/{id}', [StudentController::class, 'destroy'])->name('students.destroy')->middleware('access:students.delete');
    Route::get('/students/import', [StudentController::class, 'importForm'])->name('students.import')->middleware('access:students.import');
    Route::post('/students/read-candidate-sheet', [StudentController::class, 'readCandidateSheet'])->name('students.read.sheet')->middleware('access:students.import');
    Route::post('/students/new/readSheet', [StudentController::class, 'readCandidateSheet'])->middleware('access:students.create');

    /*
    |--------------------------------------------------------------------------
    | Demand Draft (DD) Confirmations
    |--------------------------------------------------------------------------
    */
    Route::get('/confirmations', [ConfirmationController::class, 'index'])->name('confirmations.index')->middleware('access:confirmations.view');
    Route::post('/confirmations/store', [ConfirmationController::class, 'store'])->name('confirmations.store')->middleware('access:confirmations.create');
    Route::get('/confirmations/history', [ConfirmationController::class, 'history'])->name('confirmations.history')->middleware('access:confirmations.view');
    Route::get('/confirmations/export', [ConfirmationController::class, 'export'])->name('confirmations.export')->middleware('access:confirmations.export');
    Route::get('/confirmations/batches/{arraySpace}', [ConfirmationController::class, 'batchDetail'])->name('confirmations.batch.detail')->middleware('access:confirmations.view');
    Route::delete('/confirmations/{id}', [ConfirmationController::class, 'destroy'])->name('confirmations.destroy')->middleware('access:confirmations.delete');

    /*
    |--------------------------------------------------------------------------
    | University Master Directory
    |--------------------------------------------------------------------------
    */
    Route::get('/universities', [UniversityController::class, 'index'])->name('universities.index')->middleware('access:universities.view');
    Route::post('/universities', [UniversityController::class, 'store'])->name('universities.store')->middleware('access:universities.create');
    Route::put('/universities/{id}', [UniversityController::class, 'update'])->name('universities.update')->middleware('access:universities.edit');
    Route::post('/universities/{id}/toggle', [UniversityController::class, 'toggleActive'])->name('universities.toggle')->middleware('access:universities.toggle');
    Route::get('/universities/export', [UniversityController::class, 'export'])->name('universities.export')->middleware('access:universities.export');

    /*
    |--------------------------------------------------------------------------
    | Student Eligibility Regularization
    |--------------------------------------------------------------------------
    */
    Route::get('/regularization', [RegularizationController::class, 'index'])->name('regularization.index')->middleware('access:regularization.create');
    Route::post('/regularization', [RegularizationController::class, 'store'])->name('regularization.store')->middleware('access:regularization.create');
    Route::get('/regularization/history', [RegularizationController::class, 'history'])->name('regularization.history')->middleware('access:regularization.view');
    Route::get('/regularization/export', [RegularizationController::class, 'export'])->name('regularization.export')->middleware('access:regularization.export');
    Route::put('/regularization/{id}', [RegularizationController::class, 'update'])->name('regularization.update')->middleware('access:regularization.edit');
    Route::delete('/regularization/{id}', [RegularizationController::class, 'destroy'])->name('regularization.destroy')->middleware('access:regularization.delete');
    Route::post('/regularization/generateLetter', [RegularizationController::class, 'store'])->middleware('access:regularization.create');

    /*
    |--------------------------------------------------------------------------
    | Marksheet & Candidate Reminders
    |--------------------------------------------------------------------------
    */
    Route::redirect('/reminders', '/reminders/university');
    Route::get('/reminders/university', [ReminderController::class, 'universityIndex'])->name('reminders.university')->middleware('access:reminders_university.view');
    Route::post('/reminders/university', [ReminderController::class, 'storeUniversityReminder'])->name('reminders.university.store')->middleware('access:reminders_university.create');
    Route::post('/reminders/generateUniversityReminder', [ReminderController::class, 'storeUniversityReminder'])->middleware('access:reminders_university.create');
    Route::get('/reminders/university/export', [ReminderController::class, 'universityExport'])->name('reminders.university.export')->middleware('access:reminders_university.export');
    Route::get('/reminders/university/history', [ReminderController::class, 'universityHistory'])->name('reminders.university.history')->middleware('access:reminders_university.view');
    Route::get('/reminders/university/history/export', [ReminderController::class, 'universityHistoryExport'])->name('reminders.university.history.export')->middleware('access:reminders_university.export');
    Route::get('/reminders/university/batches/{batchId}', [ReminderController::class, 'universityBatchDetail'])->name('reminders.university.batch.detail')->middleware('access:reminders_university.view');
    Route::get('/reminders/student', [ReminderController::class, 'studentIndex'])->name('reminders.student')->middleware('access:reminders_student.view');
    Route::post('/reminders/student', [ReminderController::class, 'storeStudentReminder'])->name('reminders.student.store')->middleware('access:reminders_student.create');
    Route::post('/reminders/generateStudentReminder', [ReminderController::class, 'storeStudentReminder'])->middleware('access:reminders_student.create');
    Route::get('/reminders/student/history', [ReminderController::class, 'studentHistory'])->name('reminders.student.history')->middleware('access:reminders_student.view');
    Route::get('/reminders/student/export', [ReminderController::class, 'studentExport'])->name('reminders.student.export')->middleware('access:reminders_student.export');
    Route::delete('/reminders/student/{id}', [ReminderController::class, 'studentDestroy'])->name('reminders.student.destroy')->middleware('access:reminders_student.delete');

    /*
    |--------------------------------------------------------------------------
    | Bulk Email Dispatch & Send Logs
    |--------------------------------------------------------------------------
    */
    Route::middleware('admin')->group(function () {
        Route::get('/bulk-email', [BulkEmailController::class, 'index'])->name('bulk-email.index');
        Route::post('/bulk-email/send', [BulkEmailController::class, 'send'])->name('bulk-email.send');
        Route::get('/bulk-email/log', [BulkEmailController::class, 'log'])->name('bulk-email.log');
        Route::post('/bulk-email/retry/{id}', [BulkEmailController::class, 'retry'])->name('bulk-email.retry');
        Route::post('/bulk-email/retry-all', [BulkEmailController::class, 'retryAll'])->name('bulk-email.retry-all');
    });

    /*
    |--------------------------------------------------------------------------
    | Official PDF Document Generation Engine
    |--------------------------------------------------------------------------
    */
    Route::get('/pdf/dispatch/{arraySpace}', [PdfController::class, 'dispatch'])->name('pdf.dispatch')->middleware('access:students.print');
    Route::get('/pdf/accounts/{arraySpace}', [PdfController::class, 'accounts'])->name('pdf.accounts')->middleware('access:students.print');
    Route::get('/pdf/dispatchAccounts/{arraySpace}', [PdfController::class, 'accounts'])->middleware('access:students.print');
    Route::get('/pdf/confirmation/{arraySpace}', [PdfController::class, 'confirmation'])->name('pdf.confirmation')->middleware('access:confirmations.print');
    Route::get('/pdf/regularization/{id}', [PdfController::class, 'regularization'])->name('pdf.regularization')->middleware('access:regularization.print');
    Route::get('/pdf/reminders/university/{batchId}', [PdfController::class, 'universityReminder'])->name('pdf.reminder.university')->middleware('access:reminders_university.print');
    Route::get('/pdf/reminders/student/{id}', [PdfController::class, 'studentReminder'])->name('pdf.reminder.student')->middleware('access:reminders_student.print');

    /*
    |--------------------------------------------------------------------------
    | System Settings & Administration
    |--------------------------------------------------------------------------
    */
    Route::middleware('admin')->group(function () {
        Route::get('/settings', [SettingsController::class, 'index'])->name('settings.index');
        Route::get('/settings/institute', [SettingsController::class, 'institute'])->name('settings.institute');
        Route::post('/settings/institute', [SettingsController::class, 'updateInstitute'])->name('settings.institute.update');
        Route::get('/settings/features', [SettingsController::class, 'features'])->name('settings.features');
        Route::post('/settings/features', [SettingsController::class, 'updateFeatures'])->name('settings.features.update');
        Route::get('/settings/academic-years', [SettingsController::class, 'academicYears'])->name('settings.academic-years');
        Route::post('/settings/academic-years', [SettingsController::class, 'storeAcademicYear'])->name('settings.academic-years.store');
        Route::put('/settings/academic-years/{id}', [SettingsController::class, 'updateAcademicYear'])->name('settings.academic-years.update');
        Route::post('/settings/academic-years/{id}/activate', [SettingsController::class, 'setActiveAcademicYear'])->name('settings.academic-years.activate');
        Route::delete('/settings/academic-years/{id}', [SettingsController::class, 'destroyAcademicYear'])->name('settings.academic-years.destroy');
        Route::get('/settings/courses', [SettingsController::class, 'courses'])->name('settings.courses');
        Route::post('/settings/courses', [SettingsController::class, 'storeCourse'])->name('settings.courses.store');
        Route::put('/settings/courses/{id}', [SettingsController::class, 'updateCourse'])->name('settings.courses.update');
        Route::post('/settings/courses/{id}/toggle', [SettingsController::class, 'toggleCourse'])->name('settings.courses.toggle');
        Route::delete('/settings/courses/{id}', [SettingsController::class, 'destroyCourse'])->name('settings.courses.destroy');
        Route::post('/settings/streams', [SettingsController::class, 'storeStream'])->name('settings.streams.store');
        Route::delete('/settings/streams/{id}', [SettingsController::class, 'destroyStream'])->name('settings.streams.destroy');
        Route::get('/settings/numbering', [SettingsController::class, 'numbering'])->name('settings.numbering');
        Route::post('/settings/numbering', [SettingsController::class, 'updateNumbering'])->name('settings.numbering.update');
        Route::get('/settings/users', [SettingsController::class, 'users'])->name('settings.users');
        Route::post('/settings/users', [SettingsController::class, 'storeUser'])->name('settings.users.store');
        Route::put('/settings/users/{id}', [SettingsController::class, 'updateUser'])->name('settings.users.update');
        Route::post('/settings/users/{id}/toggle', [SettingsController::class, 'toggleUser'])->name('settings.users.toggle');
        Route::get('/settings/access-rights', [SettingsController::class, 'accessRights'])->name('settings.access-rights');
        Route::post('/settings/access-rights', [SettingsController::class, 'updateAccessRights'])->name('settings.access-rights.update');
        Route::get('/settings/letter-templates', [SettingsController::class, 'letterTemplates'])->name('settings.letter-templates');
        Route::post('/settings/letter-templates/footer', [SettingsController::class, 'updateLetterFooter'])->name('settings.letter-templates.footer');
        Route::post('/settings/letter-templates/{slug}', [SettingsController::class, 'updateLetterTemplate'])->name('settings.letter-templates.update');
        Route::get('/settings/backup', [SettingsController::class, 'backup'])->name('settings.backup');
        Route::post('/settings/backup/sql', [SettingsController::class, 'runBackupSql'])->name('settings.backup.sql');
        Route::post('/settings/backup/excel', [SettingsController::class, 'runBackupExcel'])->name('settings.backup.excel');
        Route::post('/settings/backup/password', [SettingsController::class, 'updateBackupPassword'])->name('settings.backup.password');
        Route::post('/settings/backup/retention', [SettingsController::class, 'updateBackupRetention'])->name('settings.backup.retention');
        Route::get('/settings/mail', [SettingsController::class, 'mail'])->name('settings.mail');
        Route::post('/settings/mail', [SettingsController::class, 'updateMail'])->name('settings.mail.update');
        Route::post('/settings/mail/test', [SettingsController::class, 'testMail'])->name('settings.mail.test');
        Route::post('/settings/mail/templates/{slug}', [SettingsController::class, 'updateEmailTemplate'])->name('settings.mail.template.update');
        Route::get('/settings/activity-log', [SettingsController::class, 'activityLog'])->name('settings.activity-log');
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
