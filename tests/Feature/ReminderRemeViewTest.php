<?php

use App\Models\CollegeDetail;
use App\Models\StudentDetail;
use App\Models\UniversityReminderBatch;
use App\Models\UniversityReminderNote;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

beforeEach(function () {
    $this->user = User::create([
        'username' => 'officer_rem',
        'full_name' => 'Officer Reminder',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);

    $this->college = CollegeDetail::create([
        'Name' => "SNDT Women's University",
        'Address' => 'Pariksha Bhavan, Sir Vithaldas Thackersey Vidyavihar, Juhu Road, Santacruz (West). Mumbai-400 049.',
        'to_name' => 'The Controller of Examinations',
        'fees' => 150,
        'state' => 'Maharashtra',
        'is_active' => true,
    ]);

    $this->student1 = StudentDetail::create([
        'student_name' => 'SHUKLA PRARTHANA VIJAYKUMAR GAYATRI',
        'student_nee_name' => '-',
        'eligibility_case_no' => 'IDOL1920208797',
        'admission_taken_in' => 'MA Part I',
        'admission_taken_year' => '2019-2020',
        'clg_add' => 'Pariksha Bhavan, Sir Vithaldas Thackersey Vidyavihar, Juhu Road, Santacruz (West). Mumbai-400 049.',
    ]);

    $this->student2 = StudentDetail::create([
        'student_name' => 'MORE SWATI YOGESH LATA',
        'student_nee_name' => '-',
        'eligibility_case_no' => 'IDOL1920204428',
        'admission_taken_in' => 'MA Part I',
        'admission_taken_year' => '2019-2020',
        'clg_add' => 'Pariksha Bhavan, Sir Vithaldas Thackersey Vidyavihar, Juhu Road, Santacruz (West). Mumbai-400 049.',
    ]);
});

test('staff can access reminder notice process page with query parameters a, b, c', function () {
    $response = $this->actingAs($this->user)->get('/reminders/university/process?' . http_build_query([
        'a' => '2019-2020',
        'b' => (string) $this->college->id,
        'c' => "{$this->student1->id}_{$this->student2->id}_",
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Reminders/RemeView')
        ->where('isUpdate', false)
        ->where('academicYear', '2019-2020')
        ->where('universityName', "SNDT Women's University")
        ->where('headName', 'The Controller of Examinations')
        ->has('students', 2)
        ->where('students.0.student_name', 'SHUKLA PRARTHANA VIJAYKUMAR GAYATRI')
        ->where('students.0.next_slot', 1)
        ->where('students.1.student_name', 'MORE SWATI YOGESH LATA')
    );
});

test('legacy reme_view.php route works for creation with a, b, c', function () {
    $response = $this->actingAs($this->user)->get('/reme_view.php?' . http_build_query([
        'a' => '2019-2020',
        'b' => (string) $this->college->id,
        'c' => "{$this->student1->id}_{$this->student2->id}_",
    ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Reminders/RemeView')
        ->where('isUpdate', false)
        ->has('students', 2)
    );
});

test('staff can edit an existing reminder batch from history', function () {
    $batch = UniversityReminderBatch::create([
        'academic_year' => '2019-2020',
        'university_name' => "SNDT Women's University",
        'admission_taken_in' => 'MA Part I',
        'head_name' => 'Controller of Examination',
        'created_by' => 'officer_rem',
    ]);

    $note1 = UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $this->student1->id,
        'note_text' => '1st Reminder Notice: Verification pending',
        'note_date' => '2025-10-01',
        'created_by' => 'officer_rem',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->get("/reminders/university/batches/{$batch->id}/edit");
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Reminders/RemeView')
        ->where('isUpdate', true)
        ->where('batchId', $batch->id)
        ->where('universityName', "SNDT Women's University")
        ->where('headName', 'Controller of Examination')
        ->has('students', 1)
        ->where('students.0.existing_notes.0.note_text', '1st Reminder Notice: Verification pending')
        ->where('students.0.next_slot', 2)
    );
});

test('legacy reme_view.php works with double base64 encoded u parameter', function () {
    $batch = UniversityReminderBatch::create([
        'academic_year' => '2019-2020',
        'university_name' => "SNDT Women's University",
        'admission_taken_in' => 'MA Part I',
        'head_name' => 'Controller of Examination',
        'legacy_array_space' => 196,
        'created_by' => 'officer_rem',
    ]);

    UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $this->student1->id,
        'note_text' => '1st Reminder Notice',
        'note_date' => '2025-11-26',
        'created_by' => 'officer_rem',
        'created_at' => now(),
    ]);

    // TVRrMg== is base64_encode(base64_encode('196'))
    $response = $this->actingAs($this->user)->get('/reme_view.php?u=TVRrMg==');
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Reminders/RemeView')
        ->where('isUpdate', true)
        ->where('batchId', $batch->id)
        ->where('legacyArraySpace', 196)
    );
});

test('saving reminder letter creates batch and records new notes', function () {
    $response = $this->actingAs($this->user)->post('/reminders/university/process/save', [
        'academic_year' => '2019-2020',
        'university_name' => "SNDT Women's University",
        'admission_taken_in' => 'MA Part I',
        'head_name' => 'The Controller of Examinations',
        'dated' => '2026-10-28',
        'students' => [
            [
                'student_id' => $this->student1->id,
                'next_reminder_note' => '1st Reminder Notice: Verification required',
            ],
            [
                'student_id' => $this->student2->id,
                'next_reminder_note' => '1st Reminder Notice: Verification required',
            ],
        ],
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('university_reminder_batches', [
        'university_name' => "SNDT Women's University",
        'academic_year' => '2019-2020',
        'admission_taken_in' => 'MA Part I',
    ]);

    $batch = UniversityReminderBatch::where('university_name', "SNDT Women's University")->latest('id')->first();
    expect($batch)->not->toBeNull();

    $this->assertDatabaseHas('university_reminder_notes', [
        'batch_id' => $batch->id,
        'student_id' => $this->student1->id,
        'note_text' => '1st Reminder Notice: Verification required',
    ]);

    $this->assertDatabaseHas('university_reminder_notes', [
        'batch_id' => $batch->id,
        'student_id' => $this->student2->id,
        'note_text' => '1st Reminder Notice: Verification required',
    ]);
});

test('saving reminder letter updates existing notes when staff corrects mistakes', function () {
    $batch = UniversityReminderBatch::create([
        'academic_year' => '2019-2020',
        'university_name' => "SNDT Women's University",
        'admission_taken_in' => 'MA Part I',
        'head_name' => 'Controller of Examination',
        'created_by' => 'officer_rem',
    ]);

    $note = UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $this->student1->id,
        'note_text' => 'Wrong Typo Note Here',
        'note_date' => '2025-10-01',
        'created_by' => 'officer_rem',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->post('/reminders/university/process/save', [
        'batch_id' => $batch->id,
        'academic_year' => '2019-2020',
        'university_name' => "SNDT Women's University",
        'admission_taken_in' => 'MA Part I',
        'head_name' => 'Controller of Examination',
        'dated' => '2026-10-28',
        'students' => [
            [
                'student_id' => $this->student1->id,
                'next_reminder_note' => '2nd Reminder Notice: Followup',
                'edited_notes' => [
                    [
                        'id' => $note->id,
                        'slot' => 1,
                        'note_text' => 'Corrected 1st Reminder Note Text',
                        'note_date' => '2025-10-02',
                    ],
                ],
            ],
        ],
    ]);

    $response->assertRedirect();

    // Verify existing note was updated (typo fixed)
    $this->assertDatabaseHas('university_reminder_notes', [
        'id' => $note->id,
        'note_text' => 'Corrected 1st Reminder Note Text',
        'note_date' => '2025-10-02 00:00:00',
    ]);

    // Verify new note was also recorded
    $this->assertDatabaseHas('university_reminder_notes', [
        'batch_id' => $batch->id,
        'student_id' => $this->student1->id,
        'note_text' => '2nd Reminder Notice: Followup',
    ]);
});

test('staff can update a single reminder note directly via note update endpoint', function () {
    $batch = UniversityReminderBatch::create([
        'academic_year' => '2019-2020',
        'university_name' => "SNDT Women's University",
        'head_name' => 'Controller',
        'created_by' => 'officer_rem',
    ]);

    $note = UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $this->student1->id,
        'note_text' => 'Old Note Text',
        'note_date' => '2025-09-10',
        'created_by' => 'officer_rem',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->postJson("/reminders/university/notes/{$note->id}", [
        'note_text' => 'Updated Note Text Without Mistake',
        'note_date' => '2025-09-12',
    ]);

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'message' => 'Reminder note updated successfully.',
    ]);

    $this->assertDatabaseHas('university_reminder_notes', [
        'id' => $note->id,
        'note_text' => 'Updated Note Text Without Mistake',
        'note_date' => '2025-09-12 00:00:00',
    ]);
});

test('legacy rem_view.php redirects to reminder history', function () {
    $response = $this->actingAs($this->user)->get('/rem_view.php');
    $response->assertRedirect('/reminders/university/history');
});

test('custom head_name entered by staff is saved on the batch and used in reminder letter pdf', function () {
    $customHead = 'The Assistant Registrar (Eligibility)';

    $response = $this->actingAs($this->user)->post('/reminders/university/process/save', [
        'academic_year' => '2019-2020',
        'university_name' => "SNDT Women's University",
        'admission_taken_in' => 'MA Part I',
        'head_name' => $customHead,
        'dated' => '2026-10-28',
        'students' => [
            [
                'student_id' => $this->student1->id,
                'next_reminder_note' => '1st Reminder Notice: Verification required',
            ],
        ],
    ]);

    $response->assertRedirect();
    $batch = UniversityReminderBatch::where('head_name', $customHead)->latest('id')->first();
    expect($batch)->not->toBeNull();

    // Verify PDF generation succeeds and outputs PDF
    $pdfResponse = $this->actingAs($this->user)->get("/pdf/reminders/university/{$batch->id}");
    $pdfResponse->assertOk();
    expect($pdfResponse->headers->get('content-type'))->toBe('application/pdf');
});

test('staff can update university, academic year, and course on an existing reminder batch', function () {
    $batch = UniversityReminderBatch::create([
        'academic_year' => '2019-2020',
        'university_name' => "SNDT Women's University",
        'admission_taken_in' => 'MA Part I',
        'head_name' => 'Controller of Examination',
        'created_by' => 'officer_rem',
    ]);

    $note = UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $this->student1->id,
        'note_text' => '1st Reminder Notice',
        'note_date' => '2026-10-28',
        'created_by' => 'officer_rem',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->post('/reminders/university/process/save', [
        'batch_id' => $batch->id,
        'academic_year' => '2022-2023',
        'university_name' => 'University of Pune',
        'admission_taken_in' => 'M.Com Part II',
        'head_name' => 'The Registrar Pune',
        'dated' => '2026-10-28',
        'students' => [
            [
                'student_id' => $this->student1->id,
                'next_reminder_note' => null,
            ],
        ],
    ]);

    $response->assertRedirect();
    $batch->refresh();
    expect($batch->academic_year)->toBe('2022-2023');
    expect($batch->university_name)->toBe('University of Pune');
    expect($batch->admission_taken_in)->toBe('M.Com Part II');
    expect($batch->head_name)->toBe('The Registrar Pune');

    // Ensure no 2nd reminder was created
    expect(UniversityReminderNote::where('batch_id', $batch->id)->count())->toBe(1);
});

test('updating existing batch without next_reminder_note only updates existing notes without creating next note', function () {
    $batch = UniversityReminderBatch::create([
        'academic_year' => '2022-2023',
        'university_name' => "SNDT Women's University",
        'admission_taken_in' => 'S.Y.B.Com',
        'head_name' => 'The Controller of Examinations',
        'created_by' => 'officer_rem',
    ]);

    $note = UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $this->student1->id,
        'note_text' => '1st Reminder Notice (With Typo)',
        'note_date' => '2026-10-28',
        'created_by' => 'officer_rem',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->post('/reminders/university/process/save', [
        'batch_id' => $batch->id,
        'academic_year' => '2022-2023',
        'university_name' => "SNDT Women's University",
        'admission_taken_in' => 'S.Y.B.Com',
        'head_name' => 'The Controller of Examinations Updated',
        'dated' => '2026-10-28',
        'students' => [
            [
                'student_id' => $this->student1->id,
                'next_reminder_note' => '',
                'edited_notes' => [
                    [
                        'id' => $note->id,
                        'slot' => 1,
                        'note_text' => '1st Reminder Notice (Typo Corrected)',
                        'note_date' => '2026-10-28',
                    ],
                ],
            ],
        ],
    ]);

    $response->assertRedirect();

    // Verify existing note was updated
    $note->refresh();
    expect($note->note_text)->toBe('1st Reminder Notice (Typo Corrected)');

    // Verify NO second reminder note was created
    expect(UniversityReminderNote::where('batch_id', $batch->id)->count())->toBe(1);
});

test('staff can delete an individual reminder note', function () {
    $batch = UniversityReminderBatch::create([
        'academic_year' => '2022-2023',
        'university_name' => "SNDT Women's University",
        'head_name' => 'The Controller',
        'created_by' => 'officer_rem',
    ]);

    $note1 = UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $this->student1->id,
        'note_text' => '1st Reminder Notice',
        'note_date' => '2026-10-28',
        'created_by' => 'officer_rem',
        'created_at' => now(),
    ]);

    $note2 = UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $this->student1->id,
        'note_text' => '2nd Reminder Notice',
        'note_date' => '2026-10-28',
        'created_by' => 'officer_rem',
        'created_at' => now(),
    ]);

    expect(UniversityReminderNote::where('batch_id', $batch->id)->count())->toBe(2);

    $response = $this->actingAs($this->user)->deleteJson("/reminders/university/notes/{$note2->id}");
    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'message' => 'Reminder note deleted successfully.',
    ]);

    // Note 2 should be gone, Note 1 remains
    expect(UniversityReminderNote::find($note2->id))->toBeNull();
    expect(UniversityReminderNote::find($note1->id))->not->toBeNull();
    expect(UniversityReminderNote::where('batch_id', $batch->id)->count())->toBe(1);
});

test('staff can delete an entire reminder batch from history', function () {
    $batch = UniversityReminderBatch::create([
        'academic_year' => '2022-2023',
        'university_name' => "SNDT Women's University",
        'head_name' => 'The Controller',
        'created_by' => 'officer_rem',
    ]);

    $note = UniversityReminderNote::create([
        'batch_id' => $batch->id,
        'student_id' => $this->student1->id,
        'note_text' => '1st Reminder Notice',
        'note_date' => '2026-10-28',
        'created_by' => 'officer_rem',
        'created_at' => now(),
    ]);

    $response = $this->actingAs($this->user)->delete("/reminders/university/batches/{$batch->id}");
    $response->assertRedirect(route('reminders.university.history'));

    // Batch and its notes must be deleted
    expect(UniversityReminderBatch::find($batch->id))->toBeNull();
    expect(UniversityReminderNote::where('batch_id', $batch->id)->count())->toBe(0);
});

