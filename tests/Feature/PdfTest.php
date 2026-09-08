<?php

use App\Models\ConfStudData;
use App\Models\Regularization;
use App\Models\StudentDetail;
use App\Models\StudentReminder;
use App\Models\UniversityReminderBatch;
use App\Models\UniversityReminderNote;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->user = User::create([
        'username' => 'staff_pdf_user',
        'full_name' => 'PDF Officer',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
});

test('can generate dispatch letter pdf and accounts copy pdf', function () {
    $batchSpace = 'pdf_batch_test_123';

    StudentDetail::create([
        'student_name' => 'Test PDF Student',
        'eligibility_case_no' => 'PDF-01',
        'admission_taken_in' => 'F.Y.B.Com',
        'admission_taken_year' => '2025-2026',
        'clg_add' => 'Pune University',
        'fees' => '500',
        'to_name' => 'The Controller of Examinations',
        'in_favour_of' => 'Finance Officer',
        'array_space' => $batchSpace,
    ]);

    // Dispatch Letter PDF
    $res1 = $this->actingAs($this->user)->get("/pdf/dispatch/{$batchSpace}");
    $res1->assertOk();
    $res1->assertHeader('Content-Type', 'application/pdf');

    // Accounts Copy PDF
    $res2 = $this->actingAs($this->user)->get("/pdf/accounts/{$batchSpace}");
    $res2->assertOk();
    $res2->assertHeader('Content-Type', 'application/pdf');
});

test('can generate confirmation of eligibility pdf', function () {
    $batchSpace = 'conf_pdf_batch_456';

    ConfStudData::create([
        'student_name' => 'Verified Student',
        'case_no' => 'CASE-100',
        'uni_add' => 'Shivaji University',
        'stream' => 'B.Com',
        'acd_year' => '2025-2026',
        'array_space' => $batchSpace,
        'en_by' => 'staff_pdf_user',
    ]);

    $res = $this->actingAs($this->user)->get("/pdf/confirmation/{$batchSpace}");
    $res->assertOk();
    $res->assertHeader('Content-Type', 'application/pdf');
});

test('can generate regularization letter pdf', function () {
    $reg = Regularization::create([
        'student_name' => 'Regularized Candidate',
        'eligibility_case_no' => 'REG-101',
        'admission_taken_in' => 'M.Com',
        'admission_taken_year' => '2025-2026',
        'university_name' => 'Gujarat University',
        'created_by' => 'staff_pdf_user',
    ]);

    $res = $this->actingAs($this->user)->get("/pdf/regularization/{$reg->id}");
    $res->assertOk();
    $res->assertHeader('Content-Type', 'application/pdf');
});

test('can generate university reminder notice pdf', function () {
    $batch = UniversityReminderBatch::create([
        'academic_year' => '2025-2026',
        'university_name' => 'Kerala University',
        'created_by' => 'staff_pdf_user',
    ]);

    $student = StudentDetail::create([
        'student_name' => 'Reminded Candidate',
        'eligibility_case_no' => 'REM-99',
        'clg_add' => 'Kerala University',
        'array_space' => 'rem_batch_1',
    ]);

    UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $student->id,
        'note_text' => '1st Reminder',
        'note_date' => '2026-09-07',
        'created_by' => 'staff_pdf_user',
    ]);

    $res = $this->actingAs($this->user)->get("/pdf/reminders/university/{$batch->id}");
    $res->assertOk();
    $res->assertHeader('Content-Type', 'application/pdf');
});

test('can generate candidate reminder notice pdf', function () {
    $rem = StudentReminder::create([
        'student_name' => 'Pending Student',
        'eligibility_case_no' => 'STU-REM-5',
        'course_name' => 'M.A.',
        'missing_doc' => 'Migration Certificate',
        'created_by' => 'staff_pdf_user',
    ]);

    $res = $this->actingAs($this->user)->get("/pdf/reminders/student/{$rem->id}");
    $res->assertOk();
    $res->assertHeader('Content-Type', 'application/pdf');
});
