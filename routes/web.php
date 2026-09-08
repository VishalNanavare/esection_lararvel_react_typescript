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
    Route::get('/students/new', [\App\Http\Controllers\StudentController::class, 'newForm'])->name('students.new');
    Route::post('/students/batch', [\App\Http\Controllers\StudentController::class, 'storeBatch'])->name('students.batch.store');
    Route::get('/students/history', [\App\Http\Controllers\StudentController::class, 'history'])->name('students.history');
    Route::get('/students/history/export', [\App\Http\Controllers\StudentController::class, 'exportHistory'])->name('students.history.export');
    Route::get('/students/batches/{arraySpace}', [\App\Http\Controllers\StudentController::class, 'batchDetail'])->name('students.batch.detail');
    Route::get('/students/batch/{arraySpace}', [\App\Http\Controllers\StudentController::class, 'batchDetail']);
    Route::put('/students/{id}', [\App\Http\Controllers\StudentController::class, 'update'])->name('students.update');
    Route::delete('/students/{id}', [\App\Http\Controllers\StudentController::class, 'destroy'])->name('students.destroy');
    Route::get('/students/import', [\App\Http\Controllers\StudentController::class, 'importForm'])->name('students.import');
    Route::post('/students/read-candidate-sheet', [\App\Http\Controllers\StudentController::class, 'readCandidateSheet'])->name('students.read.sheet');
    Route::post('/students/new/readSheet', [\App\Http\Controllers\StudentController::class, 'readCandidateSheet']);

    /*
    |--------------------------------------------------------------------------
    | Demand Draft (DD) Confirmations
    |--------------------------------------------------------------------------
    */
    Route::get('/confirmations', [\App\Http\Controllers\ConfirmationController::class, 'index'])->name('confirmations.index');
    Route::post('/confirmations/store', [\App\Http\Controllers\ConfirmationController::class, 'store'])->name('confirmations.store');
    Route::get('/confirmations/history', [\App\Http\Controllers\ConfirmationController::class, 'history'])->name('confirmations.history');
    Route::get('/confirmations/export', [\App\Http\Controllers\ConfirmationController::class, 'export'])->name('confirmations.export');
    Route::get('/confirmations/batches/{arraySpace}', [\App\Http\Controllers\ConfirmationController::class, 'batchDetail'])->name('confirmations.batch.detail');
    Route::delete('/confirmations/{id}', [\App\Http\Controllers\ConfirmationController::class, 'destroy'])->name('confirmations.destroy');

    /*
    |--------------------------------------------------------------------------
    | University Master Directory
    |--------------------------------------------------------------------------
    */
    Route::get('/universities', [\App\Http\Controllers\UniversityController::class, 'index'])->name('universities.index');
    Route::post('/universities', [\App\Http\Controllers\UniversityController::class, 'store'])->name('universities.store');
    Route::put('/universities/{id}', [\App\Http\Controllers\UniversityController::class, 'update'])->name('universities.update');
    Route::post('/universities/{id}/toggle', [\App\Http\Controllers\UniversityController::class, 'toggleActive'])->name('universities.toggle');
    Route::get('/universities/export', [\App\Http\Controllers\UniversityController::class, 'export'])->name('universities.export');

    /*
    |--------------------------------------------------------------------------
    | Student Eligibility Regularization
    |--------------------------------------------------------------------------
    */
    Route::get('/regularization', [\App\Http\Controllers\RegularizationController::class, 'index'])->name('regularization.index');
    Route::post('/regularization', [\App\Http\Controllers\RegularizationController::class, 'store'])->name('regularization.store');
    Route::get('/regularization/history', [\App\Http\Controllers\RegularizationController::class, 'history'])->name('regularization.history');
    Route::get('/regularization/export', [\App\Http\Controllers\RegularizationController::class, 'export'])->name('regularization.export');
    Route::put('/regularization/{id}', [\App\Http\Controllers\RegularizationController::class, 'update'])->name('regularization.update');
    Route::delete('/regularization/{id}', [\App\Http\Controllers\RegularizationController::class, 'destroy'])->name('regularization.destroy');
    Route::post('/regularization/generateLetter', [\App\Http\Controllers\RegularizationController::class, 'store']);

    /*
    |--------------------------------------------------------------------------
    | Marksheet & Candidate Reminders
    |--------------------------------------------------------------------------
    */
    Route::redirect('/reminders', '/reminders/university');
    Route::get('/reminders/university', [\App\Http\Controllers\ReminderController::class, 'universityIndex'])->name('reminders.university');
    Route::post('/reminders/university', [\App\Http\Controllers\ReminderController::class, 'storeUniversityReminder'])->name('reminders.university.store');
    Route::post('/reminders/generateUniversityReminder', [\App\Http\Controllers\ReminderController::class, 'storeUniversityReminder']);
    Route::get('/reminders/university/export', [\App\Http\Controllers\ReminderController::class, 'universityExport'])->name('reminders.university.export');
    Route::get('/reminders/university/history', [\App\Http\Controllers\ReminderController::class, 'universityHistory'])->name('reminders.university.history');
    Route::get('/reminders/university/history/export', [\App\Http\Controllers\ReminderController::class, 'universityHistoryExport'])->name('reminders.university.history.export');
    Route::get('/reminders/university/batches/{batchId}', [\App\Http\Controllers\ReminderController::class, 'universityBatchDetail'])->name('reminders.university.batch.detail');
    Route::get('/reminders/student', [\App\Http\Controllers\ReminderController::class, 'studentIndex'])->name('reminders.student');
    Route::post('/reminders/student', [\App\Http\Controllers\ReminderController::class, 'storeStudentReminder'])->name('reminders.student.store');
    Route::post('/reminders/generateStudentReminder', [\App\Http\Controllers\ReminderController::class, 'storeStudentReminder']);
    Route::get('/reminders/student/history', [\App\Http\Controllers\ReminderController::class, 'studentHistory'])->name('reminders.student.history');
    Route::get('/reminders/student/export', [\App\Http\Controllers\ReminderController::class, 'studentExport'])->name('reminders.student.export');
    Route::delete('/reminders/student/{id}', [\App\Http\Controllers\ReminderController::class, 'studentDestroy'])->name('reminders.student.destroy');

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
    Route::get('/pdf/dispatch/{arraySpace}', [\App\Http\Controllers\PdfController::class, 'dispatch'])->name('pdf.dispatch');
    Route::get('/pdf/accounts/{arraySpace}', [\App\Http\Controllers\PdfController::class, 'accounts'])->name('pdf.accounts');
    Route::get('/pdf/dispatchAccounts/{arraySpace}', [\App\Http\Controllers\PdfController::class, 'accounts']);
    Route::get('/pdf/confirmation/{arraySpace}', [\App\Http\Controllers\PdfController::class, 'confirmation'])->name('pdf.confirmation');
    Route::get('/pdf/regularization/{id}', [\App\Http\Controllers\PdfController::class, 'regularization'])->name('pdf.regularization');
    Route::get('/pdf/reminders/university/{batchId}', [\App\Http\Controllers\PdfController::class, 'universityReminder'])->name('pdf.reminder.university');
    Route::get('/pdf/reminders/student/{id}', [\App\Http\Controllers\PdfController::class, 'studentReminder'])->name('pdf.reminder.student');

    /*
    |--------------------------------------------------------------------------
    | System Settings & Administration
    |--------------------------------------------------------------------------
    */
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
