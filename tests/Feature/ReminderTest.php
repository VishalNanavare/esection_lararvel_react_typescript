<?php

use App\Models\StudentDetail;
use App\Models\StudentReminder;
use App\Models\UniversityReminderBatch;
use App\Models\UniversityReminderNote;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->user = User::create([
        'username' => 'staff_rem_user',
        'full_name' => 'Reminder Officer',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
});

test('guests are redirected from reminder routes', function () {
    $this->get('/reminders/university')->assertRedirect('/login');
    $this->get('/reminders/student')->assertRedirect('/login');
});

test('staff can view university reminder student selection screen', function () {
    StudentDetail::create([
        'student_name' => 'Aditya Verma',
        'eligibility_case_no' => 'REM-001',
        'admission_taken_in' => 'F.Y.B.Com',
        'admission_taken_year' => '2025-2026',
        'clg_add' => 'Delhi University, North Campus',
        'array_space' => 'batch_rem_1',
    ]);

    $response = $this->actingAs($this->user)->get('/reminders/university');
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Reminders/University')
        ->has('students')
        ->has('filters')
    );
});

test('staff can record university reminder notes for selected students', function () {
    $student = StudentDetail::create([
        'student_name' => 'Meera Nair',
        'eligibility_case_no' => 'REM-002',
        'admission_taken_in' => 'M.A.',
        'admission_taken_year' => '2025-2026',
        'clg_add' => 'Calicut University, Kerala',
        'to_name' => 'The Controller of Examinations',
        'array_space' => 'batch_rem_2',
    ]);

    $response = $this->actingAs($this->user)->post('/reminders/university', [
        'student_ids' => [$student->id],
        'note_text' => '1st Reminder',
        'note_date' => '2026-09-07',
        'academic_year' => '2025-2026',
        'university_name' => 'Calicut University, Kerala',
        'admission_taken_in' => 'M.A.',
        'head_name' => 'The Controller of Examinations',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('university_reminder_batches', [
        'academic_year' => '2025-2026',
        'university_name' => 'Calicut University, Kerala',
    ]);

    $this->assertDatabaseHas('university_reminder_notes', [
        'student_id' => $student->id,
        'note_text' => '1st Reminder',
    ]);
});

test('staff can view university reminder batches history and batch detail', function () {
    $batch = UniversityReminderBatch::create([
        'academic_year' => '2025-2026',
        'university_name' => 'Nagpur University',
        'created_by' => 'staff_rem_user',
    ]);

    $this->actingAs($this->user)->get('/reminders/university/history')->assertOk();
    $this->actingAs($this->user)->get("/reminders/university/batches/{$batch->id}")->assertOk();
});

test('staff can store and view candidate direct document reminders', function () {
    $response = $this->actingAs($this->user)->post('/reminders/student', [
        'student_name' => 'Sunil Joshi',
        'eligibility_case_no' => 'CASE-777',
        'course_name' => 'M.Com',
        'missing_doc' => 'Final Year Marksheet & Passing Certificate',
    ]);

    $response->assertRedirect('/reminders/student/history');

    $this->assertDatabaseHas('student_reminders', [
        'student_name' => 'Sunil Joshi',
        'eligibility_case_no' => 'CASE-777',
    ]);

    $reminder = StudentReminder::where('eligibility_case_no', 'CASE-777')->first();

    $this->actingAs($this->user)->get('/reminders/student/history')->assertOk();

    // Delete
    $this->actingAs($this->user)->delete("/reminders/student/{$reminder->id}")->assertRedirect();
    $this->assertDatabaseMissing('student_reminders', ['id' => $reminder->id]);
});
