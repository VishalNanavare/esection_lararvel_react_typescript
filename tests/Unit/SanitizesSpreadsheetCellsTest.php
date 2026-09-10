<?php

use App\Http\Controllers\Concerns\SanitizesSpreadsheetCells;

beforeEach(function () {
    $this->sanitizer = new class
    {
        use SanitizesSpreadsheetCells;

        public function row(array $row): array
        {
            return $this->sanitizeRow($row);
        }
    };
});

test('values starting with formula-trigger characters are prefixed with a single quote', function (string $dangerous) {
    expect($this->sanitizer->row([$dangerous]))->toBe(["'".$dangerous]);
})->with([
    '=cmd|\'/c calc\'!A1',
    '+1+1',
    '-1+1',
    '@SUM(A1:A2)',
    "\ttabbed",
    "\rcarriage",
]);

test('ordinary values pass through unchanged', function () {
    $row = ['Regular Name', 'CASE-0001', 42, null, ''];

    expect($this->sanitizer->row($row))->toBe($row);
});

test('a value with a formula character not in the first position is left untouched', function () {
    expect($this->sanitizer->row(['Smith=Jones']))->toBe(['Smith=Jones']);
});
