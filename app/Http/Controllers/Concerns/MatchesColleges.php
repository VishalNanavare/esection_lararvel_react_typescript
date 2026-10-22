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

        foreach ($colleges as $col) {
            $cAddress = strtolower(trim(preg_replace('/\s+/', ' ', strip_tags((string) $col->Address))));
            $cName = strtolower(trim(preg_replace('/\s+/', ' ', trim((string) $col->Name, " ,\t\n\r\0\x0B"))));

            if ($cAddress !== '') {
                $addrMap[$cAddress] = $col;
                $addrMap[strtolower(trim((string) $col->Address))] = $col;
            }
            if ($cName !== '') {
                $nameMap[$cName] = $col;
                $nameMap[strtolower(trim((string) $col->Name))] = $col;
            }
        }

        $matcher = function ($raw) use ($colleges, $addrMap, $nameMap) {
            if (empty($raw) || $raw === 'Select Admission Taken In' || $raw === 'Select University Name') {
                return null;
            }
            $clean = strtolower(trim(preg_replace('/\s+/', ' ', strip_tags((string) $raw))));
            $c = $addrMap[$clean] ?? $nameMap[$clean] ?? $addrMap[strtolower(trim((string) $raw))] ?? $nameMap[strtolower(trim((string) $raw))] ?? null;

            if (! $c) {
                foreach ($colleges as $col) {
                    $cName = strtolower(trim((string) $col->Name, " ,\t\n\r\0\x0B"));
                    if ($cName !== '' && (str_contains(strtolower($raw), $cName) || str_contains($cName, $clean))) {
                        return $col;
                    }
                    $cAddr = strtolower(trim(preg_replace('/\s+/', ' ', strip_tags((string) $col->Address))));
                    if ($cAddr !== '' && (str_contains(strtolower($raw), $cAddr) || str_contains($cAddr, substr($clean, 0, 30)))) {
                        return $col;
                    }
                }
            }

            return $c;
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
                if ($name === '' || $name === '-' || strcasecmp($name, 'select university name') === 0) {
                    continue;
                }
                $fees = ($col && $col->fees !== null && $col->fees !== '') ? trim((string) $col->fees) : '';
                $feesVal = ($fees !== '' && $fees !== '0') ? $fees : '';
                $feesText = $feesVal !== '' ? "₹{$feesVal}" : '—';
                $label = "{$name} | Fees: {$feesText}";

                $key = $col ? ('col_' . $col->id) : strtolower($name);
                if (! isset($seenColleges[$key])) {
                    $seenColleges[$key] = [
                        'value' => (string) $raw,
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
            if ($name === '') {
                continue;
            }
            $key = 'col_' . $col->id;
            if (! isset($seenColleges[$key])) {
                $fees = ($col->fees !== null && $col->fees !== '') ? trim((string) $col->fees) : '';
                $feesVal = ($fees !== '' && $fees !== '0') ? $fees : '';
                $feesText = $feesVal !== '' ? "₹{$feesVal}" : '—';
                $seenColleges[$key] = [
                    'value' => (string) ($col->Address ?: $col->Name),
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
