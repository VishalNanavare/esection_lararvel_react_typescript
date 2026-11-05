<?php

namespace App\Services;

use App\Models\AcademicYear;
use App\Models\Course;
use App\Models\ConfStudData;
use App\Models\Regularization;
use App\Models\RemDb;
use App\Models\StudentDetail;
use App\Models\ScholarshipDocument;
use App\Models\ScholarshipInstallment;
use App\Models\ScholarshipStudent;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

class ScholarshipImportService
{
    /**
     * Map category code / text to standard Maharashtra categories.
     */
    public function normalizeCategory(?string $casteText, ?string $categoryId): string
    {
        $id = trim((string) $categoryId);
        $text = strtoupper(trim((string) $casteText));

        // Samarth State Category Codes
        if ($id === '26') return 'VJNT';
        if ($id === '27') return 'NT-B';
        if ($id === '28') return 'NT-C';
        if ($id === '29') return 'NT-D';
        if ($id === '30') return 'SBC';
        if ($id === '35') return 'SEBC';
        if ($id === '3' || str_contains($text, 'SCHEDULED CASTE') || $text === 'SC') return 'SC';
        if ($id === '4' || str_contains($text, 'SCHEDULED TRIBE') || $text === 'ST') return 'ST';
        if ($id === '2' || $id === '6' || str_contains($text, 'OBC') || str_contains($text, 'BACKWARD CLASS')) return 'OBC';
        if ($id === '5' || str_contains($text, 'EWS')) return 'EWS';

        if (str_contains($text, 'VJNT') || str_contains($text, 'V.J.N.T')) return 'VJNT';
        if (str_contains($text, 'SBC')) return 'SBC';

        return 'General';
    }

    /**
     * Resolve Programme name from Excel to Course ID.
     */
    public function resolveCourse(string $programmeName): ?Course
    {
        $p = strtoupper(trim($programmeName));
        if ($p === '') return null;

        $targetName = null;
        if (str_contains($p, 'COMPUTER SCIENCE')) {
            $targetName = str_contains($p, 'MASTER') ? 'MSC (CS) - I' : 'F.Y.B.Sc (CS)';
        } elseif (str_contains($p, 'INFORMATION TECHNOLOGY')) {
            $targetName = str_contains($p, 'MASTER') ? 'MSc (IT) - I' : 'FYBSCIT';
        } elseif (str_contains($p, 'BACHELOR OF ARTS') || str_contains($p, 'COMBINATION OF 3 SUBJECTS')) {
            $targetName = 'F.Y.B.A';
        } elseif (str_contains($p, 'BACHELOR OF COMMERCE')) {
            $targetName = 'F.Y.B.Com';
        } elseif (str_contains($p, 'MASTER OF COMMERCE')) {
            $targetName = 'MCOM Part I';
        } elseif (str_contains($p, 'MASTER OF COMPUTER APPLICATION')) {
            $targetName = 'MCA - I';
        } elseif (str_contains($p, 'MASTER OF SCIENCE (MATHEMATICS)')) {
            $targetName = 'MSc (Maths) - I';
        } elseif (str_contains($p, 'GEOGRAPHY')) {
            $targetName = 'MA Part I (Geography)';
        } elseif (str_contains($p, 'EDUCATION')) {
            $targetName = 'MA (Edu) - I';
        } elseif (str_contains($p, 'MASTER OF ARTS') || str_contains($p, 'MASTERS OF ARTS')) {
            $targetName = 'MA Part I';
        } elseif (str_contains($p, 'PGDFM')) {
            $targetName = 'PGDFM - I';
        } elseif (str_contains($p, 'LIBRARY')) {
            $targetName = 'Bachelor of Library and Information Science';
        } elseif (str_contains($p, 'MANAGEMENT STUDIES')) {
            $targetName = 'MMS';
        } elseif (str_contains($p, 'SCHOOL MANAGEMNT')) {
            $targetName = 'PGDSM';
        }

        if ($targetName) {
            return Course::firstOrCreate(
                ['name' => $targetName],
                ['code' => null, 'is_active' => true]
            );
        }

        // Fallback: create course from first 50 chars of programme
        $shortName = substr(trim($programmeName), 0, 50);
        return Course::firstOrCreate(
            ['name' => $shortName],
            ['code' => null, 'is_active' => true]
        );
    }

    /**
     * Resolve Academic Year from cycle string (e.g. 'CDOE-2026-27').
     */
    public function resolveAcademicYear(?string $cycle): ?AcademicYear
    {
        $raw = trim((string) $cycle);
        $yearLabel = '2026-2027'; // default

        if (preg_match('/(\d{4})[-_](\d{2,4})/', $raw, $matches)) {
            $start = $matches[1];
            $end = strlen($matches[2]) === 2 ? ('20' . $matches[2]) : $matches[2];
            $yearLabel = "{$start}-{$end}";
        }

        return AcademicYear::firstOrCreate(
            ['year_label' => $yearLabel],
            ['is_current' => ($yearLabel === '2026-2027')]
        );
    }

    /**
     * Cross-reference with legacy E-Section tables (DD, Reminders, Regularizations).
     */
    public function detectExistingSystemStatus(string $name, ?string $mobile = null, ?string $email = null): ?string
    {
        $statuses = [];

        // 1. Check DD processing in conf_stud_data
        $conf = ConfStudData::where('name', 'LIKE', '%' . $name . '%')->first();
        if ($conf && $conf->dd_amount) {
            $statuses[] = "DD Confirmed: ₹{$conf->dd_amount} (" . ($conf->bank_name ?: 'Bank') . ")";
        }

        // 2. Check Reminders
        $rem = RemDb::where('name', 'LIKE', '%' . $name . '%')->first();
        if ($rem) {
            $statuses[] = "Reminder Sent ({$rem->acd_year})";
        }

        // 3. Check Regularization
        $reg = Regularization::where('student_name', 'LIKE', '%' . $name . '%')->first();
        if ($reg) {
            $statuses[] = "Regularized ({$reg->passing_course})";
        }

        // 4. Check Student Verification
        $sd = StudentDetail::where('student_name', 'LIKE', '%' . $name . '%')
            ->orWhere(function ($q) use ($email, $mobile) {
                if ($email) $q->orWhere('email', $email);
            })
            ->first();

        if ($sd) {
            $statuses[] = "Eligibility: " . ($sd->verification_status ?: 'In System') . " [" . ($sd->eligibility_case_no ?: 'No Case') . "]";
        }

        return empty($statuses) ? null : implode(' | ', $statuses);
    }

    /**
     * Compute SHA-256 fingerprint of row contents.
     */
    public function calculateRowHash(array $row): string
    {
        $payload = implode('|', [
            trim((string) ($row['form_number'] ?? '')),
            trim((string) ($row['programme_name'] ?? '')),
            trim((string) ($row['caste_category'] ?? '')),
            trim((string) ($row['category_id'] ?? '')),
            trim((string) ($row['payment_status'] ?? '')),
            trim((string) ($row['mobile'] ?? '')),
            trim((string) ($row['family_income'] ?? '')),
        ]);

        return hash('sha256', $payload);
    }

    /**
     * Deep Scan and compare uploaded Excel against existing database.
     * Returns stats + detailed diff preview for user choice.
     */
    public function analyzeFile(string $filePath): array
    {
        ini_set('memory_limit', '1024M');
        set_time_limit(300);

        $reader = IOFactory::createReaderForFile($filePath);
        $reader->setReadDataOnly(true);
        $sheet = $reader->load($filePath)->getActiveSheet();
        $highestRow = $sheet->getHighestRow();

        $stats = [
            'total_rows' => $highestRow - 1,
            'new_count' => 0,
            'unchanged_count' => 0,
            'modified_count' => 0,
            'cancelled_count' => 0,
            'sample_diffs' => [],
        ];

        // Fetch existing students keyed by form_number
        $existing = ScholarshipStudent::select(['id', 'form_number', 'row_hash', 'applied_programme_name', 'payment_status', 'caste_category'])
            ->get()
            ->keyBy('form_number');

        for ($r = 2; $r <= $highestRow; $r++) {
            $formNo = trim((string) $sheet->getCell([2, $r])->getValue());
            if ($formNo === '') continue;

            $prog = trim((string) $sheet->getCell([3, $r])->getValue());
            $payStatus = trim((string) $sheet->getCell([8, $r])->getValue());
            $casteText = trim((string) $sheet->getCell([17, $r])->getValue());
            $catId = trim((string) $sheet->getCell([18, $r])->getValue());
            $mobile = trim((string) $sheet->getCell([13, $r])->getValue());
            $income = trim((string) $sheet->getCell([26, $r])->getValue());
            $name = trim((string) $sheet->getCell([9, $r])->getValue());

            $casteCategory = $this->normalizeCategory($casteText, $catId);

            $rowData = [
                'form_number' => $formNo,
                'programme_name' => $prog,
                'caste_category' => $casteCategory,
                'category_id' => $catId,
                'payment_status' => $payStatus,
                'mobile' => $mobile,
                'family_income' => $income,
            ];

            $newHash = $this->calculateRowHash($rowData);

            if (!$existing->has($formNo)) {
                $stats['new_count']++;
            } else {
                $curr = $existing->get($formNo);
                if (strtoupper($payStatus) === 'CANCELLED' || strtoupper($payStatus) === 'REFUNDED') {
                    $stats['cancelled_count']++;
                    if (count($stats['sample_diffs']) < 15) {
                        $stats['sample_diffs'][] = [
                            'form_number' => $formNo,
                            'name' => $name,
                            'type' => 'cancelled',
                            'description' => 'Admission status changed to ' . $payStatus,
                        ];
                    }
                } elseif ($curr->row_hash === $newHash) {
                    $stats['unchanged_count']++;
                } else {
                    $stats['modified_count']++;
                    if (count($stats['sample_diffs']) < 15) {
                        $diffDesc = [];
                        if ($curr->applied_programme_name !== $prog) {
                            $diffDesc[] = "Course: '{$curr->applied_programme_name}' -> '{$prog}'";
                        }
                        if ($curr->payment_status !== $payStatus) {
                            $diffDesc[] = "Payment: '{$curr->payment_status}' -> '{$payStatus}'";
                        }
                        if ($curr->caste_category !== $casteCategory) {
                            $diffDesc[] = "Category: '{$curr->caste_category}' -> '{$casteCategory}'";
                        }
                        $stats['sample_diffs'][] = [
                            'form_number' => $formNo,
                            'name' => $name,
                            'type' => 'modified',
                            'description' => implode(' | ', $diffDesc),
                        ];
                    }
                }
            }
        }

        return $stats;
    }

    /**
     * Execute full import / sync with safe merge policy.
     */
    public function executeImport(string $filePath, array $options = []): array
    {
        ini_set('memory_limit', '1024M');
        set_time_limit(600);

        $skipUnchanged = $options['skip_unchanged'] ?? true;
        $updateModified = $options['update_modified'] ?? true;
        $addNew = $options['add_new'] ?? true;

        $reader = IOFactory::createReaderForFile($filePath);
        $reader->setReadDataOnly(true);
        $sheet = $reader->load($filePath)->getActiveSheet();
        $highestRow = $sheet->getHighestRow();

        $inserted = 0;
        $updated = 0;
        $skipped = 0;

        $existing = ScholarshipStudent::select(['id', 'form_number', 'row_hash', 'admission_status'])
            ->get()
            ->keyBy('form_number');

        for ($r = 2; $r <= $highestRow; $r++) {
            $formNo = trim((string) $sheet->getCell([2, $r])->getValue());
            if ($formNo === '') continue;

            $regNo = trim((string) $sheet->getCell([1, $r])->getValue());
            $prog = trim((string) $sheet->getCell([3, $r])->getValue());
            $cycle = trim((string) $sheet->getCell([7, $r])->getValue());
            $payStatus = trim((string) $sheet->getCell([8, $r])->getValue());
            $name = trim((string) $sheet->getCell([9, $r])->getValue());
            $photo = trim((string) $sheet->getCell([10, $r])->getValue());
            $sig = trim((string) $sheet->getCell([11, $r])->getValue());
            $email = trim((string) $sheet->getCell([12, $r])->getValue());
            $mobile = trim((string) $sheet->getCell([13, $r])->getValue());
            $altMobile = trim((string) $sheet->getCell([15, $r])->getValue());
            $gender = trim((string) $sheet->getCell([16, $r])->getValue());
            $casteText = trim((string) $sheet->getCell([17, $r])->getValue());
            $catId = trim((string) $sheet->getCell([18, $r])->getValue());
            $dob = trim((string) $sheet->getCell([19, $r])->getValue());
            $income = trim((string) $sheet->getCell([26, $r])->getValue());

            $casteCategory = $this->normalizeCategory($casteText, $catId);
            $course = $this->resolveCourse($prog);
            $academicYear = $this->resolveAcademicYear($cycle);

            $rowData = [
                'form_number' => $formNo,
                'programme_name' => $prog,
                'caste_category' => $casteCategory,
                'category_id' => $catId,
                'payment_status' => $payStatus,
                'mobile' => $mobile,
                'family_income' => $income,
            ];

            $newHash = $this->calculateRowHash($rowData);

            if (!$existing->has($formNo)) {
                if (!$addNew) {
                    $skipped++;
                    continue;
                }

                $sysStatus = $this->detectExistingSystemStatus($name, $mobile, $email);

                $student = ScholarshipStudent::create([
                    'form_number' => $formNo,
                    'registration_no' => $regNo,
                    'student_name' => $name,
                    'email' => $email,
                    'mobile' => $mobile,
                    'alternate_mobile' => $altMobile,
                    'gender' => $gender,
                    'dob' => $dob,
                    'photo_url' => $photo,
                    'signature_url' => $sig,
                    'academic_year_id' => $academicYear?->id,
                    'academic_year_label' => $academicYear?->year_label,
                    'course_id' => $course?->id,
                    'applied_programme_name' => $prog,
                    'caste_category' => $casteCategory,
                    'category_id' => $catId,
                    'family_income_code' => $income,
                    'payment_status' => $payStatus,
                    'row_hash' => $newHash,
                    'admission_status' => (strtoupper($payStatus) === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE'),
                    'scholarship_status' => 'pending_docs',
                    'existing_system_status' => $sysStatus,
                    'last_imported_at' => now(),
                ]);

                // Create initial documents checklist record
                ScholarshipDocument::create([
                    'scholarship_student_id' => $student->id,
                ]);

                // Create default 2 installments
                ScholarshipInstallment::create([
                    'scholarship_student_id' => $student->id,
                    'installment_no' => 1,
                    'status' => 'unpaid',
                    'amount' => 0,
                ]);
                ScholarshipInstallment::create([
                    'scholarship_student_id' => $student->id,
                    'installment_no' => 2,
                    'status' => 'unpaid',
                    'amount' => 0,
                ]);

                $student->recalculateFinancials();
                $inserted++;
            } else {
                $curr = $existing->get($formNo);

                if ($skipUnchanged && $curr->row_hash === $newHash) {
                    $skipped++;
                    continue;
                }

                if (!$updateModified) {
                    $skipped++;
                    continue;
                }

                // Safe update: demographic only, NEVER touch manual clerk work
                $student = ScholarshipStudent::find($curr->id);
                if ($student) {
                    $student->course_id = $course?->id;
                    $student->applied_programme_name = $prog;
                    $student->caste_category = $casteCategory;
                    $student->category_id = $catId;
                    $student->family_income_code = $income;
                    $student->payment_status = $payStatus;
                    $student->mobile = $mobile ?: $student->mobile;
                    $student->email = $email ?: $student->email;
                    $student->row_hash = $newHash;
                    $student->last_imported_at = now();

                    if (strtoupper($payStatus) === 'CANCELLED' || strtoupper($payStatus) === 'REFUNDED') {
                        $student->admission_status = 'CANCELLED';
                        $student->scholarship_status = 'cancelled';
                    }

                    $student->save();
                    $student->recalculateFinancials();
                    $updated++;
                }
            }
        }

        return [
            'inserted' => $inserted,
            'updated' => $updated,
            'skipped' => $skipped,
            'total' => $highestRow - 1,
        ];
    }
}
