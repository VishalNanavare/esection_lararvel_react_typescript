<?php

use App\Models\Regularization;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->user = User::create([
        'username' => 'staff_reg_user',
        'full_name' => 'Regularization Officer',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
});

test('guests are redirected from regularization page to login', function () {
    $response = $this->get('/regularization');
    $response->assertRedirect('/login');
});

test('authenticated staff can view regularization form', function () {
    $response = $this->actingAs($this->user)->get('/regularization');
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('Regularization/Index'));
});

test('can store regularization letter', function () {
    $response = $this->actingAs($this->user)->post('/regularization', [
        'student_name' => 'Priya Sharma',
        'gender' => 'Kum.',
        'eligibility_case_no' => '501/2026',
        'admission_letter_for' => 'The Controller of Examinations',
        'admission_letter_date' => '2026-09-01',
        'admission_taken_year' => '2025-2026',
        'admission_taken_in' => 'F.Y.B.Com',
        'university_name' => 'Savitribai Phule Pune University',
        'passing_course' => 'H.S.C.',
    ]);

    $response->assertRedirect('/regularization/history');
    $this->assertDatabaseHas('regularizations', [
        'student_name' => 'Priya Sharma',
        'eligibility_case_no' => '501/2026',
        'university_name' => 'Savitribai Phule Pune University',
    ]);
});

test('can view regularization history and filter records', function () {
    Regularization::create([
        'gender' => 'Mr.',
        'student_name' => 'Nikhil Kulkarni',
        'eligibility_case_no' => '999/2026',
        'admission_taken_in' => 'M.Com',
        'admission_taken_year' => '2025-2026',
        'university_name' => 'Mumbai University',
        'created_by' => 'staff_reg_user',
    ]);

    $response = $this->actingAs($this->user)->get('/regularization/history?name=Nikhil');
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Regularization/History')
        ->has('records')
        ->has('filters')
    );
});

test('can delete regularization record', function () {
    $record = Regularization::create([
        'student_name' => 'To Be Deleted',
        'created_by' => 'staff',
    ]);

    $response = $this->actingAs($this->user)->delete("/regularization/{$record->id}");
    $response->assertRedirect();
    $this->assertDatabaseMissing('regularizations', ['id' => $record->id]);
});
