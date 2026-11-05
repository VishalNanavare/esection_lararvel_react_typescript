<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Course;
use App\Models\ScholarshipDemandLetter;
use App\Models\ScholarshipDocument;
use App\Models\ScholarshipFeeMaster;
use App\Models\ScholarshipInstallment;
use App\Models\ScholarshipStudent;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class ScholarshipController extends Controller
{
    /**
     * Dashboard & Master Roster of Scholarship Applicants.
     */
    public function index(Request $request): Response
    {
        $query = ScholarshipStudent::with(['course', 'academicYear', 'document', 'installments']);

        // Filters
        if ($request->filled('academic_year_id')) {
            $query->where('academic_year_id', $request->integer('academic_year_id'));
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->integer('course_id'));
        }

        if ($request->filled('caste_category')) {
            $query->where('caste_category', $request->string('caste_category'));
        }

        if ($request->filled('scholarship_status')) {
            $query->where('scholarship_status', $request->string('scholarship_status'));
        }

        if ($request->filled('search')) {
            $search = trim($request->string('search'));
            $query->where(function ($q) use ($search) {
                $q->where('student_name', 'LIKE', "%{$search}%")
                  ->orWhere('form_number', 'LIKE', "%{$search}%")
                  ->orWhere('registration_no', 'LIKE', "%{$search}%")
                  ->orWhere('mobile', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        // Summary Counts
        $summary = [
            'total_students' => ScholarshipStudent::count(),
            'pending_docs' => ScholarshipStudent::where('scholarship_status', 'pending_docs')->count(),
            'docs_verified' => ScholarshipStudent::where('scholarship_status', 'docs_verified')->count(),
            'fully_settled' => ScholarshipStudent::where('scholarship_status', 'fully_settled')->count(),
            'not_processed' => ScholarshipStudent::where('scholarship_status', 'not_processed')->count(),
            'cancelled' => ScholarshipStudent::where('scholarship_status', 'cancelled')->count(),
        ];

        $students = $query->orderByDesc('id')->paginate(25)->withQueryString();

        $academicYears = AcademicYear::orderByDesc('is_current')->orderByDesc('year_label')->get(['id', 'year_label', 'is_current']);
        $courses = Course::orderBy('name')->get(['id', 'name']);
        $categories = ['SC', 'ST', 'OBC', 'VJNT', 'SBC', 'SEBC', 'EWS', 'General'];

        return Inertia::render('Scholarship/Index', [
            'students' => $students,
            'summary' => $summary,
            'filters' => $request->only(['academic_year_id', 'course_id', 'caste_category', 'scholarship_status', 'search']),
            'academicYears' => $academicYears,
            'courses' => $courses,
            'categories' => $categories,
        ]);
    }

    /**
     * Get detailed record of a single student (JSON / Modal).
     */
    public function show(int $id): JsonResponse
    {
        $student = ScholarshipStudent::with(['course', 'academicYear', 'document', 'installments', 'demandLetters'])
            ->findOrFail($id);

        return response()->json([
            'student' => $student,
        ]);
    }

    /**
     * Update the 6 Document Checkboxes.
     */
    public function updateDocuments(Request $request, int $id): JsonResponse
    {
        $student = ScholarshipStudent::findOrFail($id);

        $validated = $request->validate([
            'caste_cert' => 'boolean',
            'caste_validity' => 'boolean',
            'income_cert' => 'boolean',
            'domicile_cert' => 'boolean',
            'prev_marksheet' => 'boolean',
            'bank_aadhaar_linked' => 'boolean',
            'remarks' => 'nullable|string|max:500',
        ]);

        $doc = ScholarshipDocument::firstOrNew(['scholarship_student_id' => $student->id]);
        $doc->fill($validated);
        $doc->verified_by = auth()->user()?->username ?? 'Staff';
        $doc->verified_at = now();
        $doc->save();

        // Update student stage if all 6 are checked
        if ($doc->completedCount() === 6 && $student->scholarship_status === 'pending_docs') {
            $student->scholarship_status = 'docs_verified';
            $student->save();
        }

        $student->load(['document', 'installments']);

        return response()->json([
            'success' => true,
            'message' => 'Document checklist updated successfully.',
            'student' => $student,
        ]);
    }

    /**
     * Update Installments Repeater & recalculate ledger in real-time.
     */
    public function updateInstallments(Request $request, int $id): JsonResponse
    {
        $student = ScholarshipStudent::findOrFail($id);

        $request->validate([
            'installments' => 'required|array',
            'installments.*.installment_no' => 'required|integer',
            'installments.*.amount' => 'required|numeric|min:0',
            'installments.*.status' => 'required|in:paid_done,unpaid,no_response',
            'installments.*.paid_date' => 'nullable|date',
            'installments.*.reference_no' => 'nullable|string|max:100',
            'installments.*.remarks' => 'nullable|string|max:500',
        ]);

        foreach ($request->input('installments') as $row) {
            ScholarshipInstallment::updateOrCreate(
                [
                    'scholarship_student_id' => $student->id,
                    'installment_no' => $row['installment_no'],
                ],
                [
                    'amount' => $row['amount'] ?? 0,
                    'status' => $row['status'] ?? 'unpaid',
                    'paid_date' => $row['paid_date'] ?? null,
                    'reference_no' => $row['reference_no'] ?? null,
                    'remarks' => $row['remarks'] ?? null,
                ]
            );
        }

        $student->recalculateFinancials();
        $student->load(['document', 'installments']);

        return response()->json([
            'success' => true,
            'message' => 'Installments updated and balance ledger recalculated.',
            'student' => $student,
        ]);
    }

    /**
     * Mark student as Open / Scholarship Not Processed with reason & manual recovery amount.
     */
    public function markNotProcessed(Request $request, int $id): JsonResponse
    {
        $student = ScholarshipStudent::findOrFail($id);

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
            'manual_recovery_amount' => 'nullable|numeric|min:0',
        ]);

        $student->scholarship_status = 'not_processed';
        $student->not_processed_reason = $validated['reason'];
        if (isset($validated['manual_recovery_amount'])) {
            $student->manual_recovery_amount = $validated['manual_recovery_amount'];
            $student->balance_due = $validated['manual_recovery_amount'];
        }

        $student->save();
        $student->recalculateFinancials();

        return response()->json([
            'success' => true,
            'message' => 'Student status marked as Scholarship Not Processed.',
            'student' => $student->load(['document', 'installments', 'demandLetters']),
        ]);
    }

    /**
     * Generate & Download Fee Recovery Demand Notice PDF.
     */
    public function generateDemandLetter(Request $request, int $id): HttpResponse
    {
        $student = ScholarshipStudent::with(['course', 'academicYear'])->findOrFail($id);

        $customAmount = $request->input('manual_amount');
        $demanded = $customAmount !== null ? (float) $customAmount : (float) $student->balance_due;
        $reason = $request->input('reason') ?: $student->not_processed_reason;

        $letterNo = 'IDOL/SCH/REC/' . date('Y') . '/' . str_pad($student->id, 5, '0', STR_PAD_LEFT);

        $letter = ScholarshipDemandLetter::create([
            'scholarship_student_id' => $student->id,
            'letter_no' => $letterNo,
            'letter_date' => now()->toDateString(),
            'total_course_fee' => $student->total_fee,
            'fee_collected' => $student->total_collected,
            'balance_demanded' => $demanded,
            'non_processed_reason' => $reason,
            'generated_by' => auth()->user()?->username ?? 'Section Officer',
        ]);

        $pdf = Pdf::loadView('pdf.scholarship_demand_letter', [
            'student' => $student,
            'letter' => $letter,
        ]);

        return $pdf->download("Demand_Notice_{$student->form_number}.pdf");
    }
}
