<?php

use App\Models\ConfStudData;
use App\Models\StudentDetail;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use PhpOffice\PhpSpreadsheet\IOFactory;

beforeEach(function () {
    $this->user = User::create([
        'username' => 'confirm_staff',
        'full_name' => 'Confirmation Staff',
        'password' => Hash::make('secret123'),
        'role' => 'admin',
        'is_active' => true,
    ]);

    $this->student = StudentDetail::create([
        'array_space' => '778899',
        'to_name' => 'Registrar',
        'clg_add' => 'University of Delhi',
        'admission_taken_year' => '2026-2027',
        'admission_taken_in' => 'F.Y.B.Com',
        'student_name' => 'Anil Kapoor',
        'eligibility_case_no' => 'CASE-2026/0055',
        'en_time' => now(),
    ]);
});

test('user can view confirmations page with select2 university options and fee details', function () {
    \App\Models\CollegeDetail::create([
        'Name' => 'University of Delhi',
        'Address' => 'University of Delhi, Delhi',
        'fees' => '250',
        'is_active' => true,
    ]);

    $response = $this->actingAs($this->user)->get(route('confirmations.index'));
    $response->assertOk();

    $page = $response->original->getData()['page'];
    expect($page['props']['universities'])->toBeArray();
    expect($page['props']['filters'])->toHaveKey('university');

    $firstStudent = $page['props']['students']['data'][0] ?? null;
    expect($firstStudent)->not->toBeNull();
    expect($firstStudent['university_name'])->toBe('University of Delhi');
    expect($firstStudent['fees'])->toBe('250');
});

test('user can filter confirmations by university', function () {
    $response = $this->actingAs($this->user)->get(route('confirmations.index', [
        'university' => 'University of Delhi',
    ]));
    $response->assertOk();

    $page = $response->original->getData()['page'];
    expect(count($page['props']['students']['data']))->toBeGreaterThanOrEqual(1);

    $noMatchResponse = $this->actingAs($this->user)->get(route('confirmations.index', [
        'university' => 'NonExistent University 9999',
    ]));
    $noMatchResponse->assertOk();
    $noMatchPage = $noMatchResponse->original->getData()['page'];
    expect(count($noMatchPage['props']['students']['data']))->toBe(0);
});

test('user can filter confirmations by case_no and student_name', function () {
    $response = $this->actingAs($this->user)->get(route('confirmations.index', [
        'case_no' => 'CASE-2026/0055',
    ]));
    $response->assertOk();
    $page = $response->original->getData()['page'];
    expect(count($page['props']['students']['data']))->toBe(1);
    expect($page['props']['students']['data'][0]['eligibility_case_no'])->toBe('CASE-2026/0055');

    $nameResponse = $this->actingAs($this->user)->get(route('confirmations.index', [
        'student_name' => 'Anil Kapoor',
    ]));
    $nameResponse->assertOk();
    $namePage = $nameResponse->original->getData()['page'];
    expect(count($namePage['props']['students']['data']))->toBe(1);
    expect($namePage['props']['students']['data'][0]['student_name'])->toBe('Anil Kapoor');

    $noMatch = $this->actingAs($this->user)->get(route('confirmations.index', [
        'case_no' => 'NON-EXISTENT-CASE-1234',
    ]));
    $noMatch->assertOk();
    $noMatchPage = $noMatch->original->getData()['page'];
    expect(count($noMatchPage['props']['students']['data']))->toBe(0);
});

test('user can store a confirmation record with the eligibility checklist', function () {
    $payload = [
        'student_ids' => [$this->student->id],
        'checklist' => [
            $this->student->id => [
                'mig_tc' => 'Yes',
                'p_degree' => 'Yes',
                's_marks' => 'Yes',
                'letter_no_date' => 'LT/2026/99',
                'remark' => 'Verified OK',
                'conf_from' => 'Ranade Bhavan',
                'conf_from_text' => '',
                'conf_from_select' => 'old',
                'etc_data' => 'Gazette',
            ],
        ],
    ];

    $response = $this->actingAs($this->user)->postJson(route('confirmations.store'), $payload);

    $response->assertOk();
    $response->assertJsonFragment([
        'status' => 'success',
        'count' => 1,
    ]);

    $this->assertDatabaseHas('conf_stud_data', [
        'student_id' => $this->student->id,
        'case_no' => 'CASE-2026/0055',
        'mig_TC' => 'Yes',
        'p_degree' => 'Yes',
        's_marks' => 'Yes',
        'conf_from' => 'Ranade Bhavan',
        'conf_from_select' => 'old',
        'etc_data' => 'Gazette',
    ]);
});

test('clarification fields are only kept when Migration/TC is Yes, and only whitelisted values are accepted', function () {
    $payload = [
        'student_ids' => [$this->student->id],
        'checklist' => [
            $this->student->id => [
                'mig_tc' => 'No',
                'p_degree' => 'Yes',
                's_marks' => 'Yes',
                'conf_from' => 'Ranade Bhavan',
                'conf_from_select' => 'old',
                'etc_data' => 'Gazette',
            ],
        ],
    ];

    $this->actingAs($this->user)->postJson(route('confirmations.store'), $payload)->assertOk();

    $this->assertDatabaseHas('conf_stud_data', [
        'student_id' => $this->student->id,
        'mig_TC' => 'No',
        'conf_from' => '',
        'conf_from_select' => '',
        'etc_data' => '',
    ]);
});

test('an invalid clarification option value is silently rejected rather than stored', function () {
    $payload = [
        'student_ids' => [$this->student->id],
        'checklist' => [
            $this->student->id => [
                'mig_tc' => 'Yes',
                'conf_from' => 'not-a-real-option',
                'conf_from_select' => 'also-invalid',
                'etc_data' => 'invalid-too',
            ],
        ],
    ];

    $this->actingAs($this->user)->postJson(route('confirmations.store'), $payload)->assertOk();

    $this->assertDatabaseHas('conf_stud_data', [
        'student_id' => $this->student->id,
        'conf_from' => '',
        'conf_from_select' => '',
        'etc_data' => '',
    ]);
});

test('user can view confirmation history and batch detail', function () {
    $conf = ConfStudData::create([
        'student_id' => $this->student->id,
        'case_no' => 'CASE-2026/0055',
        'name' => 'Anil Kapoor',
        'stream' => 'F.Y.B.Com',
        'uni_add' => 'University of Delhi',
        'mig_TC' => 'Yes',
        'p_degree' => 'Yes',
        's_marks' => 'Yes',
        'array_space' => '889900',
        'en_time' => now(),
        'en_by' => 'confirm_staff',
        'dd_no' => 'DD111222',
    ]);

    $historyResponse = $this->actingAs($this->user)->get(route('confirmations.history'));
    $historyResponse->assertOk();

    $detailResponse = $this->actingAs($this->user)->get(route('confirmations.batch.detail', ['arraySpace' => '889900']));
    $detailResponse->assertOk();
});

test('pending list export includes students with no confirmation record yet', function () {
    StudentDetail::create([
        'array_space' => 'test_pending_1',
        'student_name' => 'Pending Student',
        'admission_taken_year' => '2025-26',
        'admission_taken_in' => 'BA',
        'clg_add' => 'University of Mumbai',
        'eligibility_case_no' => 'CASE-0001',
    ]);

    $response = $this->actingAs($this->user)->get('/confirmations/export');
    $response->assertOk();

    $tmpFile = tempnam(sys_get_temp_dir(), 'xlsx');
    file_put_contents($tmpFile, $response->streamedContent());
    $spreadsheet = IOFactory::load($tmpFile);
    $sheet = $spreadsheet->getActiveSheet();
    $values = [];
    foreach ($sheet->getRowIterator() as $row) {
        foreach ($row->getCellIterator() as $cell) {
            $values[] = (string) $cell->getValue();
        }
    }
    unlink($tmpFile);

    expect($values)->toContain('Pending Student');
});

test('export shows Confirmed status for a candidate with a confirmation record and Pending otherwise', function () {
    ConfStudData::create([
        'student_id' => $this->student->id,
        'case_no' => $this->student->eligibility_case_no,
        'name' => $this->student->student_name,
        'stream' => $this->student->admission_taken_in,
        'uni_add' => $this->student->clg_add,
        'mig_TC' => 'Yes',
        'p_degree' => 'No',
        's_marks' => 'Yes',
        'array_space' => 'status_export_batch',
        'en_time' => now(),
        'en_by' => 'confirm_staff',
    ]);

    $pendingStudent = StudentDetail::create([
        'array_space' => 'status_export_pending',
        'student_name' => 'Not Yet Confirmed',
        'admission_taken_year' => '2026-2027',
        'admission_taken_in' => 'F.Y.B.Com',
        'clg_add' => 'University of Delhi',
        'eligibility_case_no' => 'CASE-2026/0099',
    ]);

    $response = $this->actingAs($this->user)->get('/confirmations/export');
    $response->assertOk();

    $tmpFile = tempnam(sys_get_temp_dir(), 'xlsx');
    file_put_contents($tmpFile, $response->streamedContent());
    $spreadsheet = IOFactory::load($tmpFile);
    $sheet = $spreadsheet->getActiveSheet();
    $rows = $sheet->toArray();
    unlink($tmpFile);

    $headerRow = $rows[0];
    $statusColumn = array_search('Status', $headerRow, true);
    $caseNoColumn = array_search('Case No.', $headerRow, true);

    expect($statusColumn)->not->toBeFalse();

    $confirmedRow = collect($rows)->first(fn ($row) => $row[$caseNoColumn] === $this->student->eligibility_case_no);
    $pendingRow = collect($rows)->first(fn ($row) => $row[$caseNoColumn] === $pendingStudent->eligibility_case_no);

    expect($confirmedRow[$statusColumn])->toBe('Confirmed');
    expect($pendingRow[$statusColumn])->toBe('Pending');
});

test('user can delete a confirmation record', function () {
    $conf = ConfStudData::create([
        'student_id' => $this->student->id,
        'case_no' => 'CASE-2026/0055',
        'name' => 'Anil Kapoor',
        'stream' => 'F.Y.B.Com',
        'uni_add' => 'University of Delhi',
        'mig_TC' => 'Yes',
        'p_degree' => 'Yes',
        's_marks' => 'Yes',
        'array_space' => '889900',
        'en_time' => now(),
        'en_by' => 'confirm_staff',
    ]);

    $response = $this->actingAs($this->user)->deleteJson(route('confirmations.destroy', ['id' => $conf->id]));
    $response->assertOk();

    $this->assertDatabaseMissing('conf_stud_data', [
        'id' => $conf->id,
    ]);
});

test('confirmation eligibility letter renders No. CDOE/Eligib, Center For Distance and Online Education (CDOE), and clean university name', function () {
    \App\Models\CollegeDetail::create([
        'Name' => 'Yashwantrao Chavan Maharashtra Open University',
        'Address' => 'Dnyngangotri, Near Gangapur Dam, Nashik-422 222 <br>Phone: - (0253) - 2230734',
        'fees' => '400',
        'is_active' => true,
    ]);

    $student = StudentDetail::create([
        'array_space' => '998877',
        'to_name' => 'The Controller of Examinations',
        'clg_add' => 'Dnyngangotri, Near Gangapur Dam, Nashik-422 222 <br>Phone: - (0253) - 2230734',
        'admission_taken_year' => '2026-2027',
        'admission_taken_in' => 'MCA - I',
        'student_name' => 'Test Student Name',
        'eligibility_case_no' => 'CASE-2026/9999',
        'en_time' => now(),
    ]);

    ConfStudData::create([
        'student_id' => $student->id,
        'case_no' => 'CASE-2026/9999',
        'name' => (string) $student->id,
        'stream' => 'MCA - I',
        'uni_add' => 'Yashwantrao Chavan Maharashtra Open University Dnyngangotri, Near Gangapur Dam, Nashik-422 222 <br>Phone: - (0253) - 2230734',
        'mig_TC' => 'Yes',
        'p_degree' => 'Yes',
        's_marks' => 'Yes',
        'array_space' => '998877',
        'en_time' => now(),
        'en_by' => 'confirm_staff',
    ]);

    $response = $this->actingAs($this->user)->get(route('pdf.confirmation', ['arraySpace' => '998877']));
    $response->assertOk();

    // Verify blade view render data
    $records = ConfStudData::where('array_space', '998877')->get();
    $ctrl = app(\App\Http\Controllers\PdfController::class);
    foreach ($records as $r) {
        $resolved = $ctrl->resolveUniversityAndAddress($r->uni_add);
        $displayUni = $resolved['university_name'] ?? '';
        expect($displayUni)->toBe('Yashwantrao Chavan Maharashtra Open University');
        expect($displayUni)->not->toContain('<br>');
        expect($displayUni)->not->toContain('Phone:');
        expect($displayUni)->not->toContain('Dnyngangotri');
    }

    $bladeView = view('pdf.confirmation_eligibility_letter', [
        'records' => $records,
        'arraySpace' => '998877',
        'currentTime' => time(),
        'first' => $records->first(),
        'count' => 1,
        'date' => date('d/m/Y'),
        'subject' => 'Confirmation of Eligibility',
        'body' => 'Eligibility body text',
    ])->render();

    expect($bladeView)->toContain('No. CDOE/Eligib/');
    expect($bladeView)->toContain('Center For Distance and Online Education (CDOE)');
    expect($bladeView)->not->toContain('No. IDOL/Eligib/');
    expect($bladeView)->not->toContain('Institute of Distance and Open Learning (IDOL)');
    expect($bladeView)->toContain('Yashwantrao Chavan Maharashtra Open University');
    expect($bladeView)->not->toContain('<br>Phone: - (0253) - 2230734');
});
