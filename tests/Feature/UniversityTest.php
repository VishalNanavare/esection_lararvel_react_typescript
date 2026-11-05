<?php

use App\Models\CollegeDetail;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->user = User::create([
        'username' => 'staff_uni_user',
        'full_name' => 'University Manager',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);
});

test('guests are redirected from universities page to login', function () {
    $response = $this->get('/universities');
    $response->assertRedirect('/login');
});

test('authenticated staff can view universities directory', function () {
    CollegeDetail::create([
        'Name' => 'Test Shivaji University',
        'States' => 'Maharashtra',
        'head_name' => 'The Controller of Examinations',
        'fees' => 500,
        'in_favour_of' => 'Finance Officer',
        'Address' => 'Vidyanagar, Kolhapur',
        'email_id' => 'info@unishivaji.ac.in',
        'mobile_no' => '9876543210',
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)->get('/universities');

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Universities/Index')
        ->has('colleges')
        ->has('states')
        ->has('filters')
    );
});

test('can filter universities by name and state', function () {
    CollegeDetail::create([
        'Name' => 'Pune University Alpha',
        'States' => 'Maharashtra',
        'is_active' => true,
    ]);

    CollegeDetail::create([
        'Name' => 'Delhi Technological University',
        'States' => 'Delhi',
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)->get('/universities?name=Pune&state=Maharashtra');
    $response->assertOk();
});

test('can store a new university record', function () {
    $response = $this->actingAs($this->user)->post('/universities', [
        'name' => 'Goa University New Campus',
        'state' => 'Goa',
        'head_name' => 'The Registrar',
        'fees' => 600,
        'in_favour_of' => 'Registrar, Goa University',
        'address' => 'Taleigao Plateau, Goa',
        'email_id' => 'registrar@unigoa.ac.in',
        'mobile_no' => '9988776655',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('college_details', [
        'Name' => 'Goa University New Campus',
        'States' => 'Goa',
        'fees' => 600,
    ]);
});

test('can update an existing university record', function () {
    $college = CollegeDetail::create([
        'Name' => 'Initial Name University',
        'States' => 'Gujarat',
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)->put("/universities/{$college->id}", [
        'name' => 'Updated Name University',
        'state' => 'Gujarat',
        'head_name' => 'The Controller',
        'fees' => 750,
        'in_favour_of' => 'Finance Dept',
        'address' => 'Ahmedabad',
        'email_id' => 'admin@updated.ac.in',
        'mobile_no' => '9111222333',
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('college_details', [
        'id' => $college->id,
        'Name' => 'Updated Name University',
        'fees' => 750,
    ]);
});

test('can toggle active and inactive status of university', function () {
    $college = CollegeDetail::create([
        'Name' => 'Status Toggle University',
        'States' => 'Punjab',
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)->post("/universities/{$college->id}/toggle");
    $response->assertRedirect();

    $college->refresh();
    expect($college->is_active)->toBeFalse();

    $response2 = $this->actingAs($this->user)->post("/universities/{$college->id}/toggle");
    $response2->assertRedirect();

    $college->refresh();
    expect($college->is_active)->toBeTrue();
});

test('can export universities directory to csv', function () {
    CollegeDetail::create([
        'Name' => 'Export University Test',
        'States' => 'Kerala',
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)->get('/universities/export');
    $response->assertOk();
    $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
});

test('can store and update multi-line university name and multi-line address from textarea', function () {
    $multiLineName = "PRESTIGE INSTITUTE OF MANAGEMENT AND RESEARCH, INDORE\n(affiliated with the Devi Ahilya University)";
    $multiLineAddress = "Scheme No:74 C, Vijay Nagar,\nIndore, 452 010\n(M.P) India ,\nPH-7869999297";

    $response = $this->actingAs($this->user)->post('/universities', [
        'name' => $multiLineName,
        'state' => 'Madhya Pradesh',
        'head_name' => 'The Controller of Examinations',
        'fees' => 0,
        'in_favour_of' => '',
        'address' => $multiLineAddress,
        'email_id' => '',
        'mobile_no' => '',
    ]);

    $response->assertRedirect();
    $created = CollegeDetail::where('States', 'Madhya Pradesh')
        ->where('Name', 'like', '%PRESTIGE INSTITUTE%')
        ->first();

    expect($created)->not->toBeNull();
    expect($created->Name)->toContain("PRESTIGE INSTITUTE OF MANAGEMENT AND RESEARCH, INDORE\n(affiliated with the Devi Ahilya University)");
    expect($created->Address)->toContain("Scheme No:74 C, Vijay Nagar,\nIndore, 452 010\n(M.P) India ,\nPH-7869999297");

    // Test updating the multi-line name and address
    $updatedName = "PRESTIGE INSTITUTE OF MANAGEMENT AND RESEARCH, INDORE (AUTONOMOUS)\n(affiliated with the Devi Ahilya University)";
    $updatedAddress = "Scheme No:74 C, Vijay Nagar,\nIndore, 452 010 (M.P) India\nPH-7869999297";

    $updateResp = $this->actingAs($this->user)->put("/universities/{$created->id}", [
        'name' => $updatedName,
        'state' => 'Madhya Pradesh',
        'head_name' => 'The Controller of Examinations',
        'fees' => 100,
        'in_favour_of' => 'Director, PIMR',
        'address' => $updatedAddress,
        'email_id' => '',
        'mobile_no' => '',
    ]);

    $updateResp->assertRedirect();
    $created->refresh();

    expect($created->Name)->toBe($updatedName);
    expect($created->Address)->toBe($updatedAddress);

    // Verify resolveUniversityAndAddress resolves multi-line outputs faithfully
    $pdfCtrl = new \App\Http\Controllers\PdfController();
    $resolved = $pdfCtrl->resolveUniversityAndAddress((string) $created->id, $created->head_name);

    expect($resolved['university_name'])->toBe($updatedName);
    expect($resolved['address'])->toBe("Scheme No:74 C, Vijay Nagar,\nIndore, 452 010 (M.P) India\nPH- 7869999297");
});
