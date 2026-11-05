<?php

namespace App\Http\Controllers\Concerns;

use App\Models\CollegeDetail;

trait MatchesColleges
{
    /**
     * Normalize a college name or address string for uniform key comparison.
     */
    protected function normalizeCollegeString(?string $str): string
    {
        if ($str === null || $str === '') {
            return '';
        }

        // Replace HTML line breaks with spaces before stripping tags to avoid word concatenation (e.g. 416004<br>phone -> 416004 phone)
        $s = preg_replace('/<br\s*\/?>/i', ' ', (string) $str);
        $s = strip_tags($s);
        $s = preg_replace('/\s+/', ' ', $s);

        return strtolower(trim($s));
    }

    /**
     * Disambiguate and select the best CollegeDetail among multiple candidates with matching names.
     *
     * @param array<int, CollegeDetail> $candidates
     */
    protected function pickBestCollegeMatch(array $candidates, string $rawClean, string $addressPart, \Closure $isActive): CollegeDetail
    {
        if (count($candidates) === 1) {
            return $candidates[0];
        }

        $bestCol = $candidates[0];
        $bestScore = -1;

        foreach ($candidates as $col) {
            $score = 0;

            // Prioritize active, non-deleted colleges (+1000)
            if ($isActive($col)) {
                $score += 1000;
            }

            $colAddr = $this->normalizeCollegeString($col->Address);
            if ($colAddr !== '') {
                // Exact or full substring match on address part
                if ($addressPart !== '' && ($colAddr === $addressPart || str_contains($addressPart, $colAddr) || str_contains($colAddr, $addressPart))) {
                    $score += 5000;
                }

                // Match in full cleaned raw string
                if (str_contains($rawClean, $colAddr)) {
                    $score += 3000;
                }

                // Check distinctive tokens (phone numbers, pincodes, city/area names)
                $tokens = preg_split('/[^a-z0-9]+/i', $colAddr);
                foreach ($tokens as $token) {
                    $token = trim((string) $token);
                    if ($token === '') {
                        continue;
                    }
                    if (is_numeric($token) && strlen($token) >= 4) {
                        if (str_contains($rawClean, $token)) {
                            $score += 200;
                        }
                    } elseif (strlen($token) >= 5) {
                        if (str_contains($rawClean, $token)) {
                            $score += 20;
                        }
                    }
                }
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestCol = $col;
            }
        }

        return $bestCol;
    }

    /**
     * Build an indexing matcher for mapping student clg_add values to CollegeDetail records.
     *
     * @return array{0: \Illuminate\Database\Eloquent\Collection<int, CollegeDetail>, 1: \Closure(string|null): (?CollegeDetail)}
     */
    protected function buildCollegeMatcher(): array
    {
        $colleges = CollegeDetail::all();
        $addrMap = [];
        $nameCandidates = [];

        $isActive = function ($col): bool {
            $sel = (string) ($col->sel_data ?? '1');
            return (bool) ($col->is_active ?? true) && $sel !== '0';
        };

        // Exclude dummy or punctuation-only college records like "-" and sort longest names first
        $validColleges = $colleges->filter(function ($col) {
            $name = trim((string) $col->Name, " ,\t\n\r\0\x0B");
            return $name !== '' && $name !== '-' && !preg_match('/^[\s\-–—\._,]+$/u', $name) && strlen($name) >= 3;
        })->sortByDesc(function ($col) {
            return strlen(trim((string) $col->Name));
        })->values();

        foreach ($validColleges as $col) {
            $cName = $this->normalizeCollegeString(trim((string) $col->Name, " ,\t\n\r\0\x0B"));
            if ($cName !== '' && strlen($cName) >= 3) {
                $nameCandidates[$cName][] = $col;
            }

            $cAddress = $this->normalizeCollegeString($col->Address);
            if ($cAddress !== '' && strlen($cAddress) >= 5) {
                // Active colleges take precedence in address mapping
                if (! isset($addrMap[$cAddress]) || ($isActive($col) && ! $isActive($addrMap[$cAddress]))) {
                    $addrMap[$cAddress] = $col;
                }
            }
        }

        // Sort candidate lists so active colleges are always at index 0
        foreach ($nameCandidates as $k => &$list) {
            usort($list, fn ($a, $b) => ($isActive($b) ? 1 : 0) <=> ($isActive($a) ? 1 : 0));
        }
        unset($list);

        $activeColleges = $validColleges->filter($isActive)->values();
        $inactiveColleges = $validColleges->reject($isActive)->values();

        $matcher = function ($raw) use ($validColleges, $activeColleges, $inactiveColleges, $addrMap, $nameCandidates, $isActive) {
            if (empty($raw) || $raw === 'Select Admission Taken In' || $raw === 'Select University Name') {
                return null;
            }

            $rawStr = (string) $raw;
            $rawClean = $this->normalizeCollegeString($rawStr);
            if ($rawClean === '' || $rawClean === '-' || strlen($rawClean) < 3) {
                return null;
            }

            $lines = array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n|<br\s*\/?>/i', $rawStr))));
            $nameLine = !empty($lines) ? $this->normalizeCollegeString($lines[0]) : '';
            $addressPart = count($lines) > 1 ? $this->normalizeCollegeString(implode(' ', array_slice($lines, 1))) : '';

            // Step 1: Check if address part or full string matches addrMap directly
            if ($addressPart !== '' && isset($addrMap[$addressPart])) {
                return $addrMap[$addressPart];
            }
            if (isset($addrMap[$rawClean])) {
                return $addrMap[$rawClean];
            }

            // Step 2: Check first line (University Name) against candidates
            if ($nameLine !== '' && isset($nameCandidates[$nameLine])) {
                return $this->pickBestCollegeMatch($nameCandidates[$nameLine], $rawClean, $addressPart, $isActive);
            }

            // Step 3: Check remaining individual lines in name or address maps
            foreach ($lines as $line) {
                $cleanLine = $this->normalizeCollegeString($line);
                if ($cleanLine !== '' && strlen($cleanLine) >= 3) {
                    if (isset($nameCandidates[$cleanLine])) {
                        return $this->pickBestCollegeMatch($nameCandidates[$cleanLine], $rawClean, $addressPart, $isActive);
                    }
                    if (isset($addrMap[$cleanLine])) {
                        return $addrMap[$cleanLine];
                    }
                }
            }

            // Step 4: Check full cleaned string in name candidates
            if (isset($nameCandidates[$rawClean])) {
                return $this->pickBestCollegeMatch($nameCandidates[$rawClean], $rawClean, $addressPart, $isActive);
            }

            // Step 5: Substring matching against valid colleges (active colleges first, longest name first)
            foreach ([$activeColleges, $inactiveColleges] as $collegeGroup) {
                foreach ($collegeGroup as $col) {
                    $cName = $this->normalizeCollegeString(trim((string) $col->Name, " ,\t\n\r\0\x0B"));
                    if (strlen($cName) >= 3 && (str_contains($rawClean, $cName) || str_contains($this->normalizeCollegeString($rawStr), $cName))) {
                        return $col;
                    }
                }
            }

            // Step 6: Substring matching on address (minimum length 15 to avoid false positives)
            foreach ([$activeColleges, $inactiveColleges] as $collegeGroup) {
                foreach ($collegeGroup as $col) {
                    $cAddr = $this->normalizeCollegeString($col->Address);
                    if (strlen($cAddr) >= 15 && (str_contains($rawClean, $cAddr) || str_contains($this->normalizeCollegeString($rawStr), $cAddr))) {
                        return $col;
                    }
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

        $allColleges = CollegeDetail::where('is_active', true)
            ->where(function ($b) {
                $b->where('sel_data', '!=', '0')->orWhereNull('sel_data');
            })
            ->get();

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
