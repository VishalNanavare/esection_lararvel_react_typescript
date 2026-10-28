<?php

namespace App\Http\Controllers\Concerns;

use App\Models\CollegeDetail;

trait MatchesColleges
{
    /**
     * Build an indexing matcher for mapping student clg_add values to CollegeDetail records.
     *
     * @return array{0: \Illuminate\Database\Eloquent\Collection<int, CollegeDetail>, 1: \Closure(string|null): (?CollegeDetail)}
     */
    protected function buildCollegeMatcher(): array
    {
        $colleges = CollegeDetail::all();
        $addrMap = [];
        $nameMap = [];

        // Exclude dummy or punctuation-only college records like "-" and sort longest names first
        $validColleges = $colleges->filter(function ($col) {
            $name = trim((string) $col->Name, " ,\t\n\r\0\x0B");
            return $name !== '' && $name !== '-' && !preg_match('/^[\s\-–—\._,]+$/u', $name) && strlen($name) >= 3;
        })->sortByDesc(function ($col) {
            return strlen(trim((string) $col->Name));
        })->values();

        foreach ($validColleges as $col) {
            $cAddress = strtolower(trim(preg_replace('/\s+/', ' ', strip_tags((string) $col->Address))));
            $cName = strtolower(trim(preg_replace('/\s+/', ' ', trim((string) $col->Name, " ,\t\n\r\0\x0B"))));

            if ($cAddress !== '' && strlen($cAddress) >= 5) {
                $addrMap[$cAddress] = $col;
                $addrMap[strtolower(trim((string) $col->Address))] = $col;
            }
            if ($cName !== '' && strlen($cName) >= 3) {
                $nameMap[$cName] = $col;
                $nameMap[strtolower(trim((string) $col->Name))] = $col;
            }
        }

        $matcher = function ($raw) use ($validColleges, $addrMap, $nameMap) {
            if (empty($raw) || $raw === 'Select Admission Taken In' || $raw === 'Select University Name') {
                return null;
            }

            // Step 1: Check lines of $raw (first line is typically the University Name)
            $lines = array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n|<br\s*\/?>/i', (string) $raw))));
            foreach ($lines as $line) {
                $cleanLine = strtolower(trim(preg_replace('/\s+/', ' ', strip_tags($line))));
                if ($cleanLine !== '' && strlen($cleanLine) >= 3) {
                    if (isset($nameMap[$cleanLine])) {
                        return $nameMap[$cleanLine];
                    }
                    if (isset($addrMap[$cleanLine])) {
                        return $addrMap[$cleanLine];
                    }
                }
            }

            // Step 2: Check full cleaned string in name or address map
            $clean = strtolower(trim(preg_replace('/\s+/', ' ', strip_tags((string) $raw))));
            if (isset($nameMap[$clean])) {
                return $nameMap[$clean];
            }
            if (isset($addrMap[$clean])) {
                return $addrMap[$clean];
            }

            // Step 3: Substring matching against valid colleges (longest name first)
            $lowerRaw = strtolower((string) $raw);
            foreach ($validColleges as $col) {
                $cName = strtolower(trim((string) $col->Name, " ,\t\n\r\0\x0B"));
                if (str_contains($lowerRaw, $cName) || str_contains($clean, $cName)) {
                    return $col;
                }
            }

            // Step 4: Substring matching on address (minimum length 15 to avoid false positives)
            foreach ($validColleges as $col) {
                $cAddr = strtolower(trim(preg_replace('/\s+/', ' ', strip_tags((string) $col->Address))));
                if (strlen($cAddr) >= 15 && (str_contains($lowerRaw, $cAddr) || str_contains($clean, $cAddr))) {
                    return $col;
                }
            }

            return null;
        };

        return [$colleges, $matcher];
    }

    /**
     * Build formatted university options for Select2 filters showing Name and Fees.
     *
     * @param iterable<string>|null $distinctUnivs
     * @param (\Closure(string|null): (?CollegeDetail))|null $matcher
     * @return array<int, array{value: string, name: string, fees: string, label: string}>
     */
    protected function buildUniversityOptions(?iterable $distinctUnivs = null, ?\Closure $matcher = null): array
    {
        if (! $matcher) {
            [, $matcher] = $this->buildCollegeMatcher();
        }

        $seenColleges = [];
        if ($distinctUnivs) {
            foreach ($distinctUnivs as $raw) {
                $col = $matcher($raw);
                $name = $col ? trim((string) $col->Name, " ,\t\n\r\0\x0B") : trim(explode('<br>', (string) $raw)[0]);
                if ($name === '' || $name === '-' || preg_match('/^[\s\-–—\._,]+$/u', $name) || strcasecmp($name, 'select university name') === 0) {
                    continue;
                }
                $fees = ($col && $col->fees !== null && $col->fees !== '') ? trim((string) $col->fees) : '';
                $feesVal = ($fees !== '' && $fees !== '0') ? $fees : '';
                $feesText = $feesVal !== '' ? "₹{$feesVal}" : '—';
                $label = "{$name} | Fees: {$feesText}";

                $key = $col ? ('col_' . $col->id) : strtolower($name);
                if (! isset($seenColleges[$key])) {
                    $seenColleges[$key] = [
                        'value' => $name,
                        'name' => $name,
                        'fees' => $feesVal,
                        'label' => $label,
                    ];
                }
            }
        }

        $allColleges = CollegeDetail::where('is_active', true)->orWhereNull('is_active')->get();
        foreach ($allColleges as $col) {
            $name = trim((string) $col->Name, " ,\t\n\r\0\x0B");
            if ($name === '' || $name === '-' || preg_match('/^[\s\-–—\._,]+$/u', $name) || strlen($name) < 3) {
                continue;
            }
            $key = 'col_' . $col->id;
            if (! isset($seenColleges[$key])) {
                $fees = ($col->fees !== null && $col->fees !== '') ? trim((string) $col->fees) : '';
                $feesVal = ($fees !== '' && $fees !== '0') ? $fees : '';
                $feesText = $feesVal !== '' ? "₹{$feesVal}" : '—';
                $seenColleges[$key] = [
                    'value' => $name,
                    'name' => $name,
                    'fees' => $feesVal,
                    'label' => "{$name} | Fees: {$feesText}",
                ];
            }
        }

        $options = array_values($seenColleges);
        usort($options, fn ($a, $b) => strcasecmp($a['name'], $b['name']));

        return $options;
    }
}
