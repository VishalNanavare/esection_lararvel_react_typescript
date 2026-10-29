<?php

use App\Models\CollegeDetail;
use App\Models\ConfStudData;
use App\Models\Regularization;
use App\Models\StudentDetail;
use App\Models\StudentReminder;
use App\Models\UniversityReminderBatch;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->user = User::create([
        'username' => 'letter_test_admin_' . uniqid(),
        'full_name' => 'Letter Admin',
        'password' => Hash::make('password123'),
        'role' => 'admin',
        'is_active' => true,
    ]);

    $this->college = CollegeDetail::create([
        'Name' => 'University of Mumbai Test ' . uniqid(),
        'States' => 'Maharashtra',
        'Address' => 'Fort, Mumbai, 400032',
        'fees' => '500',
        'is_active' => true,
    ]);
});

test('can update letter details on student batch (DD View)', function () {
    $arraySpace = 'TEST_DD_BATCH_' . uniqid();
    StudentDetail::create([
        'student_name' => 'DD Student One',
        'array_space' => $arraySpace,
        'clg_add' => $this->college->Name,
        'to_name' => 'The Registrar',
        'admission_taken_in' => 'F.Y.B.A.',
        'admission_taken_year' => '2026-2027',
    ]);

    $response = $this->actingAs($this->user)->putJson("/students/batches/{$arraySpace}", [
        'letter_no' => 'OUT/IDOL/2026/089',
        'letter_date' => '2026-10-29',
        'remarks' => 'Sent via speed post to exam section',
    ]);

    $response->assertOk();
    $response->assertJson([
        'status' => 'success',
        'array_space' => $arraySpace,
    ]);

    $this->assertDatabaseHas('student_details', [
        'array_space' => $arraySpace,
        'letter_no' => 'OUT/IDOL/2026/089',
        'remarks' => 'Sent via speed post to exam section',
    ]);

    $updated = StudentDetail::where('array_space', $arraySpace)->first();
    expect($updated->letter_date->format('Y-m-d'))->toBe('2026-10-29');
});

test('can update letter details on confirmation batch', function () {
    $arraySpace = 'TEST_CONF_BATCH_' . uniqid();
    ConfStudData::create([
        'name' => 'Conf Student One',
        'array_space' => $arraySpace,
        'uni_add' => $this->college->Name,
        'stream' => 'M.Com',
        'acd_year' => '2026-2027',
    ]);

    $response = $this->actingAs($this->user)->putJson("/confirmations/batches/{$arraySpace}", [
        'letter_no' => 'CONF/2026/112',
        'letter_date' => '2026-10-29',
        'remarks' => 'Dispatched with original documents',
    ]);

    $response->assertOk();
    $response->assertJson([
        'status' => 'success',
        'array_space' => $arraySpace,
    ]);

    $this->assertDatabaseHas('conf_stud_data', [
        'array_space' => $arraySpace,
        'letter_no' => 'CONF/2026/112',
        'remarks' => 'Dispatched with original documents',
    ]);

    $updated = ConfStudData::where('array_space', $arraySpace)->first();
    expect($updated->letter_date->format('Y-m-d'))->toBe('2026-10-29');
});

test('can update letter details on regularization record', function () {
    $reg = Regularization::create([
        'student_name' => 'Regularization Student One',
        'gender' => 'Mr',
        'admission_letter_for' => 'Admission in MCA',
        'admission_letter_date' => '2026-10-25',
        'admission_taken_year' => '2026-2027',
        'admission_taken_in' => 'MCA Part 1',
        'university_name' => $this->college->Name,
        'passing_course' => 'B.Sc. IT',
    ]);

    $response = $this->actingAs($this->user)->putJson("/regularization/{$reg->id}", [
        'student_name' => 'Regularization Student One',
        'gender' => 'Mr',
        'admission_letter_for' => 'Admission in MCA',
        'admission_letter_date' => '2026-10-25',
        'admission_taken_year' => '2026-2027',
        'admission_taken_in' => 'MCA Part 1',
        'university_name' => $this->college->Name,
        'passing_course' => 'B.Sc. IT',
        'letter_no' => 'REG/IDOL/2026/543',
        'letter_date' => '2026-10-29',
        'remarks' => 'Handover given to candidate personally',
    ]);

    $response->assertOk();
    $this->assertDatabaseHas('regularizations', [
        'id' => $reg->id,
        'letter_no' => 'REG/IDOL/2026/543',
        'remarks' => 'Handover given to candidate personally',
    ]);

    expect($reg->fresh()->letter_date->format('Y-m-d'))->toBe('2026-10-29');
});

test('can update letter details on university reminder batch', function () {
    $batch = UniversityReminderBatch::create([
        'academic_year' => '2026-2027',
        'university_name' => $this->college->Name,
    ]);

    $response = $this->actingAs($this->user)->putJson("/reminders/university/batches/{$batch->id}", [
        'letter_no' => 'REM/UNIV/2026/007',
        'letter_date' => '2026-10-29',
        'remarks' => 'Urgent reminder dispatched via registered AD',
    ]);

    $response->assertOk();
    $response->assertJson([
        'status' => 'success',
        'batch' => [
            'id' => $batch->id,
            'letter_no' => 'REM/UNIV/2026/007',
        ],
    ]);

    $this->assertDatabaseHas('university_reminder_batches', [
        'id' => $batch->id,
        'letter_no' => 'REM/UNIV/2026/007',
        'remarks' => 'Urgent reminder dispatched via registered AD',
    ]);

    expect($batch->fresh()->letter_date->format('Y-m-d'))->toBe('2026-10-29');
});

test('can update letter details on student reminder record', function () {
    $reminder = StudentReminder::create([
        'student_name' => 'Candidate Student Reminder',
        'eligibility_case_no' => 'CASE/2026/999',
        'course_name' => 'M.Sc. Computer Science',
    ]);

    $response = $this->actingAs($this->user)->putJson("/reminders/student/{$reminder->id}", [
        'letter_no' => 'REM/STUD/2026/432',
        'letter_date' => '2026-10-29',
        'remarks' => 'Candidate informed via SMS and dispatched letter',
    ]);

    $response->assertOk();
    $response->assertJson([
        'status' => 'success',
        'record' => [
            'letter_no' => 'REM/STUD/2026/432',
            'remarks' => 'Candidate informed via SMS and dispatched letter',
        ],
    ]);

    $this->assertDatabaseHas('student_reminders', [
        'id' => $reminder->id,
        'letter_no' => 'REM/STUD/2026/432',
        'remarks' => 'Candidate informed via SMS and dispatched letter',
    ]);

    expect($reminder->fresh()->letter_date->format('Y-m-d'))->toBe('2026-10-29');
});
