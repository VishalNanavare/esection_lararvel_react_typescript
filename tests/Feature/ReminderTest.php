<?php

use App\Models\CollegeDetail;
use App\Models\Setting;
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

test('staff can record university reminder notes when note_date is omitted', function () {
    $student = StudentDetail::create([
        'student_name' => 'Rahul Sharma',
        'eligibility_case_no' => 'REM-003',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2025-2026',
        'clg_add' => 'Pune University, Ganeshkhind',
        'array_space' => 'batch_rem_3',
    ]);

    $response = $this->actingAs($this->user)->post('/reminders/university', [
        'student_ids' => [$student->id],
        'note_text' => '1st Reminder Notice',
        'academic_year' => '2025-2026',
        'university_name' => 'Pune University',
        'admission_taken_in' => 'B.Com',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('university_reminder_notes', [
        'student_id' => $student->id,
        'note_text' => '1st Reminder Notice',
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

test('university reminder history export does not crash and reports distinct candidate counts', function () {
    $batch = UniversityReminderBatch::create([
        'academic_year' => '2025-26',
        'university_name' => 'University of Mumbai',
        'admission_taken_in' => 'BA',
        'head_name' => 'The Controller of Examinations',
        'created_by' => 'esection1',
    ]);

    // Two notes for the same student (a 1st and 2nd reminder) plus one for a different student.
    UniversityReminderNote::create([
        'batch_id' => $batch->id, 'student_id' => 1, 'note_text' => '1st Reminder',
        'note_date' => now()->toDateString(), 'created_by' => 'esection1', 'created_at' => now(),
    ]);
    UniversityReminderNote::create([
        'batch_id' => $batch->id, 'student_id' => 1, 'note_text' => '2nd Reminder',
        'note_date' => now()->toDateString(), 'created_by' => 'esection1', 'created_at' => now(),
    ]);
    UniversityReminderNote::create([
        'batch_id' => $batch->id, 'student_id' => 2, 'note_text' => '1st Reminder',
        'note_date' => now()->toDateString(), 'created_by' => 'esection1', 'created_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->get('/reminders/university/history/export');

    $response->assertOk();
    $csv = $response->streamedContent();
    expect($csv)->toContain('University of Mumbai');
    // 2 distinct students, not 3 notes.
    expect($csv)->toContain(',2,');
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

test('candidate reminder history does not expose delete when feature_delete_enabled is off', function () {
    Setting::set('feature_delete_enabled', '0', 'feature', $this->user->id);

    $response = $this->actingAs($this->user)->get('/reminders/student/history');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->where('features.delete', false));
});

test('staff can filter university students by reminder status', function () {
    $s1 = StudentDetail::create([
        'student_name' => 'Zero Reminder Student',
        'eligibility_case_no' => 'REM-Z01',
        'admission_taken_in' => 'B.A.',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Savitribai Phule Pune University, Pune',
        'array_space' => 'batch_rem_filter_1',
    ]);

    $s2 = StudentDetail::create([
        'student_name' => 'One Reminder Student',
        'eligibility_case_no' => 'REM-O01',
        'admission_taken_in' => 'M.Com',
        'admission_taken_year' => '2023-2024',
        'clg_add' => 'Savitribai Phule Pune University, Pune',
        'array_space' => 'batch_rem_filter_2',
    ]);

    $batch = UniversityReminderBatch::create([
        'academic_year' => '2023-2024',
        'university_name' => 'Savitribai Phule Pune University',
    ]);

    UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $s2->id,
        'note_text' => '1st Reminder',
        'note_date' => now()->toDateString(),
    ]);

    // Query for 0 reminders (pending 1st reminder)
    $res0 = $this->actingAs($this->user)->get('/reminders/university?reminder_status=0&clg_add=Pune');
    $res0->assertOk();
    $res0->assertInertia(fn ($page) => $page
        ->where('students.data.0.student_name', 'Zero Reminder Student')
    );

    // Query for 1 reminder (pending 2nd reminder)
    $res1 = $this->actingAs($this->user)->get('/reminders/university?reminder_status=1&clg_add=Pune');
    $res1->assertOk();
    $res1->assertInertia(fn ($page) => $page
        ->where('students.data.0.student_name', 'One Reminder Student')
    );
});

test('staff can record reminder for students across multiple academic years and courses', function () {
    $s1 = StudentDetail::create([
        'student_name' => 'Course 1 Student',
        'eligibility_case_no' => 'CASE-P1',
        'admission_taken_in' => 'M.Com',
        'admission_taken_year' => '2023-2024',
        'clg_add' => 'Savitribai Phule Pune University',
        'array_space' => 'batch_p1',
    ]);

    $s2 = StudentDetail::create([
        'student_name' => 'Course 2 Student',
        'eligibility_case_no' => 'CASE-P2',
        'admission_taken_in' => 'B.A.',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Savitribai Phule Pune University',
        'array_space' => 'batch_p2',
    ]);

    $response = $this->actingAs($this->user)->post('/reminders/university', [
        'student_ids' => [$s1->id, $s2->id],
        'note_text' => '1st Reminder Notice',
        'university_name' => 'Savitribai Phule Pune University',
    ]);

    $response->assertRedirect();

    $this->assertDatabaseHas('university_reminder_batches', [
        'university_name' => 'Savitribai Phule Pune University',
    ]);

    $batch = UniversityReminderBatch::where('university_name', 'Savitribai Phule Pune University')->first();
    expect($batch->academic_year)->toContain('2023-2024');
    expect($batch->academic_year)->toContain('2024-2025');
    expect($batch->admission_taken_in)->toBe('Multiple Programs (2)');
});

test('staff can dispatch email reminder to university with candidate list and pdf notice', function () {
    Illuminate\Support\Facades\Mail::fake();

    Setting::set('mail_smtp_host', 'smtp.mailtrap.io', 'mail');
    Setting::set('mail_smtp_port', '2525', 'mail');
    Setting::set('mail_from_email', 'eligibility@idol.mu.ac.in', 'mail');

    $student = StudentDetail::create([
        'student_name' => 'Ramesh Patil',
        'eligibility_case_no' => 'REM-EMAIL-01',
        'admission_taken_in' => 'M.A. History',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Savitribai Phule Pune University',
        'array_space' => 'batch_em_1',
    ]);

    $batch = UniversityReminderBatch::create([
        'academic_year' => '2024-2025',
        'university_name' => 'Savitribai Phule Pune University',
        'admission_taken_in' => 'M.A. History',
        'created_by' => 'staff_rem_user',
    ]);

    UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $student->id,
        'note_text' => '1st Reminder Notice',
        'note_date' => now()->toDateString(),
        'created_by' => 'staff_rem_user',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->post("/reminders/university/batches/{$batch->id}/send-email", [
        'recipient_email' => 'exam@unipune.ac.in',
        'subject' => '1st Reminder Notice: Verification of Pending Marksheets',
        'message_notes' => 'Please treat this as urgent.',
        'attach_pdf' => true,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    Illuminate\Support\Facades\Mail::assertSent(App\Mail\RawHtmlMail::class, function ($mail) {
        return $mail->hasTo('exam@unipune.ac.in')
            && str_contains($mail->subject, '1st Reminder Notice')
            && str_contains($mail->htmlBody, 'Ramesh Patil')
            && str_contains($mail->htmlBody, 'REM-EMAIL-01')
            && count($mail->rawAttachments) === 1;
    });

    $this->assertDatabaseHas('email_log', [
        'recipient_email' => 'exam@unipune.ac.in',
        'recipient_type' => 'university',
        'status' => 'sent',
    ]);
});

test('verified candidates are excluded when recording reminders and pending candidates remain eligible', function () {
    $verifiedStudent = StudentDetail::create([
        'student_name' => 'Verified Student',
        'eligibility_case_no' => 'CASE-VER-01',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'University of Delhi',
        'verification_status' => 'verified',
        'array_space' => 'batch_t1',
    ]);

    $pendingStudent = StudentDetail::create([
        'student_name' => 'Pending Student',
        'eligibility_case_no' => 'CASE-PEN-01',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'University of Delhi',
        'verification_status' => 'pending',
        'array_space' => 'batch_t2',
    ]);

    $response = $this->actingAs($this->user)->post('/reminders/university', [
        'student_ids' => [$verifiedStudent->id, $pendingStudent->id],
        'note_text' => '1st Reminder Notice',
        'university_name' => 'University of Delhi',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('warning');

    $this->assertDatabaseHas('university_reminder_notes', [
        'student_id' => $pendingStudent->id,
        'note_text' => '1st Reminder Notice',
    ]);

    $this->assertDatabaseMissing('university_reminder_notes', [
        'student_id' => $verifiedStudent->id,
        'note_text' => '1st Reminder Notice',
    ]);
});

test('recording reminder fails if all selected candidates are already verified or excluded', function () {
    $verifiedStudent = StudentDetail::create([
        'student_name' => 'All Verified Student',
        'eligibility_case_no' => 'CASE-ALL-VER',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'University of Delhi',
        'verification_status' => 'verified',
        'array_space' => 'batch_t3',
    ]);

    $response = $this->actingAs($this->user)->post('/reminders/university', [
        'student_ids' => [$verifiedStudent->id],
        'note_text' => '1st Reminder Notice',
        'university_name' => 'University of Delhi',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('error');
});

test('staff can update student verification status with reason and audit log', function () {
    $student = StudentDetail::create([
        'student_name' => 'Status Update Student',
        'eligibility_case_no' => 'CASE-STATUS-01',
        'admission_taken_in' => 'M.Sc',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'University of Pune',
        'verification_status' => 'pending',
        'array_space' => 'batch_t4',
    ]);

    // Exclude student
    $resExclude = $this->actingAs($this->user)->post("/reminders/university/students/{$student->id}/status", [
        'status' => 'excluded',
        'reason' => 'Candidate admission canceled by IDOL committee',
    ]);

    $resExclude->assertRedirect();
    $this->assertDatabaseHas('student_details', [
        'id' => $student->id,
        'verification_status' => 'excluded',
        'exclusion_reason' => 'Candidate admission canceled by IDOL committee',
    ]);

    $this->assertDatabaseHas('activity_log', [
        'action' => 'update_verification_status',
        'entity_type' => 'StudentDetail',
        'entity_id' => $student->id,
    ]);

    // Reinstate to verified
    $resVerify = $this->actingAs($this->user)->post("/reminders/university/students/{$student->id}/status", [
        'status' => 'verified',
    ]);

    $resVerify->assertRedirect();
    $this->assertDatabaseHas('student_details', [
        'id' => $student->id,
        'verification_status' => 'verified',
    ]);
});

test('preview combine batches computes accurate deduplication and exclusion statistics', function () {
    $s1 = StudentDetail::create([
        'student_name' => 'Student One',
        'eligibility_case_no' => 'CASE-COMB-01',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Gujarat University',
        'verification_status' => 'pending',
        'array_space' => 'batch_c1',
    ]);

    $s2 = StudentDetail::create([
        'student_name' => 'Student Two (Duplicate)',
        'eligibility_case_no' => 'CASE-COMB-02',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Gujarat University',
        'verification_status' => 'pending',
        'array_space' => 'batch_c2',
    ]);

    $s3 = StudentDetail::create([
        'student_name' => 'Student Three (Verified)',
        'eligibility_case_no' => 'CASE-COMB-03',
        'admission_taken_in' => 'M.Com',
        'admission_taken_year' => '2023-2024',
        'clg_add' => 'Gujarat University',
        'verification_status' => 'verified',
        'array_space' => 'batch_c3',
    ]);

    $batch1 = UniversityReminderBatch::create([
        'academic_year' => '2024-2025',
        'university_name' => 'Gujarat University',
        'created_by' => 'staff_rem_user',
    ]);
    UniversityReminderNote::create([
        'batch_id' => $batch1->id,
        'student_id' => $s1->id,
        'note_text' => '1st Reminder',
    ]);
    UniversityReminderNote::create([
        'batch_id' => $batch1->id,
        'student_id' => $s2->id,
        'note_text' => '1st Reminder',
    ]);

    $batch2 = UniversityReminderBatch::create([
        'academic_year' => '2023-2024',
        'university_name' => 'Gujarat University',
        'created_by' => 'staff_rem_user',
    ]);
    UniversityReminderNote::create([
        'batch_id' => $batch2->id,
        'student_id' => $s2->id, // Duplicate student across batches!
        'note_text' => '1st Reminder',
    ]);
    UniversityReminderNote::create([
        'batch_id' => $batch2->id,
        'student_id' => $s3->id, // Verified student!
        'note_text' => '1st Reminder',
    ]);

    $response = $this->actingAs($this->user)->postJson('/reminders/university/batches/preview-combine', [
        'batch_ids' => [$batch1->id, $batch2->id],
    ]);

    $response->assertOk();
    $data = $response->json();

    expect($data['university_name'])->toBe('Gujarat University');
    expect($data['total_raw_entries'])->toBe(4);
    expect($data['unique_candidates'])->toBe(3);
    expect($data['duplicate_entries_removed'])->toBe(1);
    expect($data['verified_excluded_count'])->toBe(1);
    expect($data['final_eligible_count'])->toBe(2);
    expect(count($data['eligible_candidates']))->toBe(2);
});

test('combining batches across different universities is rejected with 422', function () {
    $batch1 = UniversityReminderBatch::create([
        'academic_year' => '2024-2025',
        'university_name' => 'University of Delhi',
        'created_by' => 'staff_rem_user',
    ]);

    $batch2 = UniversityReminderBatch::create([
        'academic_year' => '2024-2025',
        'university_name' => 'University of Mumbai',
        'created_by' => 'staff_rem_user',
    ]);

    $resPreview = $this->actingAs($this->user)->postJson('/reminders/university/batches/preview-combine', [
        'batch_ids' => [$batch1->id, $batch2->id],
    ]);
    $resPreview->assertStatus(422);

    $resCombine = $this->actingAs($this->user)->postJson('/reminders/university/batches/combine', [
        'batch_ids' => [$batch1->id, $batch2->id],
        'note_text' => 'Consolidated Reminder',
    ]);
    $resCombine->assertStatus(422);
});

test('staff can combine multiple pending batches into a consolidated campaign preserving source records', function () {
    $s1 = StudentDetail::create([
        'student_name' => 'Consolidation Candidate 1',
        'eligibility_case_no' => 'CASE-CONS-01',
        'admission_taken_in' => 'B.A.',
        'admission_taken_year' => '2023-2024',
        'clg_add' => 'Savitribai Phule Pune University',
        'verification_status' => 'pending',
        'array_space' => 'batch_cs1',
    ]);

    $s2 = StudentDetail::create([
        'student_name' => 'Consolidation Candidate 2 (Shared)',
        'eligibility_case_no' => 'CASE-CONS-02',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Savitribai Phule Pune University',
        'verification_status' => 'pending',
        'array_space' => 'batch_cs2',
    ]);

    $s3 = StudentDetail::create([
        'student_name' => 'Consolidation Candidate 3',
        'eligibility_case_no' => 'CASE-CONS-03',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Savitribai Phule Pune University',
        'verification_status' => 'pending',
        'array_space' => 'batch_cs3',
    ]);

    $b1 = UniversityReminderBatch::create([
        'academic_year' => '2023-2024',
        'university_name' => 'Savitribai Phule Pune University',
        'admission_taken_in' => 'B.A.',
        'created_by' => 'staff_rem_user',
    ]);
    UniversityReminderNote::create(['batch_id' => $b1->id, 'student_id' => $s1->id, 'note_text' => '1st Reminder']);
    UniversityReminderNote::create(['batch_id' => $b1->id, 'student_id' => $s2->id, 'note_text' => '1st Reminder']);

    $b2 = UniversityReminderBatch::create([
        'academic_year' => '2024-2025',
        'university_name' => 'Savitribai Phule Pune University',
        'admission_taken_in' => 'B.Com',
        'created_by' => 'staff_rem_user',
    ]);
    UniversityReminderNote::create(['batch_id' => $b2->id, 'student_id' => $s2->id, 'note_text' => '1st Reminder']);
    UniversityReminderNote::create(['batch_id' => $b2->id, 'student_id' => $s3->id, 'note_text' => '1st Reminder']);

    $response = $this->actingAs($this->user)->post('/reminders/university/batches/combine', [
        'batch_ids' => [$b1->id, $b2->id],
        'note_text' => 'Consolidated 2nd Reminder Notice',
    ]);

    $response->assertRedirect();

    // Verify consolidated batch was created
    $consolidatedBatch = UniversityReminderBatch::where('is_consolidated', true)->first();
    expect($consolidatedBatch)->not->toBeNull();
    expect($consolidatedBatch->university_name)->toBe('Savitribai Phule Pune University');

    // Source batches relation is preserved and traceable
    expect($consolidatedBatch->sourceBatches->pluck('id')->all())->toBe([$b1->id, $b2->id]);

    // Original batches are intact
    expect(UniversityReminderBatch::find($b1->id))->not->toBeNull();
    expect(UniversityReminderBatch::find($b2->id))->not->toBeNull();
    expect(UniversityReminderNote::where('batch_id', $b1->id)->count())->toBe(2);
    expect(UniversityReminderNote::where('batch_id', $b2->id)->count())->toBe(2);

    // Consolidated batch has exactly 3 deduplicated candidate notes
    $consolidatedNotes = UniversityReminderNote::where('batch_id', $consolidatedBatch->id)->get();
    expect($consolidatedNotes->count())->toBe(3);
    expect($consolidatedNotes->pluck('student_id')->sort()->values()->all())->toBe([$s1->id, $s2->id, $s3->id]);

    // Audit log was recorded
    $this->assertDatabaseHas('activity_log', [
        'action' => 'create_consolidated_batch',
        'entity_type' => 'UniversityReminderBatch',
        'entity_id' => $consolidatedBatch->id,
    ]);
});

test('revalidation immediately before email sending omits candidates verified after batch creation', function () {
    Illuminate\Support\Facades\Mail::fake();

    Setting::set('mail_smtp_host', 'smtp.mailtrap.io', 'mail');
    Setting::set('mail_smtp_port', '2525', 'mail');
    Setting::set('mail_from_email', 'eligibility@idol.mu.ac.in', 'mail');

    $s1 = StudentDetail::create([
        'student_name' => 'Late Verified Student',
        'eligibility_case_no' => 'CASE-LATE-VER',
        'admission_taken_in' => 'M.A.',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Goa University',
        'verification_status' => 'pending',
        'array_space' => 'batch_g1',
    ]);

    $s2 = StudentDetail::create([
        'student_name' => 'Still Pending Student',
        'eligibility_case_no' => 'CASE-STILL-PEN',
        'admission_taken_in' => 'M.A.',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Goa University',
        'verification_status' => 'pending',
        'array_space' => 'batch_g2',
    ]);

    $batch = UniversityReminderBatch::create([
        'academic_year' => '2024-2025',
        'university_name' => 'Goa University',
        'admission_taken_in' => 'M.A.',
        'created_by' => 'staff_rem_user',
    ]);
    UniversityReminderNote::create(['batch_id' => $batch->id, 'student_id' => $s1->id, 'note_text' => '1st Reminder']);
    UniversityReminderNote::create(['batch_id' => $batch->id, 'student_id' => $s2->id, 'note_text' => '1st Reminder']);

    // Mark s1 as verified AFTER the batch was created
    $s1->update(['verification_status' => 'verified']);

    $response = $this->actingAs($this->user)->post("/reminders/university/batches/{$batch->id}/send-email", [
        'recipient_email' => 'registrar@unigoa.ac.in',
        'subject' => 'Marksheet Verification Reminder',
        'attach_pdf' => false,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('success');

    // Mail was sent containing ONLY s2, not s1
    Illuminate\Support\Facades\Mail::assertSent(App\Mail\RawHtmlMail::class, function ($mail) {
        return $mail->hasTo('registrar@unigoa.ac.in')
            && str_contains($mail->htmlBody, 'Still Pending Student')
            && ! str_contains($mail->htmlBody, 'Late Verified Student');
    });

    // Sending reminder does NOT mark s2 as verified!
    expect($s2->fresh()->verification_status)->not->toBe('verified');
});

test('email dispatch is rejected if all candidates become verified before sending', function () {
    Illuminate\Support\Facades\Mail::fake();

    Setting::set('mail_smtp_host', 'smtp.mailtrap.io', 'mail');
    Setting::set('mail_smtp_port', '2525', 'mail');
    Setting::set('mail_from_email', 'eligibility@idol.mu.ac.in', 'mail');

    $s1 = StudentDetail::create([
        'student_name' => 'Now Verified Student',
        'eligibility_case_no' => 'CASE-NOW-VER',
        'admission_taken_in' => 'M.A.',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Goa University',
        'verification_status' => 'verified',
        'array_space' => 'batch_g3',
    ]);

    $batch = UniversityReminderBatch::create([
        'academic_year' => '2024-2025',
        'university_name' => 'Goa University',
        'admission_taken_in' => 'M.A.',
        'created_by' => 'staff_rem_user',
    ]);
    UniversityReminderNote::create(['batch_id' => $batch->id, 'student_id' => $s1->id, 'note_text' => '1st Reminder']);

    $response = $this->actingAs($this->user)->post("/reminders/university/batches/{$batch->id}/send-email", [
        'recipient_email' => 'registrar@unigoa.ac.in',
        'subject' => 'Marksheet Verification Reminder',
        'attach_pdf' => false,
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('error');
    Illuminate\Support\Facades\Mail::assertNothingSent();
});

test('university reminder pdf stream succeeds for consolidated batch', function () {
    $s1 = StudentDetail::create([
        'student_name' => 'PDF Candidate 1',
        'eligibility_case_no' => 'CASE-PDF-01',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'University of Pune',
        'verification_status' => 'pending',
        'array_space' => 'batch_pdf1',
    ]);

    $batch = UniversityReminderBatch::create([
        'academic_year' => '2024-2025',
        'university_name' => 'University of Pune',
        'is_consolidated' => true,
        'created_by' => 'staff_rem_user',
    ]);
    UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $s1->id,
        'note_text' => 'Consolidated Reminder Notice',
    ]);

    $response = $this->actingAs($this->user)->get("/pdf/reminders/university/{$batch->id}");
    $response->assertOk();
    expect($response->headers->get('content-type'))->toBe('application/pdf');
});

test('university reminder index page provides accurate summary counts', function () {
    StudentDetail::create([
        'student_name' => 'Summary S1',
        'eligibility_case_no' => 'CASE-SUM-1',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Mumbai University',
        'verification_status' => 'pending',
        'array_space' => 'batch_sm1',
    ]);
    StudentDetail::create([
        'student_name' => 'Summary S2',
        'eligibility_case_no' => 'CASE-SUM-2',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Mumbai University',
        'verification_status' => 'verified',
        'array_space' => 'batch_sm2',
    ]);
    StudentDetail::create([
        'student_name' => 'Summary S3',
        'eligibility_case_no' => 'CASE-SUM-3',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Mumbai University',
        'verification_status' => 'excluded',
        'exclusion_reason' => 'Duplicate record',
        'array_space' => 'batch_sm3',
    ]);

    $response = $this->actingAs($this->user)->get('/reminders/university?clg_add=Mumbai');
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Reminders/University')
        ->has('summary')
        ->where('summary.total', fn ($val) => $val >= 3)
        ->where('summary.verified', fn ($val) => $val >= 1)
        ->where('summary.excluded', fn ($val) => $val >= 1)
        ->where('summary.eligible', fn ($val) => $val >= 1)
    );
});

test('recording university reminder rejects candidates from different universities', function () {
    CollegeDetail::create([
        'Name' => 'University of Delhi',
        'Address' => 'University of Delhi, North Campus, Delhi 110007',
        'is_active' => true,
    ]);
    CollegeDetail::create([
        'Name' => 'Savitribai Phule Pune University',
        'Address' => 'Ganeshkhind, Pune 411007',
        'is_active' => true,
    ]);

    $s1 = StudentDetail::create([
        'student_name' => 'Student Delhi',
        'eligibility_case_no' => 'DEL-001',
        'admission_taken_in' => 'B.A.',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'University of Delhi, North Campus, Delhi 110007',
        'array_space' => 'batch_cross_1',
    ]);

    $s2 = StudentDetail::create([
        'student_name' => 'Student Pune',
        'eligibility_case_no' => 'PUN-001',
        'admission_taken_in' => 'B.A.',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Savitribai Phule Pune University, Ganeshkhind, Pune 411007',
        'array_space' => 'batch_cross_2',
    ]);

    $initialBatchCount = UniversityReminderBatch::count();

    $response = $this->actingAs($this->user)->post('/reminders/university', [
        'student_ids' => [$s1->id, $s2->id],
        'note_text' => '1st Reminder Notice',
        'note_date' => '2026-10-23',
        'academic_year' => '2024-2025',
        'university_name' => 'University of Delhi',
        'head_name' => 'The Controller of Examinations',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('error');
    expect(session('error'))->toContain('Cannot create university reminder batch: All candidates in a batch must belong to the target university');

    expect(UniversityReminderBatch::count())->toBe($initialBatchCount);
    expect(UniversityReminderNote::whereIn('student_id', [$s1->id, $s2->id])->count())->toBe(0);
});

test('recording university reminder succeeds when all candidates belong to the same target university', function () {
    CollegeDetail::create([
        'Name' => 'Dr.D.Y.Patil University, Nerul.',
        'Address' => 'Sector 7, Nerul, Navi Mumbai, Maharashtra 400706',
        'is_active' => true,
    ]);

    $s1 = StudentDetail::create([
        'student_name' => 'Same Univ Student 1',
        'eligibility_case_no' => 'SU-001',
        'admission_taken_in' => 'B.Com',
        'admission_taken_year' => '2024-2025',
        'clg_add' => 'Sector 7, Nerul, Navi Mumbai, Maharashtra 400706',
        'array_space' => 'batch_same_1',
    ]);

    $s2 = StudentDetail::create([
        'student_name' => 'Same Univ Student 2',
        'eligibility_case_no' => 'SU-002',
        'admission_taken_in' => 'M.Com',
        'admission_taken_year' => '2023-2024',
        'clg_add' => 'Sector 7, Nerul, Navi Mumbai, Maharashtra 400706',
        'array_space' => 'batch_same_2',
    ]);

    $response = $this->actingAs($this->user)->post('/reminders/university', [
        'student_ids' => [$s1->id, $s2->id],
        'note_text' => '1st Reminder Notice',
        'note_date' => '2026-10-23',
        'academic_year' => '2024-2025',
        'university_name' => 'Dr.D.Y.Patil University, Nerul.',
        'head_name' => 'The Controller of Examinations',
    ]);

    $response->assertRedirect();
    $response->assertSessionHas('pdf_url');

    $batch = UniversityReminderBatch::where('university_name', 'like', '%Dr.D.Y.Patil%')->latest('id')->first();
    expect($batch)->not->toBeNull();
    expect($batch->notes()->count())->toBe(2);

    expect(UniversityReminderNote::where('batch_id', $batch->id)->count())->toBe(2);
});

