<?php

namespace App\Http\Controllers;

use App\Models\CollegeDetail;
use App\Models\StudentDetail;
use App\Models\StudentReminder;
use App\Models\UniversityReminderBatch;
use App\Models\UniversityReminderNote;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReminderController extends Controller
{
    /**
     * University Marksheet Reminder Portal - Student Selection Screen.
     */
    public function universityIndex(Request $request): Response
    {
        $selectedYear = trim((string) $request->input('acd_year', ''));
        $selectedStream = trim((string) $request->input('stream', ''));
        $selectedColg = trim((string) $request->input('clg_add', ''));

        $query = StudentDetail::query();

        if ($selectedYear !== '') {
            $query->where('admission_taken_year', $selectedYear);
        }
        if ($selectedStream !== '') {
            $query->where('admission_taken_in', $selectedStream);
        }
        if ($selectedColg !== '') {
            $query->where('clg_add', 'like', "%{$selectedColg}%");
        }

        $students = $query->orderBy('student_name', 'asc')->paginate(30)->withQueryString();

        // Calculate reminder note counts for the displayed students
        $studentIds = $students->pluck('id')->toArray();
        $noteCounts = UniversityReminderNote::whereIn('student_id', $studentIds)
            ->selectRaw('student_id, count(*) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id')
            ->toArray();

        // Attach note counts
        $students->getCollection()->transform(function ($item) use ($noteCounts) {
            $item->reminder_note_count = $noteCounts[$item->id] ?? 0;
            return $item;
        });

        return Inertia::render('Reminders/University', [
            'students' => $students,
            'filters' => [
                'acd_year' => $selectedYear,
                'stream' => $selectedStream,
                'clg_add' => $selectedColg,
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
            'academic_year' => 'required|string|max:60',
            'university_name' => 'required|string|max:255',
            'admission_taken_in' => 'nullable|string|max:100',
            'head_name' => 'nullable|string|max:100',
        ]);

        $username = Auth::user()?->username ?? 'staff';

        // Find or create batch for this (academic_year, university_name)
        $batch = UniversityReminderBatch::firstOrCreate(
            [
                'academic_year' => $validated['academic_year'],
                'university_name' => $validated['university_name'],
            ],
            [
                'admission_taken_in' => $validated['admission_taken_in'] ?? null,
                'head_name' => $validated['head_name'] ?? 'The Controller of Examinations',
                'created_by' => $username,
            ]
        );

        $noteDate = $validated['note_date'] ?: date('Y-m-d');

        // Add note for each selected student
        foreach ($validated['student_ids'] as $studentId) {
            UniversityReminderNote::create([
                'batch_id' => $batch->id,
                'student_id' => $studentId,
                'note_text' => $validated['note_text'],
                'note_date' => $noteDate,
                'created_by' => $username,
                'created_at' => now(),
            ]);
        }

        return redirect()->route('reminders.university.batch.detail', ['batchId' => $batch->id])->with([
            'success' => 'University reminder notes recorded successfully.',
            'pdf_url' => route('pdf.reminder.university', ['batchId' => $batch->id]),
        ]);
    }

    /**
     * University Reminder Batches History.
     */
    public function universityHistory(Request $request): Response
    {
        $university = trim((string) $request->input('university', ''));
        $year = trim((string) $request->input('year', ''));

        $query = UniversityReminderBatch::query();

        if ($university !== '') {
            $query->where('university_name', 'like', "%{$university}%");
        }
        if ($year !== '') {
            $query->where('academic_year', $year);
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
            ],
        ]);
    }

    /**
     * Batch Detail showing all students and reminder notes.
     */
    public function universityBatchDetail(int $batchId): Response
    {
        $batch = UniversityReminderBatch::findOrFail($batchId);

        $notes = UniversityReminderNote::where('batch_id', $batchId)->orderBy('id', 'desc')->get();
        $studentIds = $notes->pluck('student_id')->unique();

        $students = StudentDetail::whereIn('id', $studentIds)->get();

        foreach ($students as $s) {
            $s->notes = $notes->where('student_id', $s->id)->values();
        }

        return Inertia::render('Reminders/UniversityBatchDetail', [
            'batch' => $batch,
            'students' => $students,
        ]);
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
    public function storeStudentReminder(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_name' => 'required|string|max:200',
            'eligibility_case_no' => 'required|string|max:60',
            'course_name' => 'nullable|string|max:100',
            'missing_doc' => 'required|string|max:255',
        ]);

        $record = StudentReminder::create([
            'student_name' => $validated['student_name'],
            'eligibility_case_no' => $validated['eligibility_case_no'],
            'course_name' => $validated['course_name'] ?? null,
            'missing_doc' => $validated['missing_doc'],
            'created_by' => Auth::user()?->username ?? 'staff',
            'created_at' => now(),
        ]);

        return redirect()->route('reminders.student.history')->with([
            'success' => 'Candidate reminder notice generated successfully.',
            'pdf_url' => route('pdf.reminder.student', ['id' => $record->id]),
        ]);
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
        $record = StudentReminder::findOrFail($id);
        $record->delete();

        return redirect()->back()->with('success', 'Candidate reminder notice deleted successfully.');
    }

    /**
     * Export Candidate Reminders to CSV.
     */
    public function studentExport(): StreamedResponse
    {
        $records = StudentReminder::orderBy('id', 'desc')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="candidate_reminders_' . date('Ymd_His') . '.csv"',
        ];

        return response()->stream(function () use ($records) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Candidate Name', 'Case No', 'Course', 'Missing Documents', 'Created By', 'Created At']);

            foreach ($records as $r) {
                fputcsv($handle, [
                    $r->id,
                    $r->student_name,
                    $r->eligibility_case_no,
                    $r->course_name,
                    $r->missing_doc,
                    $r->created_by,
                    $r->created_at,
                ]);
            }
            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Export University Reminders Pending Cases to CSV.
     */
    public function universityExport(Request $request): StreamedResponse
    {
        $selectedYear = trim((string) $request->input('acd_year', ''));
        $selectedStream = trim((string) $request->input('stream', ''));
        $selectedColg = trim((string) $request->input('clg_add', ''));

        $query = StudentDetail::query();
        if ($selectedYear !== '') {
            $query->where('admission_taken_year', $selectedYear);
        }
        if ($selectedStream !== '') {
            $query->where('admission_taken_in', $selectedStream);
        }
        if ($selectedColg !== '') {
            $query->where('clg_add', 'like', "%{$selectedColg}%");
        }

        $students = $query->orderBy('student_name', 'asc')->get();
        $studentIds = $students->pluck('id')->toArray();
        $noteCounts = UniversityReminderNote::whereIn('student_id', $studentIds)
            ->selectRaw('student_id, count(*) as total')
            ->groupBy('student_id')
            ->pluck('total', 'student_id')
            ->toArray();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="reminders_university_' . date('Ymd_His') . '.csv"',
        ];

        return response()->stream(function () use ($students, $noteCounts) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Candidate Name', 'Eligibility Case No.', 'Target University Address', 'Academic Year', 'Reminder Status']);

            foreach ($students as $s) {
                $count = $noteCounts[$s->id] ?? 0;
                fputcsv($handle, [
                    $s->student_name,
                    $s->eligibility_case_no,
                    $s->clg_add,
                    $s->admission_taken_year,
                    $count > 0 ? "{$count} prior notice(s)" : 'None yet',
                ]);
            }
            fclose($handle);
        }, 200, $headers);
    }

    /**
     * Export University Reminders History to CSV.
     */
    public function universityHistoryExport(Request $request): StreamedResponse
    {
        $search = trim((string) $request->input('search', ''));
        $query = UniversityReminderBatch::withCount('students');

        if ($search !== '') {
            $query->where('university_name', 'like', "%{$search}%")
                ->orWhere('academic_year', 'like', "%{$search}%");
        }

        $batches = $query->orderBy('id', 'desc')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="reminders_university_history_' . date('Ymd_His') . '.csv"',
        ];

        return response()->stream(function () use ($batches) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['University', 'Academic Year', 'Course', 'Candidates', 'Started']);

            foreach ($batches as $b) {
                fputcsv($handle, [
                    $b->university_name,
                    $b->academic_year,
                    $b->admission_taken_in ?: '-',
                    $b->students_count,
                    $b->created_at ? $b->created_at->format('d/m/Y H:i') : '-',
                ]);
            }
            fclose($handle);
        }, 200, $headers);
    }
}
