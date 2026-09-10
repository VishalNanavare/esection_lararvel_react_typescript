<?php

use App\Models\ConfStudData;
use App\Models\Regularization;
use App\Models\Setting;
use App\Models\StudentDetail;
use App\Models\User;
use Illuminate\Http\UploadedFile;

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

test('deleting a confirmation record is blocked when the toggle is off', function () {
    Setting::set('feature_delete_enabled', '0', 'feature', $this->admin->id);

    $student = StudentDetail::create([
        'array_space' => 'toggle_test_conf_1',
        'student_name' => 'Confirmation Delete Me',
        'admission_taken_year' => '2025-26',
        'admission_taken_in' => 'BA',
        'clg_add' => 'University of Mumbai',
        'eligibility_case_no' => 'CASE-0004',
    ]);

    $confirmation = ConfStudData::create([
        'student_id' => $student->id,
        'case_no' => $student->eligibility_case_no,
        'name' => $student->student_name,
        'stream' => $student->admission_taken_in,
        'uni_add' => $student->clg_add,
        'mig_TC' => 'Yes',
        'p_degree' => 'Yes',
        's_marks' => 'Yes',
        'array_space' => 'toggle_conf_batch_1',
        'en_time' => now(),
        'en_by' => $this->admin->username,
    ]);

    $response = $this->actingAs($this->admin)->deleteJson(route('confirmations.destroy', ['id' => $confirmation->id]));

    $response->assertStatus(403);
    expect(ConfStudData::find($confirmation->id))->not->toBeNull();
});

test('exporting is blocked on every module when feature_export_enabled is off', function () {
    Setting::set('feature_export_enabled', '0', 'feature', $this->admin->id);

    $this->actingAs($this->admin)->get('/students/history/export')->assertStatus(403);
    $this->actingAs($this->admin)->get('/confirmations/export')->assertStatus(403);
    $this->actingAs($this->admin)->get('/regularization/export')->assertStatus(403);
    $this->actingAs($this->admin)->get('/reminders/student/export')->assertStatus(403);
    $this->actingAs($this->admin)->get('/reminders/university/export')->assertStatus(403);
    $this->actingAs($this->admin)->get('/reminders/university/history/export')->assertStatus(403);
    $this->actingAs($this->admin)->get('/universities/export')->assertStatus(403);
});

test('exporting succeeds on every module when feature_export_enabled is on (default)', function () {
    $this->actingAs($this->admin)->get('/students/history/export')->assertOk();
    $this->actingAs($this->admin)->get('/confirmations/export')->assertOk();
    $this->actingAs($this->admin)->get('/regularization/export')->assertOk();
    $this->actingAs($this->admin)->get('/reminders/student/export')->assertOk();
    $this->actingAs($this->admin)->get('/reminders/university/export')->assertOk();
    $this->actingAs($this->admin)->get('/reminders/university/history/export')->assertOk();
    $this->actingAs($this->admin)->get('/universities/export')->assertOk();
});

test('importing is blocked when feature_import_enabled is off', function () {
    Setting::set('feature_import_enabled', '0', 'feature', $this->admin->id);

    $this->actingAs($this->admin)->get('/students/import')->assertStatus(403);

    $file = UploadedFile::fake()->create('candidates.xlsx', 10);
    $this->actingAs($this->admin)
        ->post('/students/read-candidate-sheet', ['candidate_sheet' => $file])
        ->assertStatus(403);
});

test('importing succeeds when feature_import_enabled is on (default)', function () {
    $this->actingAs($this->admin)->get('/students/import')->assertOk();
});
