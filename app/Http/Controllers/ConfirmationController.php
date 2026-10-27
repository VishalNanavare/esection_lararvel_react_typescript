<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\MatchesColleges;
use App\Http\Controllers\Concerns\SanitizesSpreadsheetCells;
use App\Models\AcademicYear;
use App\Models\ActivityLog;
use App\Models\CollegeDetail;
use App\Models\ConfStudData;
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
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ConfirmationController extends Controller
{
    use MatchesColleges;
    use SanitizesSpreadsheetCells;

    /** Mirrors esection_ci4's ConfirmationService::CONF_FROM_OPTIONS exactly. */
    private const CONF_FROM_OPTIONS = ['Ranade Bhavan', 'Dr Babasaheb Ambedkar Bhavan', 'other'];

    /** Mirrors esection_ci4's ConfirmationService::CLARIFICATION_OPTIONS exactly. */
    private const CLARIFICATION_OPTIONS = ['old', 'TC'];

    /** Mirrors esection_ci4's ConfirmationService::NAME_CHANGE_OPTIONS exactly. */
    private const NAME_CHANGE_OPTIONS = ['Gazette', 'Marriage Certificate'];

    /**
     * Display candidate eligibility confirmation portal.
     */
    public function index(Request $request): Response
    {
        $selectedYear = trim((string) $request->input('year', ''));
        $selectedStream = trim((string) $request->input('stream', ''));
        $selectedUniversity = trim((string) $request->input('university', ''));
        $searchQuery = trim((string) $request->input('q', ''));

        [$colleges, $matchCollege] = $this->buildCollegeMatcher();

        $query = StudentDetail::query()
            ->leftJoin('conf_stud_data', 'student_details.id', '=', 'conf_stud_data.student_id')
            ->select(
                'student_details.*',
                'conf_stud_data.id as confirmation_id',
                'conf_stud_data.array_space as confirmation_array_space',
                'conf_stud_data.mig_TC as conf_mig_tc',
                'conf_stud_data.p_degree as conf_p_degree',
                'conf_stud_data.s_marks as conf_s_marks'
            );

        if ($selectedYear !== '') {
            $query->where('student_details.admission_taken_year', $selectedYear);
        }

        if ($selectedStream !== '') {
            $query->where('student_details.admission_taken_in', $selectedStream);
        }

        if ($selectedUniversity !== '') {
            $col = $matchCollege($selectedUniversity);
            if ($col) {
                $query->where(function ($q) use ($selectedUniversity, $col) {
                    $q->where('student_details.clg_add', $selectedUniversity)
                        ->orWhere('student_details.clg_add', 'like', "%{$selectedUniversity}%");
                    if (! empty($col->Address)) {
                        $q->orWhere('student_details.clg_add', 'like', "%{$col->Address}%");
                    }
                    if (! empty($col->Name)) {
                        $q->orWhere('student_details.clg_add', 'like', "%{$col->Name}%");
                    }
                });
            } else {
                $query->where('student_details.clg_add', 'like', "%{$selectedUniversity}%");
            }
        }

        if ($searchQuery !== '') {
            $query->where(function ($q) use ($searchQuery) {
                $q->where('student_details.student_name', 'like', "%{$searchQuery}%")
                    ->orWhere('student_details.eligibility_case_no', 'like', "%{$searchQuery}%")
                    ->orWhere('student_details.clg_add', 'like', "%{$searchQuery}%");
            });
        }

        $selectedStatus = trim((string) $request->input('status', ''));

        if ($selectedStatus === 'pending') {
            $query->whereNull('conf_stud_data.id');
        } elseif ($selectedStatus === 'confirmed') {
            $query->whereNotNull('conf_stud_data.id');
        }

        $students = $query
            ->orderByRaw('conf_stud_data.id IS NULL DESC')
            ->orderBy('student_details.id', 'desc')
            ->paginate(50)
            ->withQueryString();

        $students->getCollection()->transform(function ($s) use ($matchCollege) {
            $col = $matchCollege($s->clg_add);
            $s->university_name = $col ? trim((string) $col->Name, " ,\t\n\r\0\x0B") : '';
            $rawFees = ($col && $col->fees !== null && $col->fees !== '') ? trim((string) $col->fees) : '';
            $s->fees = ($rawFees !== '' && $rawFees !== '0') ? $rawFees : '';

            return $s;
        });

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

        $distinctUnivs = StudentDetail::whereNotNull('clg_add')
            ->where('clg_add', '!=', '')
            ->distinct()
            ->pluck('clg_add');

        $universityOptions = $this->buildUniversityOptions($distinctUnivs, $matchCollege);

        return Inertia::render('Confirmations/Index', [
            'title' => 'Confirmation Portal (Pending For Approval)',
            'students' => $students,
            'academicYears' => $academicYears,
            'streams' => $streams,
            'universities' => $universityOptions,
            'filters' => [
                'year' => $selectedYear,
                'stream' => $selectedStream,
                'university' => $selectedUniversity,
                'q' => $searchQuery,
                'status' => $selectedStatus,
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

                $check = $this->mapChecklist($validated['checklist'][$studentId] ?? []);

                ConfStudData::create([
                    'student_id' => $student->id,
                    'case_no' => $student->eligibility_case_no ?? '',
                    'name' => $student->student_name,
                    'stream' => $student->admission_taken_in ?? '',
                    'uni_add' => $student->clg_add ?? '',
                    'acd_year' => $student->admission_taken_year ?? '',
                    ...$check,
                    'array_space' => $arraySpace,
                    'en_time' => $nowTime,
                    'en_by' => $username,
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
        $university = trim((string) $request->input('university', ''));
        $studentName = trim((string) $request->input('student_name', ''));

        $query = ConfStudData::query();

        if ($batch !== '') {
            $query->where('array_space', 'like', "%{$batch}%");
        }
        if ($stream !== '') {
            $query->where('stream', $stream);
        }
        if ($university !== '') {
            $matchedColleges = CollegeDetail::where('Name', 'like', "%{$university}%")->get();
            $matchedCollegeIds = $matchedColleges->pluck('id')->map(fn ($id) => (string) $id)->toArray();

            $matchedStudentIds = StudentDetail::where(function ($sq) use ($university, $matchedCollegeIds) {
                $sq->where('clg_add', 'like', "%{$university}%");
                if (! empty($matchedCollegeIds)) {
                    $sq->orWhereIn('clg_add', $matchedCollegeIds);
                }
            })->pluck('id')->toArray();

            $query->where(function ($q) use ($university, $matchedCollegeIds, $matchedStudentIds) {
                $q->where('uni_add', 'like', "%{$university}%");
                if (! empty($matchedCollegeIds)) {
                    $q->orWhereIn('uni_add', $matchedCollegeIds);
                }
                if (! empty($matchedStudentIds)) {
                    $q->orWhereIn('student_id', $matchedStudentIds)
                        ->orWhereIn('name', array_map('strval', $matchedStudentIds));
                }
            });
        }
        if ($studentName !== '') {
            $matchedStudentIds = StudentDetail::where(function ($sq) use ($studentName) {
                $sq->where('student_name', 'like', "%{$studentName}%")
                    ->orWhere('student_nee_name', 'like', "%{$studentName}%");
            })->pluck('id')->toArray();

            $query->where(function ($q) use ($studentName, $matchedStudentIds) {
                $q->where('name', 'like', "%{$studentName}%");
                if (! empty($matchedStudentIds)) {
                    $q->orWhereIn('student_id', $matchedStudentIds)
                        ->orWhereIn('name', array_map('strval', $matchedStudentIds));
                }
            });
        }
        if ($search !== '') {
            $matchedSearchStudentIds = StudentDetail::where(function ($sq) use ($search) {
                $sq->where('student_name', 'like', "%{$search}%")
                    ->orWhere('student_nee_name', 'like', "%{$search}%");
            })->pluck('id')->toArray();

            $query->where(function ($q) use ($search, $matchedSearchStudentIds) {
                $q->where('array_space', 'like', "%{$search}%")
                    ->orWhere('case_no', 'like', "%{$search}%")
                    ->orWhere('uni_add', 'like', "%{$search}%")
                    ->orWhere('name', 'like', "%{$search}%");
                if (! empty($matchedSearchStudentIds)) {
                    $q->orWhereIn('student_id', $matchedSearchStudentIds)
                        ->orWhereIn('name', array_map('strval', $matchedSearchStudentIds));
                }
            });
        }

        // Group by confirmation batch
        $batchSpacesQuery = (clone $query)
            ->select('array_space')
            ->whereNotNull('array_space')
            ->where('array_space', '!=', '')
            ->groupBy('array_space')
            ->orderByRaw('MAX(id) DESC');

        $paginatedBatches = $batchSpacesQuery->paginate(15)->withQueryString();

        $pageSpaces = collect($paginatedBatches->items())
            ->pluck('array_space')
            ->filter()
            ->values()
            ->toArray();

        if (! empty($pageSpaces)) {
            $batchRecords = ConfStudData::whereIn('array_space', $pageSpaces)
                ->orderBy('id', 'asc')
                ->get();

            $studentIds = $batchRecords->pluck('student_id')->filter()->unique()->toArray();
            $numericNames = $batchRecords->filter(fn ($r) => is_numeric($r->name))->pluck('name')->map(fn ($n) => (int) $n)->unique()->toArray();
            $allStudentIds = array_unique(array_merge($studentIds, $numericNames));

            $studentsById = ! empty($allStudentIds)
                ? StudentDetail::whereIn('id', $allStudentIds)->get()->keyBy('id')
                : collect();

            $collegeIdsFromStudents = $studentsById->pluck('clg_add')
                ->filter(fn ($c) => is_numeric($c))
                ->map(fn ($c) => (int) $c)
                ->toArray();

            $collegeIdsFromUniAdd = $batchRecords->pluck('uni_add')
                ->filter(fn ($c) => is_numeric($c))
                ->map(fn ($c) => (int) $c)
                ->toArray();

            $collegeIds = array_unique(array_merge($collegeIdsFromStudents, $collegeIdsFromUniAdd));

            $collegesById = ! empty($collegeIds)
                ? CollegeDetail::whereIn('id', $collegeIds)->get()->keyBy('id')
                : collect();

            $groupedBySpace = $batchRecords->groupBy('array_space');

            $enrichedBatches = collect($paginatedBatches->items())->map(function ($item) use ($groupedBySpace, $studentsById, $collegesById) {
                $space = (string) $item->array_space;
                $records = $groupedBySpace->get($space, collect());
                $first = $records->first();

                $candidates = $records->map(function ($r) use ($studentsById, $collegesById) {
                    $student = null;
                    if (! empty($r->student_id) && isset($studentsById[$r->student_id])) {
                        $student = $studentsById[$r->student_id];
                    } elseif (is_numeric($r->name) && isset($studentsById[(int) $r->name])) {
                        $student = $studentsById[(int) $r->name];
                    }

                    $displayName = $student ? $student->student_name : $r->name;
                    $displayNeeName = $student && ! empty($student->student_nee_name) && $student->student_nee_name !== '-'
                        ? $student->student_nee_name
                        : null;

                    $displayUniversity = '';
                    if (! empty($r->uni_add) && is_numeric($r->uni_add) && isset($collegesById[(int) $r->uni_add])) {
                        $displayUniversity = $collegesById[(int) $r->uni_add]->Name;
                    } elseif ($student && ! empty($student->clg_add) && is_numeric($student->clg_add) && isset($collegesById[(int) $student->clg_add])) {
                        $displayUniversity = $collegesById[(int) $student->clg_add]->Name;
                    } elseif (! empty($r->uni_add) && ! is_numeric($r->uni_add) && $r->uni_add !== '-') {
                        $displayUniversity = $r->uni_add;
                    } elseif ($student && ! empty($student->clg_add)) {
                        $displayUniversity = $student->clg_add;
                    }

                    return [
                        'id' => $r->id,
                        'student_id' => $student?->id ?? (is_numeric($r->name) ? (int) $r->name : null),
                        'student_name' => $displayName,
                        'student_nee_name' => $displayNeeName,
                        'university_name' => $displayUniversity,
                        'college_address' => $student?->clg_add ?? '',
                        'case_no' => $r->case_no,
                        'mig_tc' => $r->mig_TC,
                        'p_degree' => $r->p_degree,
                        's_marks' => $r->s_marks,
                        'letter_no_date' => $r->letter_no_date,
                        'remark' => $r->remark,
                        'conf_from' => $r->conf_from,
                        'conf_from_select' => $r->conf_from_select,
                        'conf_from_text' => $r->conf_from_text,
                        'etc_data' => $r->etc_data,
                    ];
                })->values()->toArray();

                $batchUniv = '';
                if (! empty($first?->uni_add) && is_numeric($first->uni_add) && isset($collegesById[(int) $first->uni_add])) {
                    $batchUniv = $collegesById[(int) $first->uni_add]->Name;
                } elseif (! empty($candidates[0]['university_name'])) {
                    $batchUniv = $candidates[0]['university_name'];
                } elseif (! empty($first?->uni_add)) {
                    $batchUniv = $first->uni_add;
                }

                return [
                    'array_space' => $space,
                    'stream' => $first?->stream ?? '',
                    'uni_add' => $batchUniv,
                    'en_time' => $first?->en_time ?? '',
                    'en_by' => $first?->en_by ?? 'Staff',
                    'dd_no' => $first?->dd_no ?? null,
                    'bank_name' => $first?->bank_name ?? null,
                    'dd_date' => $first?->dd_date ?? null,
                    'dd_amount' => $first?->dd_amount ?? null,
                    'student_count' => count($candidates),
                    'candidates' => $candidates,
                ];
            });

            $paginatedBatches->setCollection($enrichedBatches);
        }

        // Prepare Select2 streams options
        $streamDivisions = StreamDetail::whereNotNull('Division')
            ->where('Division', '!=', '')
            ->orderBy('Division', 'asc')
            ->pluck('Division')
            ->toArray();
        $legacyStreams = [
            'MA', 'MCOM', 'MA Edu', 'PGDFM', 'PGDORM',
            'MSC IT', 'MSC MATHS', 'MMS', 'BAF', 'BMS',
            'FYBA', 'SYBA', 'TYBA', 'FYBCOM', 'SYBCOM', 'TYBCOM',
        ];
        $confirmedStreams = ConfStudData::whereNotNull('stream')
            ->where('stream', '!=', '')
            ->distinct()
            ->pluck('stream')
            ->toArray();
        $allStreams = array_values(array_unique(array_merge($streamDivisions, $legacyStreams, $confirmedStreams)));
        sort($allStreams, SORT_NATURAL | SORT_FLAG_CASE);
        $streams = array_map(fn ($s) => [
            'id' => $s,
            'text' => $s,
            'value' => $s,
            'label' => $s,
        ], $allStreams);

        // Prepare Select2 universities options
        $univQuery = CollegeDetail::query();
        try {
            if (\Illuminate\Support\Facades\Schema::hasColumn('college_details', 'is_active')) {
                $univQuery->where(function ($q) {
                    $q->where('is_active', true)->orWhereNull('is_active');
                });
            }
        } catch (\Throwable) {}

        $isMysql = in_array(\Illuminate\Support\Facades\DB::connection()->getDriverName(), ['mysql', 'mariadb']);

        if ($isMysql) {
            $univQuery->whereRaw('Name NOT REGEXP "^[0-9]+$"');
        }

        $collegeList = $univQuery->whereNotNull('Name')
            ->where('Name', '!=', '')
            ->where('Name', '!=', '-')
            ->orderBy('Name', 'asc')
            ->pluck('Name')
            ->map(fn ($n) => trim((string) $n, " ,\t\n\r\0\x0B"))
            ->filter(fn ($n) => ! empty($n) && ! is_numeric($n) && $n !== '-')
            ->unique()
            ->values()
            ->toArray();

        $confQuery = ConfStudData::whereNotNull('uni_add')
            ->where('uni_add', '!=', '')
            ->where('uni_add', '!=', '-');

        if ($isMysql) {
            $confQuery->whereRaw('uni_add NOT REGEXP "^[0-9]+$"');
        }

        $confirmedUnivs = $confQuery
            ->distinct()
            ->pluck('uni_add')
            ->map(fn ($n) => trim((string) $n, " ,\t\n\r\0\x0B"))
            ->filter(fn ($n) => ! empty($n) && ! is_numeric($n) && $n !== '-')
            ->unique()
            ->values()
            ->toArray();

        $allUnivNames = array_values(array_unique(array_merge($collegeList, $confirmedUnivs)));
        sort($allUnivNames, SORT_NATURAL | SORT_FLAG_CASE);

        $allUnivs = array_map(fn ($name) => [
            'id' => $name,
            'value' => $name,
            'label' => $name,
            'text' => $name,
        ], $allUnivNames);

        return Inertia::render('Confirmations/History', [
            'title' => 'Confirmation Batch History',
            'batches' => $paginatedBatches,
            'streams' => $streams,
            'universities' => $allUnivs,
            'filters' => [
                'year' => $year,
                'stream' => $stream,
                'university' => $university,
                'student_name' => $studentName,
                'batch' => $batch,
                'q' => $search,
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
        abort_unless(Setting::enabled('feature_delete_enabled'), 403, 'Deleting records is currently disabled by an administrator.');

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
        abort_unless(Setting::enabled('feature_export_enabled'), 403, 'Exporting records is currently disabled by an administrator.');

        $selectedYear = trim((string) $request->input('year', ''));
        $selectedStream = trim((string) $request->input('stream', ''));
        $selectedUniversity = trim((string) $request->input('university', ''));
        $searchQuery = trim((string) $request->input('q', ''));

        [$colleges, $matchCollege] = $this->buildCollegeMatcher();

        $query = StudentDetail::query()
            ->leftJoin('conf_stud_data', 'student_details.id', '=', 'conf_stud_data.student_id')
            ->select(
                'student_details.student_name',
                'student_details.student_nee_name',
                'student_details.eligibility_case_no',
                'student_details.clg_add',
                'student_details.admission_taken_year',
                'student_details.admission_taken_in',
                'conf_stud_data.id as confirmation_id'
            );

        if ($selectedYear !== '') {
            $query->where('student_details.admission_taken_year', $selectedYear);
        }
        if ($selectedStream !== '') {
            $query->where('student_details.admission_taken_in', $selectedStream);
        }
        if ($selectedUniversity !== '') {
            $col = $matchCollege($selectedUniversity);
            if ($col) {
                $query->where(function ($q) use ($selectedUniversity, $col) {
                    $q->where('student_details.clg_add', $selectedUniversity)
                        ->orWhere('student_details.clg_add', 'like', "%{$selectedUniversity}%");
                    if (! empty($col->Address)) {
                        $q->orWhere('student_details.clg_add', 'like', "%{$col->Address}%");
                    }
                    if (! empty($col->Name)) {
                        $q->orWhere('student_details.clg_add', 'like', "%{$col->Name}%");
                    }
                });
            } else {
                $query->where('student_details.clg_add', 'like', "%{$selectedUniversity}%");
            }
        }
        if ($searchQuery !== '') {
            $query->where(function ($q) use ($searchQuery) {
                $q->where('student_details.student_name', 'like', "%{$searchQuery}%")
                    ->orWhere('student_details.eligibility_case_no', 'like', "%{$searchQuery}%")
                    ->orWhere('student_details.clg_add', 'like', "%{$searchQuery}%");
            });
        }

        $records = $query->orderBy('student_details.id', 'desc')->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Confirmations');

        $headers = [
            'Candidate', 'Nee Name', 'Case No.', 'University Name', 'Fees', 'Target University Address',
            'Academic Year', 'Stream', 'Status',
        ];
        $sheet->fromArray($headers, null, 'A1');

        $rows = [];
        foreach ($records as $r) {
            $col = $matchCollege($r->clg_add);
            $univName = $col ? trim((string) $col->Name, " ,\t\n\r\0\x0B") : '';
            $rawFees = ($col && $col->fees !== null && $col->fees !== '') ? trim((string) $col->fees) : '';
            $fees = ($rawFees !== '' && $rawFees !== '0') ? "₹{$rawFees}" : '—';

            $rows[] = $this->sanitizeRow([
                $r->student_name,
                $r->student_nee_name ?: '—',
                $r->eligibility_case_no,
                $univName ?: '—',
                $fees,
                $r->clg_add,
                $r->admission_taken_year,
                $r->admission_taken_in,
                $r->confirmation_id ? 'Confirmed' : 'Pending',
            ]);
        }

        if (! empty($rows)) {
            $sheet->fromArray($rows, null, 'A2');
        }

        foreach (range('A', 'I') as $col) {
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

    /**
     * Whitelists and shapes one student's raw checklist submission exactly
     * like esection_ci4's ConfirmationService::mapChecklist(): the four
     * clarification fields (conf_from/conf_from_text/conf_from_select/
     * etc_data) only mean anything when Migration/TC is Yes, so they are
     * force-cleared otherwise rather than trusting whatever the client sent.
     *
     * @param  array<string, mixed>  $raw
     * @return array<string, string>
     */
    private function mapChecklist(array $raw): array
    {
        $migTc = ($raw['mig_tc'] ?? '') === 'Yes' ? 'Yes' : 'No';

        $confFrom = '';
        $confFromText = '';
        $confFromSelect = '';
        $etcData = '';

        if ($migTc === 'Yes') {
            $confFrom = in_array($raw['conf_from'] ?? '', self::CONF_FROM_OPTIONS, true) ? $raw['conf_from'] : '';
            $confFromText = $confFrom === 'other' ? trim((string) ($raw['conf_from_text'] ?? '')) : '';
            $confFromSelect = in_array($raw['conf_from_select'] ?? '', self::CLARIFICATION_OPTIONS, true) ? $raw['conf_from_select'] : '';
            $etcData = in_array($raw['etc_data'] ?? '', self::NAME_CHANGE_OPTIONS, true) ? $raw['etc_data'] : '';
        }

        return [
            'mig_TC' => $migTc,
            'p_degree' => ($raw['p_degree'] ?? '') === 'Yes' ? 'Yes' : 'No',
            's_marks' => ($raw['s_marks'] ?? '') === 'Yes' ? 'Yes' : 'No',
            'letter_no_date' => trim((string) ($raw['letter_no_date'] ?? '')),
            'remark' => trim((string) ($raw['remark'] ?? '')),
            'conf_from' => $confFrom,
            'conf_from_text' => $confFromText,
            'conf_from_select' => $confFromSelect,
            'etc_data' => $etcData,
        ];
    }
}
