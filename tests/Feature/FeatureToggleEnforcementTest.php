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
