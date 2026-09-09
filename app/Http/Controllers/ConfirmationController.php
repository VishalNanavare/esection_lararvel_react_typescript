<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\ActivityLog;
use App\Models\ConfStudData;
use App\Models\StreamDetail;
use App\Models\StudentDetail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ConfirmationController extends Controller
{
    /**
     * Display candidate eligibility confirmation portal.
     */
    public function index(Request $request): Response
    {
        $selectedYear = trim((string) $request->input('year', ''));
        $selectedStream = trim((string) $request->input('stream', ''));
        $searchQuery = trim((string) $request->input('q', ''));

        $query = StudentDetail::query()
            ->leftJoin('conf_stud_data', 'student_details.id', '=', 'conf_stud_data.student_id')
            ->select(
                'student_details.*',
                'conf_stud_data.id as confirmation_id',
                'conf_stud_data.array_space as confirmation_array_space',
                'conf_stud_data.mig_tc as conf_mig_tc',
                'conf_stud_data.p_degree as conf_p_degree',
                'conf_stud_data.s_marks as conf_s_marks',
                'conf_stud_data.dd_no as conf_dd_no',
                'conf_stud_data.dd_amount as conf_dd_amount'
            );

        if ($selectedYear !== '') {
            $query->where('student_details.admission_taken_year', $selectedYear);
        }

        if ($selectedStream !== '') {
            $query->where('student_details.admission_taken_in', $selectedStream);
        }

        if ($searchQuery !== '') {
            $query->where(function ($q) use ($searchQuery) {
                $q->where('student_details.student_name', 'like', "%{$searchQuery}%")
                    ->orWhere('student_details.eligibility_case_no', 'like', "%{$searchQuery}%")
                    ->orWhere('student_details.clg_add', 'like', "%{$searchQuery}%");
            });
        }

        $students = $query->orderBy('student_details.id', 'desc')->paginate(25)->withQueryString();

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

        return Inertia::render('Confirmations/Index', [
            'title' => 'Demand Draft (DD) Payment Confirmation Portal',
            'students' => $students,
            'academicYears' => $academicYears,
            'streams' => $streams,
            'filters' => [
                'year' => $selectedYear,
                'stream' => $selectedStream,
                'q' => $searchQuery,
            ],
        ]);
    }

    /**
     * Store confirmation batch for selected students.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'student_ids' => 'required|array|min:1|max:200',
            'student_ids.*' => 'required|integer',
            'checklist' => 'required|array',
            'dd_no' => 'nullable|string|max:50',
            'dd_amount' => 'nullable|numeric|min:0',
            'bank_name' => 'nullable|string|max:150',
            'dd_date' => 'nullable|date',
        ]);

        $username = Auth::user()?->username ?? 'staff';

        // Filter out already confirmed candidates
        $alreadyConfirmed = ConfStudData::whereIn('student_id', $validated['student_ids'])
            ->pluck('student_id')
            ->toArray();

        $pendingIds = array_diff($validated['student_ids'], $alreadyConfirmed);

        if (empty($pendingIds)) {
            return response()->json([
                'status' => 'error',
                'message' => 'All selected candidates already have an eligibility confirmation recorded.',
            ], 422);
        }

        $students = StudentDetail::whereIn('id', $pendingIds)->get()->keyBy('id');

        // Generate confirmation batch array_space
        $arraySpace = (string) time();
        while (ConfStudData::where('array_space', $arraySpace)->exists()) {
            $arraySpace = (string) (time() + rand(1, 999));
        }

        DB::beginTransaction();
        try {
            $inserted = 0;
            $nowTime = date('Y-m-d H:i:s');

            foreach ($pendingIds as $studentId) {
                $student = $students->get($studentId);
                if (! $student) {
                    continue;
                }

                $check = $validated['checklist'][$studentId] ?? [];

                $migTc = ($check['mig_tc'] ?? '') === 'Yes' ? 'Yes' : 'No';
                $pDegree = ($check['p_degree'] ?? '') === 'Yes' ? 'Yes' : 'No';
                $sMarks = ($check['s_marks'] ?? '') === 'Yes' ? 'Yes' : 'No';

                ConfStudData::create([
                    'student_id' => $student->id,
                    'case_no' => $student->eligibility_case_no ?? '',
                    'name' => $student->student_name,
                    'stream' => $student->admission_taken_in ?? '',
                    'uni_add' => $student->clg_add ?? '',
                    'acd_year' => $student->admission_taken_year ?? '',
                    'mig_TC' => $migTc,
                    'p_degree' => $pDegree,
                    's_marks' => $sMarks,
                    'letter_no_date' => trim($check['letter_no_date'] ?? ''),
                    'remark' => trim($check['remark'] ?? ''),
                    'conf_from' => trim($check['conf_from'] ?? ''),
                    'conf_from_text' => trim($check['conf_from_text'] ?? ''),
                    'conf_from_select' => trim($check['conf_from_select'] ?? ''),
                    'etc_data' => trim($check['etc_data'] ?? ''),
                    'array_space' => $arraySpace,
                    'en_time' => $nowTime,
                    'en_by' => $username,
                    'dd_no' => $validated['dd_no'] ?? null,
                    'dd_amount' => $validated['dd_amount'] ?? null,
                    'bank_name' => $validated['bank_name'] ?? null,
                    'dd_date' => $validated['dd_date'] ?? null,
                ]);

                $inserted++;
            }

            ActivityLog::record(
                'confirmation.create',
                "Confirmed eligibility for {$inserted} candidate(s) under Batch #{$arraySpace}."
            );

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Eligibility confirmed for {$inserted} candidate(s).",
                'array_space' => $arraySpace,
                'count' => $inserted,
                'skipped' => count($validated['student_ids']) - $inserted,
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'status' => 'error',
                'message' => 'Failed to save confirmation: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Confirmation History browse page.
     */
    public function history(Request $request): Response
    {
        $year = trim((string) $request->input('year', ''));
        $stream = trim((string) $request->input('stream', ''));
        $search = trim((string) $request->input('q', ''));
        $batch = trim((string) $request->input('batch', ''));

        $query = ConfStudData::query();

        if ($batch !== '') {
            $query->where('array_space', $batch);
        }
        if ($stream !== '') {
            $query->where('stream', $stream);
        }
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('case_no', 'like', "%{$search}%")
                    ->orWhere('uni_add', 'like', "%{$search}%");
            });
        }

        // Group by confirmation batch
        $batchQuery = (clone $query)
            ->selectRaw('
                array_space,
                MAX(uni_add) as uni_add,
                MAX(stream) as stream,
                MAX(en_time) as en_time,
                MAX(en_by) as en_by,
                MAX(dd_no) as dd_no,
                MAX(dd_amount) as dd_amount,
                COUNT(*) as student_count
            ')
            ->whereNotNull('array_space')
            ->where('array_space', '!=', '')
            ->groupBy('array_space')
            ->orderByRaw('MAX(id) DESC');

        $batches = $batchQuery->paginate(20)->withQueryString();

        return Inertia::render('Confirmations/History', [
            'title' => 'Confirmation Batch History',
            'batches' => $batches,
            'filters' => [
                'year' => $year,
                'stream' => $stream,
                'q' => $search,
                'batch' => $batch,
            ],
        ]);
    }

    /**
     * Details of a confirmed batch.
     */
    public function batchDetail(string $arraySpace): Response|JsonResponse
    {
        $confirmations = ConfStudData::where('array_space', $arraySpace)
            ->orderBy('id', 'asc')
            ->get();

        if (request()->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'array_space' => $arraySpace,
                'confirmations' => $confirmations,
            ]);
        }

        return Inertia::render('Confirmations/BatchDetail', [
            'title' => "Confirmation Batch #{$arraySpace}",
            'arraySpace' => $arraySpace,
            'confirmations' => $confirmations,
        ]);
    }

    /**
     * Delete a confirmation record.
     */
    public function destroy(int $id): JsonResponse|RedirectResponse
    {
        $record = ConfStudData::findOrFail($id);
        $caseNo = $record->case_no;
        $record->delete();

        ActivityLog::record('confirmation.delete', "Deleted confirmation record for Case #{$caseNo}.");

        if (request()->wantsJson()) {
            return response()->json(['status' => 'success', 'message' => 'Confirmation deleted.']);
        }

        return back()->with('success', 'Confirmation record deleted successfully.');
    }

    /**
     * Export confirmations to Excel.
     */
    public function export(Request $request): StreamedResponse
    {
        $selectedYear = trim((string) $request->input('year', ''));
        $selectedStream = trim((string) $request->input('stream', ''));

        $query = StudentDetail::query()
            ->leftJoin('conf_stud_data', 'student_details.id', '=', 'conf_stud_data.student_id')
            ->select(
                'student_details.student_name',
                'student_details.student_nee_name',
                'student_details.eligibility_case_no',
                'student_details.clg_add',
                'student_details.admission_taken_year',
                'student_details.admission_taken_in',
                'conf_stud_data.mig_TC',
                'conf_stud_data.p_degree',
                'conf_stud_data.s_marks',
                'conf_stud_data.dd_no',
                'conf_stud_data.dd_amount',
                'conf_stud_data.bank_name',
                'conf_stud_data.dd_date'
            );

        if ($selectedYear !== '') {
            $query->where('student_details.admission_taken_year', $selectedYear);
        }
        if ($selectedStream !== '') {
            $query->where('student_details.admission_taken_in', $selectedStream);
        }

        $records = $query->orderBy('conf_stud_data.id', 'desc')->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Confirmations');

        $headers = [
            'Candidate Name', 'Nee Name', 'Case No.', 'Target University',
            'Academic Year', 'Program', 'Mig / TC', 'Pass / Degree',
            'Statement of Marks', 'DD No.', 'DD Amount', 'Bank Name', 'DD Date',
        ];
        $sheet->fromArray($headers, null, 'A1');

        $rows = [];
        foreach ($records as $r) {
            $rows[] = [
                $r->student_name,
                $r->student_nee_name ?: '—',
                $r->eligibility_case_no,
                $r->clg_add,
                $r->admission_taken_year,
                $r->admission_taken_in,
                $r->mig_tc,
                $r->p_degree,
                $r->s_marks,
                $r->dd_no,
                $r->dd_amount,
                $r->bank_name,
                $r->dd_date,
            ];
        }

        if (! empty($rows)) {
            $sheet->fromArray($rows, null, 'A2');
        }

        foreach (range('A', 'M') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $filename = 'confirmations_'.date('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
