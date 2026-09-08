<?php

use App\Models\AcademicYear;
use App\Models\CollegeDetail;
use App\Models\StreamDetail;
use App\Models\StudentDetail;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->user = User::create([
        'username' => 'staff_user',
        'full_name' => 'Staff Tester',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);

    CollegeDetail::create([
        'Name' => 'University of Mumbai',
        'States' => 'Maharashtra',
        'Address' => 'Fort, Mumbai, 400032',
        'fees' => '500',
        'head_name' => 'The Controller of Examinations',
        'in_favour_of' => 'The Finance and Accounts Officer',
        'is_active' => true,
    ]);

    StreamDetail::create([
        'Division' => 'F.Y.B.Com',
        'Name' => 'Bachelor of Commerce First Year',
    ]);

    AcademicYear::create([
        'year_label' => '2026-2027',
        'is_current' => true,
    ]);
});

test('user can view the new student form', function () {
    $response = $this->actingAs($this->user)->get(route('students.new'));
    $response->assertOk();
});

test('user can get next case number via API', function () {
    $response = $this->actingAs($this->user)->get(route('api.next.case.no'));
    $response->assertOk();
    $response->assertJsonStructure(['case_no', 'next_id']);
});

test('user can store a candidate verification batch', function () {
    $payload = [
        'to_name' => 'The Controller of Examinations',
        'clg_add' => 'University of Mumbai, Fort, Mumbai',
        'admission_taken_year' => '2026-2027',
        'admission_taken_in' => 'F.Y.B.Com',
        'in_favour_of' => 'The Finance and Accounts Officer',
        'students' => [
            [
                'student_name' => 'Rajesh Kumar',
                'student_nee_name' => '',
                'eligibility_case_no' => 'CASE-2026/0001',
                'verification_of_marksheet_done_by_you' => 'Marksheet Verification',
                'email' => 'rajesh@example.com',
            ],
            [
                'student_name' => 'Pooja Patil',
                'student_nee_name' => 'Pooja Kulkarni',
                'eligibility_case_no' => 'CASE-2026/0002',
                'verification_of_marksheet_done_by_you' => 'Degree Verification',
                'email' => 'pooja@example.com',
            ],
        ],
    ];

    $response = $this->actingAs($this->user)->postJson(route('students.batch.store'), $payload);

    $response->assertOk();
    $response->assertJsonFragment([
        'status' => 'success',
        'count' => 2,
    ]);

    $this->assertDatabaseHas('student_details', [
        'student_name' => 'Rajesh Kumar',
        'eligibility_case_no' => 'CASE-2026/0001',
    ]);

    $this->assertDatabaseHas('student_details', [
        'student_name' => 'Pooja Patil',
        'student_nee_name' => 'Pooja Kulkarni',
    ]);
});

test('user can view batch history and batch details', function () {
    $student = StudentDetail::create([
        'array_space' => '998877',
        'to_name' => 'Registrar',
        'clg_add' => 'Pune University',
        'admission_taken_year' => '2026-2027',
        'admission_taken_in' => 'F.Y.B.Com',
        'student_name' => 'Amit Shah',
        'eligibility_case_no' => 'CASE-2026/0010',
        'en_time' => now(),
    ]);

    $historyResponse = $this->actingAs($this->user)->get(route('students.history'));
    $historyResponse->assertOk();

    $detailResponse = $this->actingAs($this->user)->get(route('students.batch.detail', ['arraySpace' => '998877']));
    $detailResponse->assertOk();
});

test('user can update a candidate record', function () {
    $student = StudentDetail::create([
        'array_space' => '112233',
        'to_name' => 'Registrar',
        'clg_add' => 'Delhi University',
        'admission_taken_year' => '2026-2027',
        'admission_taken_in' => 'F.Y.B.Com',
        'student_name' => 'Sunil Verma',
        'eligibility_case_no' => 'CASE-2026/0020',
        'en_time' => now(),
    ]);

    $response = $this->actingAs($this->user)->putJson(route('students.update', ['id' => $student->id]), [
        'student_name' => 'Sunil Kumar Verma',
        'student_nee_name' => '',
        'eligibility_case_no' => 'CASE-2026/0020-REV',
        'verification_of_marksheet_done_by_you' => 'Verified',
        'email' => 'sunil@example.com',
    ]);

    $response->assertOk();
    $this->assertDatabaseHas('student_details', [
        'id' => $student->id,
        'student_name' => 'Sunil Kumar Verma',
        'eligibility_case_no' => 'CASE-2026/0020-REV',
    ]);
});

test('user can delete a candidate record', function () {
    $student = StudentDetail::create([
        'array_space' => '445566',
        'to_name' => 'Registrar',
        'clg_add' => 'Calcutta University',
        'admission_taken_year' => '2026-2027',
        'admission_taken_in' => 'F.Y.B.Com',
        'student_name' => 'Deepak Roy',
        'eligibility_case_no' => 'CASE-2026/0030',
        'en_time' => now(),
    ]);

    $response = $this->actingAs($this->user)->deleteJson(route('students.destroy', ['id' => $student->id]));
    $response->assertOk();

    $this->assertDatabaseMissing('student_details', [
        'id' => $student->id,
    ]);
});
