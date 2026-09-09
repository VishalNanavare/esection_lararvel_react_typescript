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

test('user can view confirmations page', function () {
    $response = $this->actingAs($this->user)->get(route('confirmations.index'));
    $response->assertOk();
});

test('user can store a confirmation record', function () {
    $payload = [
        'student_ids' => [$this->student->id],
        'checklist' => [
            $this->student->id => [
                'mig_tc' => 'Yes',
                'p_degree' => 'Yes',
                's_marks' => 'Yes',
                'letter_no_date' => 'LT/2026/99',
                'remark' => 'Verified OK',
                'conf_from' => 'University',
                'conf_from_text' => '',
                'conf_from_select' => 'Migration Certificate Verification',
                'etc_data' => '',
            ],
        ],
        'dd_no' => 'DD888999',
        'dd_amount' => 500,
        'bank_name' => 'State Bank of India',
        'dd_date' => '2026-09-07',
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
        'dd_no' => 'DD888999',
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
