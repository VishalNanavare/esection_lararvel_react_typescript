<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\ActivityLog;
use App\Models\Setting;
use App\Models\StreamDetail;
use App\Models\StudentDetail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentController extends Controller
{
    /**
     * Render the New Student Verification Form.
     */
    public function newForm(): Response
    {
        $maxId = StudentDetail::max('id') ?? 0;
        $commonNo = $maxId + 1;

        $casePrefix = Setting::get('case_no_prefix', 'CASE');
        $suggestedCaseNo = strtoupper($casePrefix).'-'.date('Y').'/'.sprintf('%04d', $commonNo);

        $academicYears = AcademicYear::orderBy('id', 'desc')->get()->map(fn ($y) => [
            'id' => $y->year_label,
            'text' => $y->year_label,
            'is_current' => (bool) $y->is_current,
        ]);

        $streams = StreamDetail::whereNotNull('Division')
            ->where('Division', '!=', '')
            ->orderBy('Division', 'asc')
            ->get()
            ->map(fn ($s) => [
                'id' => $s->Division,
                'text' => $s->Division,
                'stream' => $s->Name,
            ]);

        return Inertia::render('Students/NewForm', [
            'title' => 'New Student Verification Form',
            'common_no' => $commonNo,
            'suggestedCaseNo' => $suggestedCaseNo,
            'academicYears' => $academicYears,
            'streams' => $streams,
        ]);
    }

    /**
     * API: Generate a fresh suggested case number.
     */
    public function generateCaseNo(): JsonResponse
    {
        $maxId = StudentDetail::max('id') ?? 0;
        $casePrefix = Setting::get('case_no_prefix', 'CASE');
        $caseNo = strtoupper($casePrefix).'-'.date('Y').'/'.sprintf('%04d', $maxId + 1);

        return response()->json(['case_no' => $caseNo]);
    }

    /**
     * Store a batch of student verification records.
     */
    public function storeBatch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to_name' => 'nullable|string|max:200',
            'clg_add' => 'required|string|max:1500',
            'admission_taken_year' => 'required|string|max:50',
            'admission_taken_in' => 'required|string|max:100',
            'in_favour_of' => 'nullable|string|max:200',
            'students' => 'required|array|min:1|max:200',
            'students.*.student_name' => 'required|string|max:200',
            'students.*.student_nee_name' => 'nullable|string|max:200',
            'students.*.eligibility_case_no' => 'required|string|max:60',
            'students.*.verification_of_marksheet_done_by_you' => 'nullable|string|max:100',
            'students.*.email' => 'nullable|email|max:190',
        ]);

        $username = Auth::user()?->username ?? 'staff';

        // Generate a unique array_space batch identifier
        $timestamp = time();
        $arraySpace = (string) $timestamp;

        // Verify collision guard
        while (StudentDetail::where('array_space', $arraySpace)->exists()) {
            $timestamp++;
            $arraySpace = (string) $timestamp;
        }

        DB::beginTransaction();
        try {
            $insertedCount = 0;
            $nowTime = date('Y-m-d H:i:s');

            foreach ($validated['students'] as $stud) {
                StudentDetail::create([
                    'array_space' => $arraySpace,
                    'to_name' => $validated['to_name'] ?? '',
                    'clg_add' => $validated['clg_add'],
                    'admission_taken_year' => $validated['admission_taken_year'],
                    'student_name' => trim($stud['student_name']),
                    'student_nee_name' => trim($stud['student_nee_name'] ?? ''),
                    'email' => trim($stud['email'] ?? ''),
                    'eligibility_case_no' => trim($stud['eligibility_case_no']),
                    'admission_taken_in' => $validated['admission_taken_in'],
                    'verification_of_marksheet_done_by_you' => trim($stud['verification_of_marksheet_done_by_you'] ?? ''),
                    'in_favour_of' => $validated['in_favour_of'] ?? '',
                    'en_time' => $nowTime,
                ]);
                $insertedCount++;
            }

            ActivityLog::record(
                'students.create',
                "Created student verification batch #{$arraySpace} with {$insertedCount} candidate(s)."
            );

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "{$insertedCount} student verification cases saved successfully.",
                'array_space' => $arraySpace,
                'count' => $insertedCount,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to save candidate batch: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Browse previously submitted batches.
     */
    public function history(Request $request): Response
    {
        $year = trim((string) $request->input('year', ''));
        $university = trim((string) $request->input('university', ''));
        $course = trim((string) $request->input('course', ''));
        $batch = trim((string) $request->input('batch', ''));
        $name = trim((string) $request->input('name', ''));
        $dateFrom = trim((string) $request->input('date_from', ''));
        $dateTo = trim((string) $request->input('date_to', ''));

        $query = StudentDetail::query();

        if ($name !== '') {
            $query->where(function ($q) use ($name) {
                $q->where('student_name', 'like', "%{$name}%")
                    ->orWhere('eligibility_case_no', 'like', "%{$name}%");
            });
        }
        if ($batch !== '') {
            $query->where('array_space', 'like', "%{$batch}%");
        }
        if ($dateFrom !== '') {
            $from = strtotime($dateFrom.' 00:00:00');
            if ($from !== false) {
                $query->where(function ($q) use ($from, $dateFrom) {
                    $q->where('en_time', '>=', (string) $from)
                        ->orWhere('en_time', '>=', $dateFrom);
                });
            }
        }
        if ($dateTo !== '') {
            $to = strtotime($dateTo.' 23:59:59');
            if ($to !== false) {
                $query->where(function ($q) use ($to, $dateTo) {
                    $q->where('en_time', '<=', (string) $to)
                        ->orWhere('en_time', '<=', $dateTo.' 23:59:59');
                });
            }
        }

        // Group by batch (array_space)
        $batchQuery = (clone $query)
            ->selectRaw('
                array_space,
                MAX(clg_add) as clg_add,
                MAX(admission_taken_in) as admission_taken_in,
                MAX(admission_taken_year) as admission_taken_year,
                MAX(en_time) as en_time,
                COUNT(*) as student_count
            ')
            ->whereNotNull('array_space')
            ->where('array_space', '!=', '')
            ->groupBy('array_space');

        if ($year !== '') {
            $batchQuery->having('admission_taken_year', '=', $year);
        }
        if ($university !== '') {
            $batchQuery->having('clg_add', 'like', "%{$university}%");
        }
        if ($course !== '') {
            $batchQuery->having('admission_taken_in', '=', $course);
        }

        $batchQuery->orderByRaw('MAX(en_time) DESC');

        $batches = $batchQuery->paginate(20)->withQueryString();

        $batches->getCollection()->transform(function ($b) {
            $formattedTime = '';
            if (! empty($b->en_time)) {
                if (is_numeric($b->en_time)) {
                    $formattedTime = date('d M Y, H:i', (int) $b->en_time);
                } elseif ($ts = strtotime($b->en_time)) {
                    $formattedTime = date('d M Y, H:i', $ts);
                } else {
                    $formattedTime = (string) $b->en_time;
                }
            }
            $b->formatted_en_time = $formattedTime;

            return $b;
        });

        $filterOptions = [
            'years' => StudentDetail::whereNotNull('admission_taken_year')
                ->where('admission_taken_year', '!=', '')
                ->where('admission_taken_year', '!=', 'Select Admission Taken In')
                ->distinct()
                ->orderBy('admission_taken_year', 'desc')
                ->pluck('admission_taken_year'),
            'courses' => StudentDetail::whereNotNull('admission_taken_in')
                ->where('admission_taken_in', '!=', '')
                ->where('admission_taken_in', '!=', 'Select Admission Taken In')
                ->distinct()
                ->orderBy('admission_taken_in', 'asc')
                ->pluck('admission_taken_in'),
            'universities' => StudentDetail::whereNotNull('clg_add')
                ->where('clg_add', '!=', '')
                ->where('clg_add', '!=', 'Select Admission Taken In')
                ->distinct()
                ->orderBy('clg_add', 'asc')
                ->pluck('clg_add'),
        ];

        return Inertia::render('Students/History', [
            'title' => 'Verification Batch History',
            'batches' => $batches,
            'filterOptions' => $filterOptions,
            'filters' => [
                'year' => $year,
                'university' => $university,
                'course' => $course,
                'batch' => $batch,
                'name' => $name,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }

    /**
     * View detailed list of students in a specific batch.
     */
    public function batchDetail(string $arraySpace): Response|JsonResponse
    {
        $students = StudentDetail::where('array_space', $arraySpace)
            ->orderBy('id', 'asc')
            ->get();

        if (request()->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'array_space' => $arraySpace,
                'students' => $students,
            ]);
        }

        return Inertia::render('Students/BatchDetail', [
            'title' => "Batch #{$arraySpace} Details",
            'arraySpace' => $arraySpace,
            'students' => $students,
        ]);
    }

    /**
     * Update a student's basic details.
     */
    public function update(Request $request, int $id): JsonResponse|RedirectResponse
    {
        $student = StudentDetail::findOrFail($id);

        $validated = $request->validate([
            'student_name' => 'required|string|max:200',
            'student_nee_name' => 'nullable|string|max:200',
            'eligibility_case_no' => 'required|string|max:60',
            'verification_of_marksheet_done_by_you' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:190',
        ]);

        $student->update($validated);

        ActivityLog::record('students.update', "Updated student record #{$id} ({$student->student_name}).");

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Candidate updated successfully.',
                'student' => $student,
            ]);
        }

        return back()->with('success', 'Candidate updated successfully.');
    }

    /**
     * Delete a candidate record.
     */
    public function destroy(int $id): JsonResponse|RedirectResponse
    {
        abort_unless(Setting::enabled('feature_delete_enabled'), 403, 'Deleting records is currently disabled by an administrator.');

        $student = StudentDetail::findOrFail($id);
        $arraySpace = $student->array_space;
        $name = $student->student_name;

        $student->delete();

        ActivityLog::record('students.delete', "Deleted student record #{$id} ({$name}) from batch #{$arraySpace}.");

        if (request()->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Candidate deleted successfully.',
            ]);
        }

        return back()->with('success', 'Candidate deleted successfully.');
    }

    /**
     * Parse an uploaded Excel candidate sheet for New Form table.
     */
    public function readCandidateSheet(Request $request): JsonResponse
    {
        $request->validate([
            'candidate_sheet' => 'required|file|mimes:xlsx,xls|max:5120',
        ]);

        $file = $request->file('candidate_sheet');

        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $sheet = $spreadsheet->getActiveSheet();
            $sheetTitle = $sheet->getTitle();
            $rawRows = $sheet->toArray(null, true, true, false);

            if (empty($rawRows) || count($rawRows) <= 1) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'That sheet has no candidate rows below the heading row. Add the candidates and try again.',
                ], 422);
            }

            $rows = [];
            $okCount = 0;
            $maxRows = 300;
            $truncated = false;

            // Iterate data rows starting from row index 1 (line 2 in spreadsheet)
            for ($i = 1; $i < count($rawRows); $i++) {
                $line = $i + 1;
                $cells = $rawRows[$i];

                $name = trim((string) ($cells[0] ?? ''));
                $neeName = trim((string) ($cells[1] ?? ''));
                $caseNo = trim((string) ($cells[2] ?? ''));
                $remarks = trim((string) ($cells[3] ?? ''));
                $email = trim((string) ($cells[4] ?? ''));

                // Skip blank rows completely
                if ($name === '' && $neeName === '' && $caseNo === '' && $remarks === '' && $email === '') {
                    continue;
                }

                if (count($rows) >= $maxRows) {
                    $truncated = true;
                    break;
                }

                $messages = [];
                if ($name === '') {
                    $messages[] = 'Candidate name is missing.';
                } elseif (mb_strlen($name) > 100) {
                    $messages[] = 'Candidate name is too long ('.mb_strlen($name).' characters; the limit is 100).';
                }

                if ($caseNo === '') {
                    $messages[] = 'Eligibility case number is missing.';
                } elseif (mb_strlen($caseNo) > 60) {
                    $messages[] = 'Eligibility case number is too long ('.mb_strlen($caseNo).' characters; the limit is 60).';
                }

                if ($email !== '' && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $messages[] = 'Email address is not valid.';
                }

                $status = empty($messages) ? 'ok' : 'error';
                if ($status === 'ok') {
                    $okCount++;
                }

                $rows[] = [
                    'line' => $line,
                    'status' => $status,
                    'messages' => $messages,
                    'data' => [
                        'student_name' => $name,
                        'student_nee_name' => $neeName !== '' ? $neeName : '-',
                        'eligibility_case_no' => $caseNo,
                        'verification_by_you' => $remarks !== '' ? $remarks : 'Marksheet Verification',
                        'email' => $email,
                    ],
                ];
            }

            if (empty($rows)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'That sheet has no candidate rows below the heading row. Add the candidates and try again.',
                ], 422);
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'rows' => $rows,
                    'ok_count' => $okCount,
                    'error_count' => count($rows) - $okCount,
                    'sheet' => $sheetTitle,
                    'truncated' => $truncated,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'That sheet could not be read: '.$e->getMessage(),
            ], 422);
        }
    }

    /**
     * Export batch history to Excel (.xlsx).
     */
    public function exportHistory(Request $request): StreamedResponse
    {
        $year = trim((string) $request->input('year', ''));
        $university = trim((string) $request->input('university', ''));
        $course = trim((string) $request->input('course', ''));
        $batch = trim((string) $request->input('batch', ''));
        $name = trim((string) $request->input('name', ''));
        $dateFrom = trim((string) $request->input('date_from', ''));
        $dateTo = trim((string) $request->input('date_to', ''));

        $query = StudentDetail::query();

        if ($name !== '') {
            $query->where(function ($q) use ($name) {
                $q->where('student_name', 'like', "%{$name}%")
                    ->orWhere('eligibility_case_no', 'like', "%{$name}%");
            });
        }
        if ($batch !== '') {
            $query->where('array_space', 'like', "%{$batch}%");
        }
        if ($dateFrom !== '') {
            $from = strtotime($dateFrom.' 00:00:00');
            if ($from !== false) {
                $query->where(function ($q) use ($from, $dateFrom) {
                    $q->where('en_time', '>=', (string) $from)
                        ->orWhere('en_time', '>=', $dateFrom);
                });
            }
        }
        if ($dateTo !== '') {
            $to = strtotime($dateTo.' 23:59:59');
            if ($to !== false) {
                $query->where(function ($q) use ($to, $dateTo) {
                    $q->where('en_time', '<=', (string) $to)
                        ->orWhere('en_time', '<=', $dateTo.' 23:59:59');
                });
            }
        }

        $batchQuery = $query->selectRaw('
                array_space,
                MAX(clg_add) as clg_add,
                MAX(admission_taken_in) as admission_taken_in,
                MAX(admission_taken_year) as admission_taken_year,
                MAX(en_time) as en_time,
                COUNT(*) as student_count
            ')
            ->whereNotNull('array_space')
            ->where('array_space', '!=', '')
            ->groupBy('array_space');

        if ($year !== '') {
            $batchQuery->having('admission_taken_year', '=', $year);
        }
        if ($university !== '') {
            $batchQuery->having('clg_add', 'like', "%{$university}%");
        }
        if ($course !== '') {
            $batchQuery->having('admission_taken_in', '=', $course);
        }

        $batches = $batchQuery->orderByRaw('MAX(en_time) DESC')->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Batch History');

        // Headers matching CI4: Batch, University Address, Admission Taken In, Academic Year, Candidates, Created
        $headers = ['Batch', 'University Address', 'Admission Taken In', 'Academic Year', 'Candidates', 'Created'];
        $sheet->fromArray($headers, null, 'A1');

        $dataRows = [];
        foreach ($batches as $b) {
            $created = '';
            if (! empty($b->en_time)) {
                $created = is_numeric($b->en_time)
                    ? date('d/m/Y H:i', (int) $b->en_time)
                    : (strtotime($b->en_time) ? date('d/m/Y H:i', strtotime($b->en_time)) : $b->en_time);
            }

            $dataRows[] = [
                $b->array_space,
                preg_replace('~\s*<br\s*/?>\s*~i', ', ', (string) $b->clg_add),
                $b->admission_taken_in,
                $b->admission_taken_year,
                (int) $b->student_count,
                $created,
            ];
        }

        if (! empty($dataRows)) {
            $sheet->fromArray($dataRows, null, 'A2');
        }

        // Auto-size columns
        foreach (range('A', 'F') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = 'student_batches_'.date('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function importForm(): Response
    {
        return Inertia::render('Students/Import', [
            'title' => 'Import Candidates from Excel',
        ]);
    }
}
