<?php

namespace App\Http\Controllers\Concerns;

trait SanitizesSpreadsheetCells
{
    /**
     * Neutralizes formula/CSV injection (CWE-1236): a cell value starting
     * with =, +, -, or @ is interpreted as a formula by Excel/LibreOffice
     * on open, and PhpSpreadsheet's own DefaultValueBinder auto-detects a
     * leading '=' and stores the cell as an actual FORMULA type. Prefixing
     * such values with a single quote is the standard mitigation (OWASP's
     * CSV Injection cheat sheet): it stops the value from ever being
     * classified as a formula, in both a plain CSV opened in Excel and an
     * .xlsx cell written via PhpSpreadsheet.
     */
    private function sanitizeCell(mixed $value): mixed
    {
        if (! is_string($value) || $value === '') {
            return $value;
        }

        if (in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'".$value;
        }

        return $value;
    }

    /**
     * Applies sanitizeCell() to every value in one flat export row.
     *
     * @param  array<int|string, mixed>  $row
     * @return array<int|string, mixed>
     */
    private function sanitizeRow(array $row): array
    {
        return array_map($this->sanitizeCell(...), $row);
    }
}
