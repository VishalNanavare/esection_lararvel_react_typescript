<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\MatchesColleges;
use App\Http\Controllers\Concerns\SanitizesSpreadsheetCells;
use App\Mail\RawHtmlMail;
use App\Models\AcademicYear;
use App\Models\CollegeDetail;
use App\Models\EmailLog;
use App\Models\Setting;
use App\Models\StreamDetail;
use App\Models\StudentDetail;
use App\Models\StudentReminder;
use App\Models\ActivityLog;
use App\Models\UniversityReminderBatch;
use App\Models\UniversityReminderNote;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReminderController extends Controller
{
    use MatchesColleges;
    use SanitizesSpreadsheetCells;

    /**
     * University Marksheet Reminder Portal - Student Selection Screen.
     */
    public function universityIndex(Request $request): Response
    {
        $selectedYear = trim((string) $request->input('acd_year', ''));
        $selectedStream = trim((string) $request->input('stream', ''));
        $selectedColg = trim((string) $request->input('clg_add', ''));
        $selectedStudentName = trim((string) $request->input('student_name', ''));
        $selectedReminderStatus = trim((string) $request->input('reminder_status', ''));
        $selectedVerificationStatus = trim((string) $request->input('verification_status', 'pending'));
        if ($selectedVerificationStatus === '') {
            $selectedVerificationStatus = 'pending';
        }

        [$colleges, $matchCollege] = $this->buildCollegeMatcher();

        $baseQuery = StudentDetail::query()
            ->whereNotNull('student_name')
            ->where('student_name', '!=', '');

        if ($selectedStudentName !== '') {
            $baseQuery->where('student_name', 'like', "%{$selectedStudentName}%");
        }
        if ($selectedYear !== '') {
            $baseQuery->where('admission_taken_year', $selectedYear);
        }
        if ($selectedStream !== '') {
            $baseQuery->where('admission_taken_in', $selectedStream);
        }
        if ($selectedColg !== '') {
            $col = $matchCollege($selectedColg);
            if ($col) {
                $baseQuery->where(function ($q) use ($selectedColg, $col) {
                    $cleanName = trim((string) $col->Name, " ,\t\n\r\0\x0B");
                    $q->where('clg_add', $selectedColg)
                        ->orWhere('clg_add', 'like', "%{$selectedColg}%");
                    if (! empty($cleanName)) {
                        $q->orWhere('clg_add', 'like', "%{$cleanName}%");
                    }
                    if (! empty($col->Address)) {
                        $q->orWhere('clg_add', 'like', "%{$col->Address}%");
                        $cleanAddr = trim(strip_tags((string) $col->Address));
                        if ($cleanAddr !== $col->Address && ! empty($cleanAddr)) {
                            $q->orWhere('clg_add', 'like', "%{$cleanAddr}%");
                        }
                    }
                });
            } else {
                $baseQuery->where('clg_add', 'like', "%{$selectedColg}%");
            }
        }

        // Summary counts for current university/year/stream filter scope
        $totalStudents = (clone $baseQuery)->count();
        $verifiedStudents = (clone $baseQuery)->verified()->count();
        $excludedStudents = (clone $baseQuery)->excluded()->count();
        $eligibleStudents = (clone $baseQuery)->eligibleForReminder()->count();
        $pendingStudents = $eligibleStudents;

        $query = clone $baseQuery;

        if ($selectedVerificationStatus === 'verified') {
            $query->verified();
        } elseif ($selectedVerificationStatus === 'excluded') {
            $query->excluded();
        } elseif ($selectedVerificationStatus === 'pending' || $selectedVerificationStatus === 'eligible') {
            $query->eligibleForReminder();
        }

        if ($selectedReminderStatus !== '') {
            if ($selectedReminderStatus === '0' || $selectedReminderStatus === 'none') {
                $query->has('universityReminderNotes', '=', 0);
            } elseif ($selectedReminderStatus === '1') {
                $query->has('universityReminderNotes', '=', 1);
            } elseif ($selectedReminderStatus === '2') {
                $query->has('universityReminderNotes', '=', 2);
            } elseif ($selectedReminderStatus === '2+' || $selectedReminderStatus === 'multiple') {
                $query->has('universityReminderNotes', '>=', 2);
            }
        }

        $students = $query->with('confirmation')->orderBy('id', 'desc')->paginate(30)->withQueryString();

        // Calculate reminder note counts for the displayed students
        $studentIds = $students->pluck('id')->toArray();
        $noteCounts = UniversityReminderNote::whereIn('student_id', $studentIds)
            ->selectRaw('student_id, count(*) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id')
            ->toArray();

        // Attach note counts, matched college info, and computed verification statuses
        $students->getCollection()->transform(function ($item) use ($noteCounts, $matchCollege) {
            $item->reminder_note_count = $noteCounts[$item->id] ?? 0;
            $col = $matchCollege($item->clg_add);
            $item->university_name = $col ? trim((string) $col->Name, " ,\t\n\r\0\x0B") : '';
            $rawFees = ($col && $col->fees !== null && $col->fees !== '') ? trim((string) $col->fees) : '';
            $item->fees = ($rawFees !== '' && $rawFees !== '0') ? $rawFees : '';

            $isVerified = $item->isVerified();
            $isExcluded = $item->isExcluded();
            $item->is_verified = $isVerified;
            $item->is_excluded = $isExcluded;
            $item->is_eligible = ! $isVerified && ! $isExcluded;
            $item->computed_status = $isVerified ? 'verified' : ($isExcluded ? 'excluded' : ($item->reminder_note_count > 0 ? 'reminder_sent' : 'pending'));

            return $item;
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

        return Inertia::render('Reminders/University', [
            'students' => $students,
            'academicYears' => $academicYears,
            'streams' => $streams,
            'universities' => $universityOptions,
            'summary' => [
                'total' => $totalStudents,
                'verified' => $verifiedStudents,
                'pending' => $pendingStudents,
                'eligible' => $eligibleStudents,
                'excluded' => $excludedStudents,
            ],
            'filters' => [
                'acd_year' => $selectedYear,
                'stream' => $selectedStream,
                'clg_add' => $selectedColg,
                'student_name' => $selectedStudentName,
                'reminder_status' => $selectedReminderStatus,
                'verification_status' => $selectedVerificationStatus,
            ],
        ]);
    }

    /**
     * Record reminder notes for selected students and generate / update batch.
     */
    public function storeUniversityReminder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => 'required|integer',
            'note_text' => 'required|string|max:200',
            'note_date' => 'nullable|date',
            'academic_year' => 'nullable|string|max:60',
            'university_name' => 'required|string|max:255',
            'admission_taken_in' => 'nullable|string|max:100',
            'head_name' => 'nullable|string|max:100',
            'letter_no' => 'nullable|string|max:100',
            'letter_date' => 'nullable|date',
            'remarks' => 'nullable|string|max:1000',
        ]);

        $username = Auth::user()?->username ?? 'staff';
        $univName = mb_substr(trim(strip_tags((string) $validated['university_name'])), 0, 255);

        // Fetch selected students to resolve multi-year and multi-stream scenarios properly
        $selectedStudents = StudentDetail::with('confirmation')->whereIn('id', $validated['student_ids'])->get();

        // Automatically exclude verified and explicitly excluded candidates
        $eligibleStudents = $selectedStudents->filter(fn ($s) => $s->isEligibleForReminder())->values();

        if ($eligibleStudents->isEmpty()) {
            return redirect()->back()->with('error', 'All selected candidates have completed verification or are explicitly excluded. No reminder was generated.');
        }

        [$colleges, $matchCollege] = $this->buildCollegeMatcher();
        $targetCollege = $matchCollege($univName);
        if ($targetCollege) {
            $univName = trim((string) $targetCollege->Name, " ,\t\n\r\0\x0B");
        }

        // Validate that all eligible candidates belong to the target university
        $mismatched = [];
        foreach ($eligibleStudents as $student) {
            $studentCol = $matchCollege($student->clg_add);
            $matches = false;

            if ($targetCollege && $studentCol) {
                $matches = ($targetCollege->id === $studentCol->id);
            } elseif ($studentCol && (strcasecmp(trim((string) $studentCol->Name), trim($univName)) === 0 || str_contains(strtolower($univName), strtolower(trim((string) $studentCol->Name))) || str_contains(strtolower(trim((string) $studentCol->Name)), strtolower($univName)))) {
                $matches = true;
            } elseif ($targetCollege && (! empty($targetCollege->Address) && ($student->clg_add === $targetCollege->Address || str_contains(strtolower((string) $student->clg_add), strtolower(substr($targetCollege->Address, 0, 30)))))) {
                $matches = true;
            } else {
                $cleanStudentAdd = strtolower(trim(preg_replace('/\s+/', ' ', strip_tags((string) $student->clg_add))));
                $cleanUniv = strtolower(trim(preg_replace('/\s+/', ' ', strip_tags($univName))));
                $matches = ! empty($cleanUniv) && ! empty($cleanStudentAdd) && (str_contains($cleanStudentAdd, $cleanUniv) || str_contains($cleanUniv, $cleanStudentAdd));
            }

            if (! $matches) {
                $mismatched[] = $student->student_name . ' (' . ($studentCol ? trim((string) $studentCol->Name, " ,\t\n\r\0\x0B") : strip_tags(explode('<br>', (string) $student->clg_add)[0])) . ')';
            }
        }

        if (! empty($mismatched)) {
            $sample = array_slice($mismatched, 0, 3);
            $count = count($mismatched);
            $msg = "Cannot create university reminder batch: All candidates in a batch must belong to the target university ({$univName}). " .
                "{$count} candidate(s) from different institutions were selected: " . implode(', ', $sample) .
                ($count > 3 ? '...' : '') . ". Please filter by the target university before generating a reminder.";
            return redirect()->back()->with('error', $msg);
        }

        $eligibleIds = $eligibleStudents->pluck('id')->all();

        // Validate that all candidates have the same academic year
        $distinctYears = $eligibleStudents->pluck('admission_taken_year')->filter()->unique()->values();
        if ($distinctYears->count() > 1) {
            return redirect()->back()->with('error', 'Cannot generate university reminder notice: All candidates in a notice must belong to the same academic year. Selected candidates span ' . $distinctYears->count() . ' academic years: ' . $distinctYears->implode(', ') . '.');
        }

        // Validate that all candidates have the same course / program
        $distinctStreams = $eligibleStudents->pluck('admission_taken_in')->filter()->unique()->values();
        if ($distinctStreams->count() > 1) {
            return redirect()->back()->with('error', 'Cannot generate university reminder notice: All candidates in a notice must belong to the same course / program (admission taken in). Selected candidates span ' . $distinctStreams->count() . ' courses: ' . $distinctStreams->implode(', ') . '.');
        }

        $batchYear = $distinctYears->first() ?: (! empty($validated['academic_year']) ? trim((string) $validated['academic_year']) : date('Y').'-'.(date('Y') + 1));
        $batchStream = $distinctStreams->first() ?: (! empty($validated['admission_taken_in']) ? trim((string) $validated['admission_taken_in']) : null);

        // Create new batch for this reminder event
        $batch = UniversityReminderBatch::create([
            'academic_year' => $batchYear,
            'university_name' => $univName,
            'admission_taken_in' => $batchStream,
            'head_name' => $validated['head_name'] ?? 'The Controller of Examinations',
            'letter_no' => $validated['letter_no'] ?? null,
            'letter_date' => $validated['letter_date'] ?? null,
            'remarks' => $validated['remarks'] ?? null,
            'created_by' => $username,
        ]);

        $noteDate = ! empty($validated['note_date']) ? $validated['note_date'] : date('Y-m-d');

        // Add note for each eligible student
        foreach ($eligibleIds as $studentId) {
            UniversityReminderNote::create([
                'batch_id' => $batch->id,
                'student_id' => $studentId,
                'note_text' => $validated['note_text'],
                'note_date' => $noteDate,
                'created_by' => $username,
                'created_at' => now(),
            ]);
        }

        $skippedCount = $selectedStudents->count() - $eligibleStudents->count();
        $successMsg = 'University reminder notes recorded successfully.';
        $flash = [
            'success' => $successMsg,
            'batch_id' => $batch->id,
            'pdf_url' => route('pdf.reminder.university', ['batchId' => $batch->id]),
        ];
        if ($skippedCount > 0) {
            $flash['warning'] = "{$skippedCount} verified/excluded candidate(s) were automatically skipped.";
            $flash['success'] = $successMsg . " ({$skippedCount} verified/excluded candidate(s) were automatically skipped).";
        }

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => $flash['success'],
                'batch_id' => $batch->id,
                'pdf_url' => $flash['pdf_url'],
            ]);
        }

        return redirect()->route('reminders.university.batch.detail', ['batchId' => $batch->id])->with($flash);
    }

    /**
     * University Reminder Batches History.
     */
    public function universityHistory(Request $request): Response
    {
        // Auto self-heal: if university_reminder_batches is empty and rem_db has data, sync automatically
        if (UniversityReminderBatch::count() === 0 && Schema::hasTable('rem_db') && DB::table('rem_db')->count() > 0) {
            Artisan::call('app:sync-legacy-reminders');
        }

        $university = trim((string) $request->input('university', ''));
        $year = trim((string) $request->input('year', ''));
        $studentName = trim((string) $request->input('student_name', ''));

        $query = UniversityReminderBatch::query();

        if ($university !== '') {
            $query->where('university_name', 'like', "%{$university}%");
        }
        if ($year !== '') {
            $query->where('academic_year', $year);
        }
        if ($studentName !== '') {
            $matchingBatchIds = UniversityReminderNote::whereHas('student', function ($q) use ($studentName) {
                $q->where('student_name', 'like', "%{$studentName}%")
                  ->orWhere('eligibility_case_no', 'like', "%{$studentName}%");
            })->pluck('batch_id')->unique();
            $query->whereIn('id', $matchingBatchIds);
        }

        $batches = $query->orderBy('id', 'desc')->paginate(20)->withQueryString();

        // Calculate total student count and notes per batch
        foreach ($batches as $b) {
            $b->student_count = UniversityReminderNote::where('batch_id', $b->id)
                ->distinct('student_id')
                ->count('student_id');
        }

        return Inertia::render('Reminders/UniversityHistory', [
            'batches' => $batches,
            'filters' => [
                'university' => $university,
                'year' => $year,
                'student_name' => $studentName,
            ],
        ]);
    }

    /**
     * Batch Detail showing all students and reminder notes.
     */
    public function universityBatchDetail(int $batchId): Response
    {
        $batch = UniversityReminderBatch::with('sourceBatches')->findOrFail($batchId);

        $notes = UniversityReminderNote::where('batch_id', $batchId)->orderBy('id', 'desc')->get();
        $studentIds = $notes->pluck('student_id')->unique();

        $students = StudentDetail::with('confirmation')->whereIn('id', $studentIds)->get();

        foreach ($students as $s) {
            $s->notes = $notes->where('student_id', $s->id)->values();
            $s->is_verified = $s->isVerified();
            $s->is_excluded = $s->isExcluded();
            $s->is_eligible = $s->isEligibleForReminder();
            $s->computed_status = $s->computed_status;
        }

        // Match college to find official university email address
        [$colleges, $matchCollege] = $this->buildCollegeMatcher();
        $matchedCollege = $matchCollege($batch->university_name);
        $suggestedEmail = '';
        if ($matchedCollege && filter_var(trim((string) $matchedCollege->email_id), FILTER_VALIDATE_EMAIL)) {
            $suggestedEmail = trim((string) $matchedCollege->email_id);
        }

        $mailReady = Setting::isMailConfigured();

        return Inertia::render('Reminders/UniversityBatchDetail', [
            'batch' => $batch,
            'sourceBatches' => $batch->sourceBatches,
            'students' => $students,
            'suggestedEmail' => $suggestedEmail,
            'mailReady' => $mailReady,
        ]);
    }

    /**
     * University Reminder Letter & Notice Form (parity with reme_view.php).
     * Supports both new reminder creation (query params a, b, c) and updating existing batches (param batch_id or legacy u).
     */
    public function remeView(Request $request, ?int $batchId = null): Response|RedirectResponse
    {
        $resolvedBatchId = $batchId;
        if (! $resolvedBatchId && $request->has('batch_id')) {
            $resolvedBatchId = (int) $request->input('batch_id');
        }
        if (! $resolvedBatchId && $request->has('u')) {
            $resolvedBatchId = $this->decodeBatchIdParam((string) $request->input('u'));
        }

        [$colleges, $matchCollege] = $this->buildCollegeMatcher();

        // 1. Updating an Existing Batch
        if ($resolvedBatchId) {
            $batch = UniversityReminderBatch::where('id', $resolvedBatchId)
                ->orWhere('legacy_array_space', $resolvedBatchId)
                ->first();

            // Self-heal from rem_db if batch record is missing
            if (! $batch && Schema::hasTable('rem_db')) {
                $remExists = DB::table('rem_db')
                    ->where('array_space', $resolvedBatchId)
                    ->orWhere('id', $resolvedBatchId)
                    ->exists();

                if ($remExists) {
                    Artisan::call('app:sync-legacy-reminders', ['--force' => true]);
                    $batch = UniversityReminderBatch::where('id', $resolvedBatchId)
                        ->orWhere('legacy_array_space', $resolvedBatchId)
                        ->first();
                }
            }

            if (! $batch) {
                return redirect()->route('reminders.university.history')
                    ->with('error', "Reminder batch #{$resolvedBatchId} not found.");
            }

            $batchNotes = UniversityReminderNote::where('batch_id', $batch->id)
                ->orderBy('id', 'asc')
                ->get();
            $studentIds = $batchNotes->pluck('student_id')->unique()->all();

            $students = StudentDetail::with('confirmation')
                ->whereIn('id', $studentIds)
                ->get();

            $targetCollege = $matchCollege($batch->university_name);
            $rawFees = ($targetCollege && $targetCollege->fees !== null && $targetCollege->fees !== '') ? trim((string) $targetCollege->fees) : '';
            $feesVal = ($rawFees !== '' && $rawFees !== '0') ? $rawFees : '';

            $studentList = [];
            foreach ($students as $student) {
                // Fetch full reminder notes history for this student
                $studentNotes = UniversityReminderNote::where('student_id', $student->id)
                    ->orderBy('id', 'asc')
                    ->get();

                $existingNotes = [];
                foreach ($studentNotes as $idx => $note) {
                    $existingNotes[] = [
                        'id' => $note->id,
                        'slot' => $idx + 1,
                        'batch_id' => $note->batch_id,
                        'note_text' => $note->note_text,
                        'note_date' => $note->note_date ? $note->note_date->format('Y-m-d') : null,
                    ];
                }

                $nextSlot = count($existingNotes) + 1;
                $defaultNextNote = match ($nextSlot) {
                    1 => '1st Reminder Notice',
                    2 => '2nd Reminder Notice',
                    3 => '3rd Reminder Notice',
                    default => "{$nextSlot}th Reminder Notice",
                };

                $studentList[] = [
                    'id' => $student->id,
                    'student_name' => $student->student_name,
                    'student_nee_name' => $student->student_nee_name,
                    'eligibility_case_no' => $student->eligibility_case_no,
                    'admission_taken_in' => $student->admission_taken_in,
                    'admission_taken_year' => $student->admission_taken_year,
                    'is_verified' => $student->isVerified(),
                    'is_excluded' => $student->isExcluded(),
                    'existing_notes' => $existingNotes,
                    'next_slot' => $nextSlot,
                    'default_next_note' => $defaultNextNote,
                ];
            }

            $allColleges = CollegeDetail::orderBy('Name')->pluck('Name')->unique()->values()->all();
            $allYears = StudentDetail::whereNotNull('admission_taken_year')->where('admission_taken_year', '!=', '')->distinct()->orderBy('admission_taken_year', 'desc')->pluck('admission_taken_year')->values()->all();
            $allCourses = StudentDetail::whereNotNull('admission_taken_in')->where('admission_taken_in', '!=', '')->distinct()->orderBy('admission_taken_in')->pluck('admission_taken_in')->values()->all();

            return Inertia::render('Reminders/RemeView', [
                'isUpdate' => true,
                'batchId' => $batch->id,
                'legacyArraySpace' => $batch->legacy_array_space,
                'universityName' => $batch->university_name,
                'academicYear' => $batch->academic_year,
                'courseName' => $batch->admission_taken_in ?: 'General',
                'headName' => $batch->head_name ?: 'The Controller of Examinations',
                'defaultDate' => date('Y-m-d'),
                'fees' => $feesVal,
                'students' => $studentList,
                'backUrl' => route('reminders.university.history'),
                'allColleges' => $allColleges,
                'allYears' => $allYears,
                'allCourses' => $allCourses,
            ]);
        }

        // 2. Creating a New Batch from Query Parameters (a = year, b = college, c = student IDs)
        $a = trim((string) $request->input('a', $request->input('academic_year', '')));
        $b = trim((string) $request->input('b', $request->input('clg_id', $request->input('university', ''))));
        $c = $request->input('c', $request->input('student_ids', ''));

        if (is_array($c)) {
            $studentIds = array_values(array_filter(array_map('intval', $c)));
        } else {
            $studentIds = array_values(array_filter(array_map('intval', explode('_', (string) $c))));
        }

        if (empty($studentIds)) {
            return redirect()->route('reminders.university')
                ->with('error', 'No candidates were selected for reminder letter generation.');
        }

        $students = StudentDetail::with('confirmation')
            ->whereIn('id', $studentIds)
            ->get();

        if ($students->isEmpty()) {
            return redirect()->route('reminders.university')
                ->with('error', 'Selected candidates could not be found.');
        }

        // Sort students in the same order as requested IDs
        $studentMap = $students->keyBy('id');
        $sortedStudents = collect($studentIds)->map(fn ($id) => $studentMap->get($id))->filter()->values();

        // Resolve College & University Name
        $targetCollege = null;
        if (is_numeric($b)) {
            $targetCollege = CollegeDetail::find((int) $b);
        }
        if (! $targetCollege && $b !== '') {
            $targetCollege = $matchCollege($b);
        }

        if ($targetCollege) {
            $univName = trim((string) $targetCollege->Name, " ,\t\n\r\0\x0B");
            $headName = $request->input('head_name') ?: ($targetCollege->to_name ?: 'The Controller of Examinations');
            $rawFees = ($targetCollege->fees !== null && $targetCollege->fees !== '') ? trim((string) $targetCollege->fees) : '';
            $feesVal = ($rawFees !== '' && $rawFees !== '0') ? $rawFees : '';
        } else {
            $firstStudent = $sortedStudents->first();
            $univName = $b !== '' ? $b : ($firstStudent?->clg_add ? strip_tags(explode('<br>', (string) $firstStudent->clg_add)[0]) : 'Target University');
            $headName = $request->input('head_name') ?: 'The Controller of Examinations';
            $feesVal = '';
        }

        $academicYear = $a !== '' ? $a : ($sortedStudents->first()?->admission_taken_year ?: date('Y').'-'.(date('Y') + 1));
        $courseName = $sortedStudents->first()?->admission_taken_in ?: 'General';

        $studentList = [];
        foreach ($sortedStudents as $student) {
            $studentNotes = UniversityReminderNote::where('student_id', $student->id)
                ->orderBy('id', 'asc')
                ->get();

            $existingNotes = [];
            foreach ($studentNotes as $idx => $note) {
                $existingNotes[] = [
                    'id' => $note->id,
                    'slot' => $idx + 1,
                    'batch_id' => $note->batch_id,
                    'note_text' => $note->note_text,
                    'note_date' => $note->note_date ? $note->note_date->format('Y-m-d') : null,
                ];
            }

            // Also check rem_db if student notes not present in modern table
            if (empty($existingNotes) && Schema::hasTable('rem_db')) {
                $remRow = DB::table('rem_db')->where('name', (string) $student->id)->first();
                if ($remRow) {
                    for ($k = 1; $k <= 4; $k++) {
                        $txt = trim((string) $remRow->{'eligib'.$k});
                        if ($txt !== '') {
                            $existingNotes[] = [
                                'id' => 0,
                                'slot' => $k,
                                'batch_id' => 0,
                                'note_text' => $txt,
                                'note_date' => $remRow->{'dated'.$k} ?? null,
                            ];
                        }
                    }
                }
            }

            $nextSlot = count($existingNotes) + 1;
            $defaultNextNote = match ($nextSlot) {
                1 => '1st Reminder Notice',
                2 => '2nd Reminder Notice',
                3 => '3rd Reminder Notice',
                default => "{$nextSlot}th Reminder Notice",
            };

            $studentList[] = [
                'id' => $student->id,
                'student_name' => $student->student_name,
                'student_nee_name' => $student->student_nee_name,
                'eligibility_case_no' => $student->eligibility_case_no,
                'admission_taken_in' => $student->admission_taken_in,
                'admission_taken_year' => $student->admission_taken_year,
                'is_verified' => $student->isVerified(),
                'is_excluded' => $student->isExcluded(),
                'existing_notes' => $existingNotes,
                'next_slot' => $nextSlot,
                'default_next_note' => $defaultNextNote,
            ];
        }

        $allColleges = CollegeDetail::orderBy('Name')->pluck('Name')->unique()->values()->all();
        $allYears = StudentDetail::whereNotNull('admission_taken_year')->where('admission_taken_year', '!=', '')->distinct()->orderBy('admission_taken_year', 'desc')->pluck('admission_taken_year')->values()->all();
        $allCourses = StudentDetail::whereNotNull('admission_taken_in')->where('admission_taken_in', '!=', '')->distinct()->orderBy('admission_taken_in')->pluck('admission_taken_in')->values()->all();

        return Inertia::render('Reminders/RemeView', [
            'isUpdate' => false,
            'batchId' => null,
            'legacyArraySpace' => null,
            'universityName' => $univName,
            'academicYear' => $academicYear,
            'courseName' => $courseName,
            'headName' => $headName,
            'defaultDate' => date('Y-m-d'),
            'fees' => $feesVal,
            'students' => $studentList,
            'backUrl' => route('reminders.university'),
            'allColleges' => $allColleges,
            'allYears' => $allYears,
            'allCourses' => $allCourses,
        ]);
    }

    /**
     * Save reminder letter & batch from reme_view screen.
     * Records new reminder notes and applies edits to existing reminder notes.
     */
    public function saveRemeView(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'batch_id' => 'nullable|integer',
            'academic_year' => 'required|string|max:60',
            'university_name' => 'required|string|max:255',
            'admission_taken_in' => 'nullable|string|max:100',
            'head_name' => 'nullable|string|max:150',
            'letter_no' => 'nullable|string|max:100',
            'letter_date' => 'nullable|date',
            'remarks' => 'nullable|string|max:1000',
            'dated' => 'required|date',
            'students' => 'required|array|min:1',
            'students.*.student_id' => 'required|integer',
            'students.*.next_reminder_note' => 'nullable|string|max:200',
            'students.*.edited_notes' => 'nullable|array',
            'students.*.edited_notes.*.id' => 'nullable|integer',
            'students.*.edited_notes.*.slot' => 'nullable|integer',
            'students.*.edited_notes.*.note_text' => 'nullable|string|max:200',
            'students.*.edited_notes.*.note_date' => 'nullable|date',
        ]);

        $username = Auth::user()?->username ?? 'staff';
        $headName = trim((string) ($validated['head_name'] ?? 'The Controller of Examinations')) ?: 'The Controller of Examinations';
        $noteDate = $validated['dated'];
        $lDate = $validated['letter_date'] ?? $noteDate;

        // 1. Resolve or Create Batch
        if (! empty($validated['batch_id'])) {
            $batch = UniversityReminderBatch::findOrFail($validated['batch_id']);
            $batchUpdateData = [
                'head_name' => $headName,
                'academic_year' => $validated['academic_year'],
                'university_name' => $validated['university_name'],
                'admission_taken_in' => $validated['admission_taken_in'] ?? $batch->admission_taken_in,
            ];
            if ($request->has('letter_no')) {
                $batchUpdateData['letter_no'] = $validated['letter_no'] ?? null;
            }
            if ($request->has('letter_date')) {
                $batchUpdateData['letter_date'] = $lDate;
            }
            if ($request->has('remarks')) {
                $batchUpdateData['remarks'] = $validated['remarks'] ?? null;
            }
            $batch->update($batchUpdateData);

            // Sync updated metadata to rem_db if table exists
            if (Schema::hasTable('rem_db')) {
                $asp = $batch->legacy_array_space ?: $batch->id;
                $remUpdate = [
                    'head_name' => $headName,
                    'acd_year' => $validated['academic_year'],
                    'course_name' => $validated['admission_taken_in'] ?? $batch->admission_taken_in,
                ];
                $college = CollegeDetail::where('Name', $validated['university_name'])
                    ->orWhere('Address', $validated['university_name'])
                    ->first();
                if ($college) {
                    $remUpdate['clg_id'] = (string) $college->id;
                }
                DB::table('rem_db')->where('array_space', (string) $asp)->update($remUpdate);
            }
        } else {
            $batch = UniversityReminderBatch::create([
                'academic_year' => $validated['academic_year'],
                'university_name' => $validated['university_name'],
                'admission_taken_in' => $validated['admission_taken_in'] ?? null,
                'head_name' => $headName,
                'letter_no' => $validated['letter_no'] ?? null,
                'letter_date' => $lDate,
                'remarks' => $validated['remarks'] ?? null,
                'created_by' => $username,
            ]);
        }

        $newNotesRecorded = 0;
        $notesModified = 0;

        foreach ($validated['students'] as $studData) {
            $studentId = (int) $studData['student_id'];

            // 2. Process Edited Notes (Fixing Mistakes in Existing Notes)
            if (! empty($studData['edited_notes']) && is_array($studData['edited_notes'])) {
                foreach ($studData['edited_notes'] as $edited) {
                    $noteId = ! empty($edited['id']) ? (int) $edited['id'] : null;
                    $newText = trim((string) ($edited['note_text'] ?? ''));
                    $newDate = ! empty($edited['note_date']) ? $edited['note_date'] : null;

                    if ($noteId && $noteId > 0 && $newText !== '') {
                        $note = UniversityReminderNote::find($noteId);
                        if ($note) {
                            $oldText = $note->note_text;
                            $note->note_text = $newText;
                            if ($newDate) {
                                $note->note_date = $newDate;
                            }
                            $note->save();
                            $notesModified++;

                            // Sync modification to rem_db if table exists
                            if (Schema::hasTable('rem_db')) {
                                $remRow = DB::table('rem_db')->where('name', (string) $note->student_id)->first();
                                if ($remRow) {
                                    $slot = ! empty($edited['slot']) ? (int) $edited['slot'] : null;
                                    if (! $slot || $slot < 1 || $slot > 4) {
                                        for ($k = 1; $k <= 4; $k++) {
                                            if (trim((string) $remRow->{'eligib'.$k}) === trim((string) $oldText)) {
                                                $slot = $k;
                                                break;
                                            }
                                        }
                                    }
                                    if ($slot && $slot >= 1 && $slot <= 4) {
                                        $upData = ['eligib'.$slot => $newText];
                                        if ($newDate) {
                                            $upData['dated'.$slot] = $newDate;
                                        }
                                        DB::table('rem_db')->where('id', $remRow->id)->update($upData);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 3. Process New Reminder Note
            $nextNote = trim((string) ($studData['next_reminder_note'] ?? ''));
            if ($nextNote !== '') {
                UniversityReminderNote::create([
                    'batch_id' => $batch->id,
                    'student_id' => $studentId,
                    'note_text' => $nextNote,
                    'note_date' => $noteDate,
                    'created_by' => $username,
                    'created_at' => now(),
                ]);
                $newNotesRecorded++;

                // Sync new note to rem_db if table exists
                if (Schema::hasTable('rem_db')) {
                    $sid = (string) $studentId;
                    $remRow = DB::table('rem_db')->where('name', $sid)->first();
                    $pdfTime = (string) time();

                    if ($remRow) {
                        $targetSlot = null;
                        for ($k = 1; $k <= 4; $k++) {
                            if (empty(trim((string) $remRow->{'eligib'.$k}))) {
                                $targetSlot = $k;
                                break;
                            }
                        }
                        if ($targetSlot) {
                            DB::table('rem_db')->where('id', $remRow->id)->update([
                                'eligib'.$targetSlot => $nextNote,
                                'dated'.$targetSlot => $noteDate,
                                'pdf_time'.$targetSlot => $pdfTime,
                                'head_name' => $headName,
                            ]);
                        }
                    } else {
                        $stud = StudentDetail::find($studentId);
                        $clgId = 0;
                        if ($stud) {
                            $col = CollegeDetail::where('Address', $stud->clg_add)->orWhere('Name', $stud->clg_add)->first();
                            $clgId = $col?->id ?: 0;
                        }
                        $asp = $batch->legacy_array_space ?: $batch->id;
                        DB::table('rem_db')->insert([
                            'array_space' => $asp,
                            'head_name' => $headName,
                            'name' => $sid,
                            'clg_id' => (string) $clgId,
                            'course_name' => $validated['admission_taken_in'] ?: ($stud?->admission_taken_in ?: 'General'),
                            'acd_year' => $validated['academic_year'] ?: ($stud?->admission_taken_year ?: '2020-2021'),
                            'eligib1' => $nextNote,
                            'dated1' => $noteDate,
                            'pdf_time1' => $pdfTime,
                            'Current_Date_Time' => now()->toDateTimeString(),
                        ]);
                    }
                }
            }
        }

        $msgParts = [];
        if ($newNotesRecorded > 0) {
            $msgParts[] = "{$newNotesRecorded} new reminder note(s) recorded";
        }
        if ($notesModified > 0) {
            $msgParts[] = "{$notesModified} existing reminder note(s) updated";
        }
        if ($newNotesRecorded === 0 && $notesModified === 0) {
            $msgParts[] = 'Reminder letter details updated';
        }
        $msg = implode(', ', $msgParts);
        $pdfUrl = route('pdf.reminder.university', ['batchId' => $batch->id]);

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => $msg,
                'batch_id' => $batch->id,
                'pdf_url' => $pdfUrl,
            ]);
        }

        return redirect()->route('reminders.university.batch.detail', ['batchId' => $batch->id])->with([
            'success' => $msg,
            'batch_id' => $batch->id,
            'pdf_url' => $pdfUrl,
        ]);
    }

    /**
     * Update a single reminder note directly (e.g. from Batch Detail or Quick Edit).
     */
    public function updateReminderNote(Request $request, int $noteId): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'note_text' => 'required|string|max:200',
            'note_date' => 'nullable|date',
        ]);

        $note = UniversityReminderNote::findOrFail($noteId);
        $oldText = $note->note_text;
        $note->note_text = trim($validated['note_text']);
        if (! empty($validated['note_date'])) {
            $note->note_date = $validated['note_date'];
        }
        $note->save();

        // Sync to rem_db if table exists
        if (Schema::hasTable('rem_db')) {
            $remRow = DB::table('rem_db')->where('name', (string) $note->student_id)->first();
            if ($remRow) {
                for ($k = 1; $k <= 4; $k++) {
                    if (trim((string) $remRow->{'eligib'.$k}) === trim((string) $oldText)) {
                        $upData = ['eligib'.$k => $note->note_text];
                        if (! empty($validated['note_date'])) {
                            $upData['dated'.$k] = $validated['note_date'];
                        }
                        DB::table('rem_db')->where('id', $remRow->id)->update($upData);
                        break;
                    }
                }
            }
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Reminder note updated successfully.',
                'note' => $note,
            ]);
        }

        return redirect()->back()->with('success', 'Reminder note updated successfully.');
    }

    /**
     * Update university reminder batch letter details (Letter No, Letter Date, Remarks).
     */
    public function updateUniversityBatch(Request $request, int $batchId): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'letter_no' => 'nullable|string|max:100',
            'letter_date' => 'nullable|date',
            'remarks' => 'nullable|string|max:1000',
            'head_name' => 'nullable|string|max:150',
            'academic_year' => 'nullable|string|max:60',
            'admission_taken_in' => 'nullable|string|max:100',
        ]);

        $batch = UniversityReminderBatch::findOrFail($batchId);
        $updateData = [];
        foreach (['letter_no', 'letter_date', 'remarks', 'head_name', 'academic_year', 'admission_taken_in'] as $field) {
            if ($request->has($field)) {
                $updateData[$field] = $validated[$field] ?? null;
            }
        }

        if (! empty($updateData)) {
            $batch->update($updateData);
        }

        ActivityLog::record('reminders_university.batch_update', "Updated university reminder batch #{$batchId} letter details.");

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => "Reminder batch #{$batchId} letter details updated successfully.",
                'batch' => $batch,
            ]);
        }

        return back()->with('success', "Reminder batch #{$batchId} letter details updated successfully.");
    }

    /**
     * Delete an entire university reminder batch and all its associated notes.
     */
    public function destroyUniversityBatch(Request $request, int $batchId): JsonResponse|RedirectResponse
    {
        $batch = UniversityReminderBatch::findOrFail($batchId);
        $univName = $batch->university_name;
        $asp = $batch->legacy_array_space ?: $batch->id;

        // 1. Delete associated notes
        UniversityReminderNote::where('batch_id', $batch->id)->delete();

        // 2. Delete source linkages if consolidated
        DB::table('university_reminder_batch_sources')
            ->where('consolidated_batch_id', $batch->id)
            ->orWhere('source_batch_id', $batch->id)
            ->delete();

        // 3. Delete from rem_db if table exists
        if (Schema::hasTable('rem_db')) {
            DB::table('rem_db')->where('array_space', (string) $asp)->delete();
        }

        // 4. Delete the batch itself
        $batch->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => "Reminder batch #{$batchId} for {$univName} has been deleted.",
            ]);
        }

        return redirect()->route('reminders.university.history')
            ->with('success', "Reminder batch #{$batchId} for {$univName} has been deleted.");
    }

    /**
     * Delete an individual reminder note (reverting candidate to previous reminder state).
     */
    public function destroyReminderNote(Request $request, int $noteId): JsonResponse|RedirectResponse
    {
        $note = UniversityReminderNote::findOrFail($noteId);
        $studentId = $note->student_id;
        $oldText = $note->note_text;

        // Clear in rem_db if table exists
        if (Schema::hasTable('rem_db')) {
            $remRow = DB::table('rem_db')->where('name', (string) $studentId)->first();
            if ($remRow) {
                for ($k = 1; $k <= 4; $k++) {
                    if (trim((string) $remRow->{'eligib'.$k}) === trim((string) $oldText)) {
                        DB::table('rem_db')->where('id', $remRow->id)->update([
                            'eligib'.$k => null,
                            'dated'.$k => null,
                            'pdf_time'.$k => null,
                        ]);
                        break;
                    }
                }
            }
        }

        $note->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Reminder note deleted successfully.',
            ]);
        }

        return redirect()->back()->with('success', 'Reminder note deleted successfully.');
    }

    /**
     * Legacy reme_view.php route adapter.
     */
    public function legacyRemeView(Request $request): Response|RedirectResponse
    {
        return $this->remeView($request);
    }

    /**
     * Legacy new_rem_ins.php route adapter.
     */
    public function legacyNewRemIns(Request $request): RedirectResponse
    {
        // Decode legacy parameters
        $headName = $request->input('head_name');
        $dated = $request->input('dated', date('Y-m-d'));
        $rawId = $request->input('id', '');
        $idArr = array_values(array_filter(array_map('intval', explode('_', (string) $rawId))));
        $kLoop = (int) $request->input('k_loop', 1);

        $students = [];
        foreach ($idArr as $i => $sid) {
            $noteVal = $request->input("reminder{$i}{$kLoop}") ?? $request->input("reminder{$i}1");
            $students[] = [
                'student_id' => $sid,
                'next_reminder_note' => $noteVal ? trim((string) $noteVal) : null,
            ];
        }

        $sampleStudent = StudentDetail::find($idArr[0] ?? 0);
        $academicYear = $sampleStudent?->admission_taken_year ?: date('Y').'-'.(date('Y') + 1);
        $courseName = $sampleStudent?->admission_taken_in ?: 'General';
        $univName = $sampleStudent?->clg_add ? strip_tags(explode('<br>', (string) $sampleStudent->clg_add)[0]) : 'Target University';

        $subRequest = Request::create(route('reminders.university.process.save'), 'POST', [
            'academic_year' => $academicYear,
            'university_name' => $univName,
            'admission_taken_in' => $courseName,
            'head_name' => $headName,
            'dated' => $dated,
            'students' => $students,
        ]);

        return $this->saveRemeView($subRequest);
    }

    /**
     * Helper to decode legacy batch ID param (supports double base64, single base64, or raw int).
     */
    protected function decodeBatchIdParam(string $u): ?int
    {
        $val = trim($u);
        if ($val === '') {
            return null;
        }

        $d1 = base64_decode($val, true);
        if ($d1 !== false) {
            $d2 = base64_decode($d1, true);
            if ($d2 !== false && is_numeric($d2)) {
                $num = (int) $d2;
                $batch = UniversityReminderBatch::where('legacy_array_space', $num)->orWhere('id', $num)->first();
                return $batch ? $batch->id : $num;
            }
            if (is_numeric($d1)) {
                $num = (int) $d1;
                $batch = UniversityReminderBatch::where('legacy_array_space', $num)->orWhere('id', $num)->first();
                return $batch ? $batch->id : $num;
            }
        }

        if (is_numeric($val)) {
            $num = (int) $val;
            $batch = UniversityReminderBatch::where('legacy_array_space', $num)->orWhere('id', $num)->first();
            return $batch ? $batch->id : $num;
        }

        return null;
    }

    /**
     * Send reminder email directly to university with candidate list and attached official PDF notice.
     */
    public function sendUniversityBatchEmail(Request $request, int $batchId): RedirectResponse
    {
        $batch = UniversityReminderBatch::findOrFail($batchId);

        $validated = $request->validate([
            'recipient_email' => 'required|email|max:150',
            'subject' => 'required|string|max:255',
            'message_notes' => 'nullable|string|max:2000',
            'attach_pdf' => 'nullable|boolean',
        ]);

        if (! Setting::isMailConfigured()) {
            return redirect()->back()->with('error', 'Mail server is not configured yet. Configure SMTP in Settings > Email.');
        }

        try {
            Setting::applyMailerConfig();
        } catch (\Throwable $e) {
            return redirect()->back()->with('error', 'Email settings could not be loaded: '.mb_substr($e->getMessage(), 0, 300));
        }

        $notes = UniversityReminderNote::where('batch_id', $batchId)->orderBy('student_id')->orderBy('id')->get();
        $studentIds = $notes->pluck('student_id')->unique();

        // Immediately revalidate candidate verification status before sending
        $allBatchStudents = StudentDetail::with('confirmation')->whereIn('id', $studentIds)->get();
        $eligibleStudents = $allBatchStudents->filter(fn ($s) => $s->isEligibleForReminder())->values();

        if ($eligibleStudents->isEmpty()) {
            return redirect()->back()->with('error', 'All candidates in this reminder batch have completed verification or are explicitly excluded. No reminder email needed.');
        }

        $omittedCount = $allBatchStudents->count() - $eligibleStudents->count();
        $students = $eligibleStudents;

        foreach ($students as $student) {
            $student->notes = $notes->where('student_id', $student->id)->values();
        }

        $latestReminderText = optional($students->first())->notes?->last()?->note_text ?? '1st Reminder Notice';

        $pdfCtrl = app(PdfController::class);
        $instituteData = $pdfCtrl->getInstituteSettings();

        $rawAttachments = [];
        if ($request->boolean('attach_pdf', true)) {
            $rendered = $pdfCtrl->renderLetterTemplate('university_reminder', [
                'reminder_type' => $latestReminderText,
                'course' => $batch->admission_taken_in ?? '',
                'academic_year' => $batch->academic_year ?? '',
            ]);
            $resolved = $pdfCtrl->resolveUniversityAndAddress($batch->university_name, $batch->head_name);
            $data = array_merge($instituteData, $rendered, [
                'batch' => $batch,
                'universityName' => $resolved['university_name'] ?: $batch->university_name,
                'address' => $resolved['address'],
                'students' => $students,
                'date' => date('d/m/Y'),
            ]);
            $pdf = Pdf::loadView('pdf.university_reminder_letter', $data)->setPaper('a4', 'portrait');
            $rawAttachments[] = [
                'data' => $pdf->output(),
                'name' => "university_reminder_{$batchId}.pdf",
                'options' => ['mime' => 'application/pdf'],
            ];
        }

        $htmlBody = view('emails.university_reminder_batch', array_merge($instituteData, [
            'batch' => $batch,
            'students' => $students,
            'latestReminderText' => $latestReminderText,
            'customNotes' => $validated['message_notes'] ?? null,
            'hasAttachment' => ! empty($rawAttachments),
        ]))->render();

        $recipientEmail = trim($validated['recipient_email']);
        $recipientName = $batch->head_name ?: 'The Controller of Examinations';

        try {
            Mail::mailer(Setting::MAIL_MAILER_NAME)
                ->to($recipientEmail, $recipientName)
                ->send(new RawHtmlMail($htmlBody, $validated['subject'], $rawAttachments));

            EmailLog::create([
                'batch_ref' => "rem_batch_{$batchId}_".date('Ymd_His'),
                'template_slug' => 'university_reminder',
                'recipient_type' => 'university',
                'recipient_id' => $batch->id,
                'recipient_name' => $batch->university_name,
                'recipient_email' => $recipientEmail,
                'subject' => $validated['subject'],
                'status' => 'sent',
                'error_message' => null,
                'attempts' => 1,
                'sent_by' => Auth::user()?->username ?? 'staff',
                'created_at' => now(),
            ]);

            $successMsg = "Reminder email successfully sent to {$recipientEmail}.";
            if ($omittedCount > 0) {
                $successMsg .= " ({$omittedCount} verified/excluded candidate(s) were automatically omitted).";
            }

            return redirect()->back()->with('success', $successMsg);
        } catch (\Throwable $e) {
            $err = mb_substr($e->getMessage(), 0, 500);

            EmailLog::create([
                'batch_ref' => "rem_batch_{$batchId}_".date('Ymd_His'),
                'template_slug' => 'university_reminder',
                'recipient_type' => 'university',
                'recipient_id' => $batch->id,
                'recipient_name' => $batch->university_name,
                'recipient_email' => $recipientEmail,
                'subject' => $validated['subject'],
                'status' => 'failed',
                'error_message' => $err,
                'attempts' => 1,
                'sent_by' => Auth::user()?->username ?? 'staff',
                'created_at' => now(),
            ]);

            return redirect()->back()->with('error', "Failed to deliver email: {$err}");
        }
    }

    /**
     * Preview consolidated reminder before generating campaign.
     */
    public function previewCombineBatches(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'batch_ids' => 'required|array|min:1',
            'batch_ids.*' => 'required|integer|exists:university_reminder_batches,id',
        ]);

        $batches = UniversityReminderBatch::whereIn('id', $validated['batch_ids'])->get();

        // Enforce same-university rule on server
        $univNames = $batches->pluck('university_name')->map(fn ($u) => trim((string) $u))->unique()->values();
        if ($univNames->count() > 1) {
            return response()->json([
                'message' => 'Cannot combine batches belonging to different universities. Selected batches span: ' . $univNames->implode(', '),
                'errors' => [
                    'batch_ids' => ['Selected batches belong to different universities.'],
                ],
            ], 422);
        }

        $targetUniv = $univNames->first();

        // Gather all reminder notes across selected batches
        $notes = UniversityReminderNote::whereIn('batch_id', $batches->pluck('id'))->orderBy('id')->get();
        $totalEntries = $notes->count();

        // Map candidates to their source batch IDs and deduplicate strictly by ID
        $candidateBatchMap = [];
        foreach ($notes as $n) {
            $candidateBatchMap[$n->student_id][] = $n->batch_id;
        }
        $uniqueStudentIds = array_keys($candidateBatchMap);
        $uniqueCount = count($uniqueStudentIds);
        $duplicatesRemoved = $totalEntries - $uniqueCount;

        // Fetch students and determine verification / exclusion statuses
        $students = StudentDetail::with('confirmation')->whereIn('id', $uniqueStudentIds)->get();

        $verifiedCount = $students->filter(fn ($s) => $s->isVerified())->count();
        $excludedCount = $students->filter(fn ($s) => $s->isExcluded())->count();
        $eligibleStudents = $students->filter(fn ($s) => $s->isEligibleForReminder())->values();
        $eligibleCount = $eligibleStudents->count();

        return response()->json([
            'university_name' => $targetUniv,
            'source_batches' => $batches->map(fn ($b) => [
                'id' => $b->id,
                'academic_year' => $b->academic_year,
                'admission_taken_in' => $b->admission_taken_in,
                'head_name' => $b->head_name,
                'created_by' => $b->created_by,
                'created_at' => $b->created_at?->format('d/m/Y H:i'),
                'candidate_count' => count(array_filter($candidateBatchMap, fn ($bIds) => in_array($b->id, $bIds))),
            ]),
            'academic_years' => $batches->pluck('academic_year')->filter()->unique()->values(),
            'courses' => $batches->pluck('admission_taken_in')->filter()->unique()->values(),
            'pre_dedup_count' => $totalEntries,
            'total_raw_entries' => $totalEntries,
            'unique_candidates_count' => $uniqueCount,
            'unique_candidates' => $uniqueCount,
            'duplicates_removed_count' => $duplicatesRemoved,
            'duplicate_entries_removed' => $duplicatesRemoved,
            'verified_excluded_count' => $verifiedCount,
            'explicitly_excluded_count' => $excludedCount,
            'other_ineligible_count' => 0,
            'final_eligible_count' => $eligibleCount,
            'eligible_candidates' => $eligibleStudents->map(fn ($s) => [
                'id' => $s->id,
                'student_name' => $s->student_name,
                'student_nee_name' => $s->student_nee_name,
                'eligibility_case_no' => $s->eligibility_case_no,
                'admission_taken_in' => $s->admission_taken_in,
                'admission_taken_year' => $s->admission_taken_year,
                'source_batch_ids' => array_values(array_unique($candidateBatchMap[$s->id] ?? [])),
            ]),
            'excluded_candidates' => $students->filter(fn ($s) => ! $s->isEligibleForReminder())->map(fn ($s) => [
                'id' => $s->id,
                'student_name' => $s->student_name,
                'eligibility_case_no' => $s->eligibility_case_no,
                'reason' => $s->isVerified() ? 'Verified / Completed' : ($s->isExcluded() ? ('Excluded: ' . ($s->exclusion_reason ?: 'Explicitly excluded')) : 'Ineligible'),
            ])->values(),
        ]);
    }

    /**
     * Combine multiple pending reminder batches into one consolidated campaign.
     */
    public function combineBatches(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'batch_ids' => 'required|array|min:1',
            'batch_ids.*' => 'required|integer|exists:university_reminder_batches,id',
            'note_text' => 'nullable|string|max:200',
            'note_date' => 'nullable|date',
            'head_name' => 'nullable|string|max:100',
        ]);

        $batches = UniversityReminderBatch::whereIn('id', $validated['batch_ids'])->get();

        // Enforce same university rule on server
        $univNames = $batches->pluck('university_name')->map(fn ($u) => trim((string) $u))->unique()->values();
        if ($univNames->count() > 1) {
            $msg = 'Cannot combine batches belonging to different universities. Selected: ' . $univNames->implode(', ');
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['message' => $msg, 'errors' => ['batch_ids' => [$msg]]], 422);
            }
            return redirect()->back()->with('error', $msg);
        }

        $targetUniv = $univNames->first();

        // Gather and deduplicate candidate IDs
        $notes = UniversityReminderNote::whereIn('batch_id', $batches->pluck('id'))->orderBy('id')->get();
        $totalEntries = $notes->count();
        $studentToBatches = [];
        foreach ($notes as $n) {
            $studentToBatches[$n->student_id][] = $n->batch_id;
        }
        $uniqueStudentIds = array_keys($studentToBatches);
        $duplicatesRemoved = $totalEntries - count($uniqueStudentIds);

        // Revalidate candidate eligibility immediately
        $students = StudentDetail::with('confirmation')->whereIn('id', $uniqueStudentIds)->get();
        $verifiedCount = $students->filter(fn ($s) => $s->isVerified())->count();
        $excludedCount = $students->filter(fn ($s) => $s->isExcluded())->count();
        $eligibleStudents = $students->filter(fn ($s) => $s->isEligibleForReminder())->values();

        if ($eligibleStudents->isEmpty()) {
            $msg = 'All students in the selected batches have completed verification or are otherwise ineligible for a reminder.';
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['message' => $msg], 422);
            }
            return redirect()->back()->with('error', $msg);
        }

        $username = Auth::user()?->username ?? 'staff';
        $noteDate = ! empty($validated['note_date']) ? $validated['note_date'] : date('Y-m-d');
        $noteText = ! empty($validated['note_text']) ? $validated['note_text'] : 'Consolidated Reminder Notice';
        $headName = ! empty($validated['head_name']) ? $validated['head_name'] : ($batches->first()->head_name ?: 'The Controller of Examinations');

        $distinctYears = $eligibleStudents->pluck('admission_taken_year')->filter()->unique()->values();
        $combinedYear = $distinctYears->count() === 1 ? $distinctYears->first() : $distinctYears->implode(', ');
        if (mb_strlen($combinedYear) > 60) {
            $combinedYear = 'Consolidated (' . $distinctYears->count() . ' Years)';
        }

        $distinctCourses = $eligibleStudents->pluck('admission_taken_in')->filter()->unique()->values();
        $combinedCourse = $distinctCourses->count() === 1 ? $distinctCourses->first() : 'Multiple Programs (' . $distinctCourses->count() . ')';

        $consolidatedBatch = DB::transaction(function () use (
            $targetUniv, $combinedYear, $combinedCourse, $headName, $username, $batches,
            $totalEntries, $uniqueStudentIds, $duplicatesRemoved, $verifiedCount, $excludedCount,
            $eligibleStudents, $noteText, $noteDate
        ) {
            $batch = UniversityReminderBatch::create([
                'academic_year' => $combinedYear,
                'university_name' => $targetUniv,
                'admission_taken_in' => $combinedCourse,
                'head_name' => $headName,
                'created_by' => $username,
                'is_consolidated' => true,
                'consolidated_meta' => [
                    'source_batch_ids' => $batches->pluck('id')->values()->all(),
                    'pre_dedup_count' => $totalEntries,
                    'unique_candidates_count' => count($uniqueStudentIds),
                    'duplicates_removed_count' => $duplicatesRemoved,
                    'verified_excluded_count' => $verifiedCount,
                    'explicitly_excluded_count' => $excludedCount,
                    'final_eligible_count' => $eligibleStudents->count(),
                    'created_at' => now()->toIso8601String(),
                ],
            ]);

            $sourceRecords = [];
            foreach ($batches->pluck('id') as $sourceId) {
                $sourceRecords[] = [
                    'consolidated_batch_id' => $batch->id,
                    'source_batch_id' => $sourceId,
                    'created_at' => now(),
                ];
            }
            DB::table('university_reminder_batch_sources')->insert($sourceRecords);

            foreach ($eligibleStudents as $student) {
                UniversityReminderNote::create([
                    'batch_id' => $batch->id,
                    'student_id' => $student->id,
                    'note_text' => $noteText,
                    'note_date' => $noteDate,
                    'created_by' => $username,
                    'created_at' => now(),
                ]);
            }

            ActivityLog::record(
                action: 'create_consolidated_batch',
                description: "Created consolidated reminder campaign #{$batch->id} for {$targetUniv} from " . $batches->count() . " source batches with {$eligibleStudents->count()} eligible candidates.",
                entityType: 'UniversityReminderBatch',
                entityId: $batch->id
            );

            return $batch;
        });

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'batch_id' => $consolidatedBatch->id,
                'redirect_url' => route('reminders.university.batch.detail', ['batchId' => $consolidatedBatch->id]),
            ]);
        }

        return redirect()->route('reminders.university.batch.detail', ['batchId' => $consolidatedBatch->id])->with([
            'success' => "Consolidated reminder batch #{$consolidatedBatch->id} created successfully with {$eligibleStudents->count()} eligible candidate(s).",
            'pdf_url' => route('pdf.reminder.university', ['batchId' => $consolidatedBatch->id]),
        ]);
    }

    /**
     * Update student verification status with audit trail logging.
     */
    public function updateStudentVerificationStatus(Request $request, int $id): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:pending,verified,excluded',
            'reason' => 'nullable|string|max:255',
        ]);

        $student = StudentDetail::findOrFail($id);
        $oldStatus = $student->computed_status;
        $newStatus = $validated['status'];

        if (StudentDetail::hasVerificationStatusColumn()) {
            if ($newStatus === 'verified') {
                $student->verification_status = 'verified';
                $student->exclusion_reason = null;
                $student->verified_at = now();
                $student->verified_by = Auth::user()?->username ?? 'staff';
            } elseif ($newStatus === 'excluded') {
                $student->verification_status = 'excluded';
                $student->exclusion_reason = $validated['reason'] ?? 'Manually excluded by staff';
                $student->verified_at = null;
                $student->verified_by = null;
            } else {
                $student->verification_status = 'pending';
                $student->exclusion_reason = null;
                $student->verified_at = null;
                $student->verified_by = null;
            }
            $student->save();
        }

        ActivityLog::record(
            action: 'update_verification_status',
            description: "Updated verification status of candidate {$student->student_name} (Case: {$student->eligibility_case_no}, ID: {$student->id}) from '{$oldStatus}' to '{$newStatus}'." . ($student->exclusion_reason ? " Reason: {$student->exclusion_reason}" : ''),
            entityType: 'StudentDetail',
            entityId: $student->id
        );

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => "Candidate verification status updated to {$newStatus}.",
                'student' => [
                    'id' => $student->id,
                    'verification_status' => $student->verification_status,
                    'computed_status' => $student->computed_status,
                    'is_verified' => $student->isVerified(),
                    'is_excluded' => $student->isExcluded(),
                    'is_eligible' => $student->isEligibleForReminder(),
                    'exclusion_reason' => $student->exclusion_reason,
                ],
            ]);
        }

        return redirect()->back()->with('success', "Candidate verification status updated to {$newStatus}.");
    }

    /**
     * Student / Candidate Document Reminder Form.
     */
    public function studentIndex(): Response
    {
        return Inertia::render('Reminders/Student');
    }

    /**
     * Store new Candidate Reminder notice.
     */
    public function storeStudentReminder(Request $request): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'student_name' => 'required|string|max:200',
            'eligibility_case_no' => 'required|string|max:60',
            'course_name' => 'nullable|string|max:100',
            'missing_doc' => 'required|string|max:255',
            'letter_no' => 'nullable|string|max:100',
            'letter_date' => 'nullable|date',
            'remarks' => 'nullable|string|max:1000',
        ]);

        $record = StudentReminder::create([
            'student_name' => $validated['student_name'],
            'eligibility_case_no' => $validated['eligibility_case_no'],
            'course_name' => $validated['course_name'] ?? null,
            'missing_doc' => $validated['missing_doc'],
            'letter_no' => $validated['letter_no'] ?? null,
            'letter_date' => $validated['letter_date'] ?? null,
            'remarks' => $validated['remarks'] ?? null,
            'created_by' => Auth::user()?->username ?? 'staff',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $pdfUrl = route('pdf.reminder.student', ['id' => $record->id]);

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Candidate reminder notice generated successfully.',
                'record_id' => $record->id,
                'pdf_url' => $pdfUrl,
            ]);
        }

        return redirect()->route('reminders.student.history')->with([
            'success' => 'Candidate reminder notice generated successfully.',
            'record_id' => $record->id,
            'pdf_url' => $pdfUrl,
        ]);
    }

    /**
     * Update candidate reminder notice (Letter No, Date, Remarks).
     */
    public function updateStudentReminder(Request $request, int $id): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'student_name' => 'nullable|string|max:200',
            'eligibility_case_no' => 'nullable|string|max:60',
            'course_name' => 'nullable|string|max:100',
            'missing_doc' => 'nullable|string|max:255',
            'letter_no' => 'nullable|string|max:100',
            'letter_date' => 'nullable|date',
            'remarks' => 'nullable|string|max:1000',
        ]);

        $record = StudentReminder::findOrFail($id);
        $updateData = [];
        foreach (['student_name', 'eligibility_case_no', 'course_name', 'missing_doc', 'letter_no', 'letter_date', 'remarks'] as $field) {
            if ($request->has($field)) {
                $updateData[$field] = $validated[$field] ?? null;
            }
        }
        $updateData['updated_at'] = now();

        $record->update($updateData);

        ActivityLog::record('reminders_student.update', "Updated candidate reminder #{$id} ({$record->student_name}).");

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Candidate reminder notice updated successfully.',
                'record' => $record,
            ]);
        }

        return back()->with('success', 'Candidate reminder notice updated successfully.');
    }

    /**
     * Candidate Reminders History.
     */
    public function studentHistory(Request $request): Response
    {
        $search = trim((string) $request->input('search', ''));

        $query = StudentReminder::query();

        if ($search !== '') {
            $query->where('student_name', 'like', "%{$search}%")
                ->orWhere('eligibility_case_no', 'like', "%{$search}%");
        }

        $records = $query->orderBy('id', 'desc')->paginate(25)->withQueryString();

        return Inertia::render('Reminders/StudentHistory', [
            'records' => $records,
            'filters' => [
                'search' => $search,
            ],
        ]);
    }

    /**
     * Delete Candidate Reminder notice.
     */
    public function studentDestroy(int $id): RedirectResponse
    {
        abort_unless(Setting::enabled('feature_delete_enabled'), 403, 'Deleting records is currently disabled by an administrator.');

        $record = StudentReminder::findOrFail($id);
        $record->delete();

        return redirect()->back()->with('success', 'Candidate reminder notice deleted successfully.');
    }

    /**
     * Export Candidate Reminders to XLSX.
     */
    public function studentExport(): StreamedResponse
    {
        abort_unless(Setting::enabled('feature_export_enabled'), 403, 'Exporting records is currently disabled by an administrator.');

        $records = StudentReminder::orderBy('id', 'desc')->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Candidate Reminders');

        $headers = ['ID', 'Candidate Name', 'Case No', 'Letter No', 'Letter Date', 'Remarks', 'Course', 'Missing Documents', 'Created By', 'Created At'];
        $sheet->fromArray($headers, null, 'A1');
        $sheet->getStyle('A1:J1')->getFont()->setBold(true);

        $rows = [];
        foreach ($records as $r) {
            $rows[] = $this->sanitizeRow([
                $r->id,
                $r->student_name,
                $r->eligibility_case_no,
                $r->letter_no,
                $r->letter_date ? $r->letter_date->format('Y-m-d') : '-',
                $r->remarks,
                $r->course_name,
                $r->missing_doc,
                $r->created_by,
                $r->created_at ? $r->created_at->format('d/m/Y H:i') : '-',
            ]);
        }

        if (! empty($rows)) {
            $sheet->fromArray($rows, null, 'A2');
        }

        foreach (range('A', 'J') as $colId) {
            $sheet->getColumnDimension($colId)->setAutoSize(true);
        }

        $filename = 'candidate_reminders_'.date('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Export University Reminders Pending Cases to XLSX with University Name.
     */
    public function universityExport(Request $request): StreamedResponse
    {
        abort_unless(Setting::enabled('feature_export_enabled'), 403, 'Exporting records is currently disabled by an administrator.');

        $selectedYear = trim((string) $request->input('acd_year', ''));
        $selectedStream = trim((string) $request->input('stream', ''));
        $selectedColg = trim((string) $request->input('clg_add', ''));
        $selectedStudentName = trim((string) $request->input('student_name', ''));

        [$colleges, $matchCollege] = $this->buildCollegeMatcher();

        $query = StudentDetail::query()
            ->whereNotNull('student_name')
            ->where('student_name', '!=', '');

        if ($selectedStudentName !== '') {
            $query->where('student_name', 'like', "%{$selectedStudentName}%");
        }
        if ($selectedYear !== '') {
            $query->where('admission_taken_year', $selectedYear);
        }
        if ($selectedStream !== '') {
            $query->where('admission_taken_in', $selectedStream);
        }
        if ($selectedColg !== '') {
            $col = $matchCollege($selectedColg);
            if ($col) {
                $query->where(function ($q) use ($selectedColg, $col) {
                    $q->where('clg_add', $selectedColg)
                        ->orWhere('clg_add', 'like', "%{$selectedColg}%");
                    if (! empty($col->Address)) {
                        $q->orWhere('clg_add', 'like', "%{$col->Address}%");
                    }
                    if (! empty($col->Name)) {
                        $q->orWhere('clg_add', 'like', "%{$col->Name}%");
                    }
                });
            } else {
                $query->where('clg_add', 'like', "%{$selectedColg}%");
            }
        }

        $selectedVerificationStatus = trim((string) $request->input('verification_status', ''));
        if ($selectedVerificationStatus === 'verified') {
            $query->verified();
        } elseif ($selectedVerificationStatus === 'excluded') {
            $query->excluded();
        } elseif ($selectedVerificationStatus === 'pending' || $selectedVerificationStatus === 'eligible') {
            $query->eligibleForReminder();
        }

        $students = $query->orderBy('id', 'desc')->get();
        $studentIds = $students->pluck('id')->toArray();
        $noteCounts = UniversityReminderNote::whereIn('student_id', $studentIds)
            ->selectRaw('student_id, count(*) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id')
            ->toArray();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('University Reminders');

        $headers = [
            'Candidate Name',
            'Eligibility Case No.',
            'University Name',
            'Target University Address',
            'Academic Year',
            'Program / Stream',
            'Prior Reminder Notices',
        ];
        $sheet->fromArray($headers, null, 'A1');
        $sheet->getStyle('A1:G1')->getFont()->setBold(true);

        $rows = [];
        foreach ($students as $s) {
            $col = $matchCollege($s->clg_add);
            $univName = $col ? trim((string) $col->Name, " ,\t\n\r\0\x0B") : '';
            if (empty($univName) && ! empty($s->clg_add)) {
                $cleanFirst = trim(explode('<br>', (string) $s->clg_add)[0]);
                if ($cleanFirst !== '') {
                    $univName = $cleanFirst;
                }
            }

            $count = $noteCounts[$s->id] ?? 0;
            $cleanAddr = strip_tags(str_replace(['<br>', '<br/>', '<br />', '<br/ >'], "\n", (string) $s->clg_add));

            $rows[] = $this->sanitizeRow([
                $s->student_name,
                $s->eligibility_case_no ?: '—',
                $univName ?: '—',
                $cleanAddr ?: '—',
                $s->admission_taken_year ?: '—',
                $s->admission_taken_in ?: '—',
                $count > 0 ? "{$count} prior notice(s)" : 'None yet',
            ]);
        }

        if (! empty($rows)) {
            $sheet->fromArray($rows, null, 'A2');
        }

        foreach (range('A', 'G') as $colId) {
            $sheet->getColumnDimension($colId)->setAutoSize(true);
        }

        $filename = 'reminders_university_'.date('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * Export University Reminders History to XLSX.
     */
    public function universityHistoryExport(Request $request): StreamedResponse
    {
        abort_unless(Setting::enabled('feature_export_enabled'), 403, 'Exporting records is currently disabled by an administrator.');

        $search = trim((string) $request->input('search', ''));
        $query = UniversityReminderBatch::withCount(['notes as candidate_count' => function ($q) {
            $q->select(DB::raw('COUNT(DISTINCT student_id)'));
        }]);

        if ($search !== '') {
            $query->where('university_name', 'like', "%{$search}%")
                ->orWhere('academic_year', 'like', "%{$search}%");
        }

        $batches = $query->orderBy('id', 'desc')->get();

        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Reminder History');

        $headers = ['University Name', 'Academic Year', 'Course', 'Candidates', 'Started'];
        $sheet->fromArray($headers, null, 'A1');
        $sheet->getStyle('A1:E1')->getFont()->setBold(true);

        $rows = [];
        foreach ($batches as $b) {
            $rows[] = $this->sanitizeRow([
                $b->university_name,
                $b->academic_year,
                $b->admission_taken_in ?: '-',
                $b->candidate_count,
                $b->created_at ? $b->created_at->format('d/m/Y H:i') : '-',
            ]);
        }

        if (! empty($rows)) {
            $sheet->fromArray($rows, null, 'A2');
        }

        foreach (range('A', 'E') as $colId) {
            $sheet->getColumnDimension($colId)->setAutoSize(true);
        }

        $filename = 'reminders_university_history_'.date('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
