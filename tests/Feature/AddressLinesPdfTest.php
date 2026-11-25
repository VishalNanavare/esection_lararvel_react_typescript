<?php

use App\Http\Controllers\PdfController;
use App\Models\CollegeDetail;
use App\Models\StudentDetail;
use App\Models\User;

test('formatAddressLines preserves exact multi-line address entered by user in textarea', function () {
    $ctrl = app(PdfController::class);

    $input = "Paliwal Park, Park Rd, Agra,\nUttar Pradesh 282004,\nphone- ( 0562 ) 6544827";
    $formatted = $ctrl->formatAddressLines($input);

    expect($formatted)->toBe($input);

    $lines = explode("\n", $formatted);
    expect($lines)->toHaveCount(3);
    expect($lines[0])->toBe('Paliwal Park, Park Rd, Agra,');
    expect($lines[1])->toBe('Uttar Pradesh 282004,');
    expect($lines[2])->toBe('phone- ( 0562 ) 6544827');
});

test('formatAddressLines cleanly splits legacy long single-line postal address at commas', function () {
    $ctrl = app(PdfController::class);

    $legacy = 'Paliwal Park, Park Rd, Agra, Uttar Pradesh 282004.<br>phone-(0562) - 6544827';
    $formatted = $ctrl->formatAddressLines($legacy);

    $lines = explode("\n", $formatted);
    expect($lines)->toHaveCount(3);
    expect($lines[0])->toBe('Paliwal Park, Park Rd,');
    expect($lines[1])->toBe('Agra, Uttar Pradesh 282004.');
    expect($lines[2])->toBe('phone- (0562) - 6544827');
});

test('resolveUniversityAndAddress matches college by address core and outputs multi-line address', function () {
    CollegeDetail::create([
        'id' => 150,
        'Name' => 'Dr. Bhimrao Ambedkar University, Agra',
        'States' => 'Uttar Pradesh',
        'Address' => "Paliwal Park, Park Rd, Agra,\nUttar Pradesh 282004,\nphone- ( 0562 ) 6544827",
        'is_active' => true,
        'sel_data' => '1',
    ]);

    $ctrl = app(PdfController::class);

    $raw = 'Paliwal Park, Park Rd, Agra, Uttar Pradesh 282004.<br>phone-(0562) - 6544827';
    $resolved = $ctrl->resolveUniversityAndAddress($raw, 'Controller of Examinations');

    expect($resolved['university_name'])->toBe('Dr. Bhimrao Ambedkar University, Agra');
    expect($resolved['to_name'])->toBe('Controller of Examinations');
    expect($resolved['college'])->not->toBeNull();
    expect($resolved['college']->Name)->toBe('Dr. Bhimrao Ambedkar University, Agra');

    $addressLines = explode("\n", $resolved['address']);
    expect($addressLines)->toHaveCount(3);
    expect($addressLines[0])->toBe('Paliwal Park, Park Rd, Agra,');
    expect($addressLines[1])->toBe('Uttar Pradesh 282004,');
    expect($addressLines[2])->toBe('phone- ( 0562 ) 6544827');
});

test('dispatch pdf renders address on separate lines with nl2br', function () {
    $ctrl = app(PdfController::class);

    $firstRow = [
        'clg_add' => "Paliwal Park, Park Rd, Agra,\nUttar Pradesh 282004,\nphone- ( 0562 ) 6544827",
        'address' => "Paliwal Park, Park Rd, Agra,\nUttar Pradesh 282004,\nphone- ( 0562 ) 6544827",
        'university_name' => 'Dr. Bhimrao Ambedkar University, Agra',
        'to_name' => 'The Controller of Examinations',
        'in_favour_of' => '',
        'fees' => 0,
    ];

    $html = view('pdf.dispatch_letter', array_merge($ctrl->getInstituteSettings(), [
        'arraySpace' => 'test_addr_batch',
        'currentTime' => time(),
        'firstRow' => $firstRow,
        'students' => collect(),
        'fees' => 0,
        'totalFees' => 0,
        'academic_year' => '2026-2027',
        'date' => date('d/m/Y'),
    ]))->render();

    expect($html)->toContain('Paliwal Park, Park Rd, Agra,<br />');
    expect($html)->toContain('Uttar Pradesh 282004,<br />');
    expect($html)->toContain('phone- ( 0562 ) 6544827');
});
