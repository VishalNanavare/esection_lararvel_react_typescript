<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\SanitizesSpreadsheetCells;
use App\Models\AcademicYear;
use App\Models\CollegeDetail;
use App\Models\Regularization;
use App\Models\Setting;
use App\Models\StreamDetail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RegularizationController extends Controller
{
    use SanitizesSpreadsheetCells;

    /**
     * Show regularization form.
     */
    public function index(): Response
    {
        $academicYears = AcademicYear::orderBy('id', 'desc')->get()->map(fn ($y) => [
            'id' => $y->year_label,
            'text' => $y->year_label,
            'is_current' => (bool) $y->is_current,
        ]);

        $streamDivisions = StreamDetail::whereNotNull('Division')
            ->where('Division', '!=', '')
            ->orderBy('Division', 'asc')
            ->pluck('Division')
            ->toArray();

        $legacyStreams = [
            'MA', 'MCOM', 'MA Edu', 'PGDFM', 'PGDORM',
            'MSC IT', 'MSC MATHS', 'MMS', 'BAF', 'BMS',
        ];

        $combinedStreams = array_values(array_unique(array_merge($streamDivisions, $legacyStreams)));
        sort($combinedStreams, SORT_NATURAL | SORT_FLAG_CASE);

        $streams = array_map(fn ($s) => [
            'id' => $s,
            'text' => $s,
            'Division' => $s,
        ], $combinedStreams);

        $univQuery = CollegeDetail::query();
        try {
            if (\Illuminate\Support\Facades\Schema::hasColumn('college_details', 'is_active')) {
                $univQuery->where(function ($q) {
                    $q->where('is_active', true)->orWhereNull('is_active');
                });
            }
        } catch (\Throwable) {}

        $universities = $univQuery->orderBy('Name', 'asc')
            ->get()
            ->map(function ($col) {
                $name = trim((string) $col->Name, " ,\t\n\r\0\x0B");

                return [
                    'id' => $col->id,
                    'value' => $name,
                    'label' => $name,
                    'name' => $name,
                    'text' => $name,
                ];
            });

        return Inertia::render('Regularization/Index', [
            'academicYears' => $academicYears,
            'streams' => $streams,
            'universities' => $universities,
        ]);
    }

    /**
     * Store new regularization letter.
     */
    public function store(Request $request): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $validated = $request->validate([
            'student_name' => 'required|string|max:200',
            'gender' => 'nullable|string|max:10',
            'eligibility_case_no' => 'nullable|string|max:60',
            'admission_letter_for' => 'nullable|string|max:200',
            'admission_letter_date' => 'nullable|date',
            'letter_no' => 'nullable|string|max:100',
            'letter_date' => 'nullable|date',
            'remarks' => 'nullable|string|max:1000',
            'admission_taken_year' => 'nullable|string|max:60',
            'admission_taken_in' => 'nullable|string|max:100',
            'university_name' => 'nullable|string|max:255',
            'clg_add' => 'nullable|string|max:255',
            'passing_course' => 'nullable|string|max:100',
            'admission_passing_course' => 'nullable|string|max:100',
        ]);

        $univ = $validated['university_name'] ?? $validated['clg_add'] ?? null;
        $course = $validated['passing_course'] ?? $validated['admission_passing_course'] ?? null;
        $lDate = $validated['letter_date'] ?? $validated['admission_letter_date'] ?? null;

        $record = Regularization::create([
            'gender' => $validated['gender'] ?? 'Mr.',
            'student_name' => $validated['student_name'],
            'eligibility_case_no' => $validated['eligibility_case_no'] ?? null,
            'admission_letter_for' => $validated['admission_letter_for'] ?? 'The Controller of Examinations',
            'admission_letter_date' => $validated['admission_letter_date'] ?? $lDate,
            'letter_no' => $validated['letter_no'] ?? null,
            'letter_date' => $lDate,
            'remarks' => $validated['remarks'] ?? null,
            'admission_taken_year' => $validated['admission_taken_year'] ?? null,
            'admission_taken_in' => $validated['admission_taken_in'] ?? null,
            'university_name' => $univ,
            'passing_course' => $course,
            'created_by' => Auth::user()?->username ?? 'staff',
        ]);

        try {
            DB::table('reg_data')->insert([
                'gender' => $validated['gender'] ?? 'Mr',
                'Name' => $validated['student_name'],
                'Admission_letter_date' => $validated['admission_letter_date'] ?? $lDate,
                'Adm_taken_yr' => $validated['admission_taken_year'] ?? null,
                'Adm_taken_in' => $validated['admission_taken_in'] ?? null,
                'Uni_add' => $univ,
                'Adm_letter' => $validated['admission_letter_for'] ?? '',
                'Pass_Course' => $course,
            ]);
        } catch (\Throwable $e) {
            // Silently ignore if legacy table not present
        }

        $pdfUrl = route('pdf.regularization', ['id' => $record->id]);

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Regularization letter generated successfully.',
                'record_id' => $record->id,
                'pdf_url' => $pdfUrl,
            ]);
        }

        return redirect()->route('regularization.history')->with([
            'success' => 'Regularization letter generated successfully.',
            'record_id' => $record->id,
            'pdf_url' => $pdfUrl,
        ]);
    }

    /**
     * Show history of generated regularization letters.
     */
    public function history(Request $request): Response
    {
        $name = trim((string) $request->input('name', ''));
        $caseNo = trim((string) $request->input('case_no', ''));
        $university = trim((string) $request->input('university', ''));
        $year = trim((string) $request->input('year', ''));

        $query = Regularization::query();

        if ($name !== '') {
            $query->where('student_name', 'like', "%{$name}%");
        }
        if ($caseNo !== '') {
            $query->where('eligibility_case_no', 'like', "%{$caseNo}%");
        }
        if ($university !== '') {
            $query->where('university_name', 'like', "%{$university}%");
        }
        if ($year !== '') {
            $query->where('admission_taken_year', $year);
        }

        $records = $query->orderBy('id', 'desc')->paginate(25)->withQueryString();

        return Inertia::render('Regularization/History', [
            'records' => $records,
            'filters' => [
                'name' => $name,
                'case_no' => $caseNo,
                'university' => $university,
                'year' => $year,
            ],
        ]);
    }

    /**
     * Update regularization record.
     */
    public function update(Request $request, int $id): RedirectResponse|\Illuminate\Http\JsonResponse
    {
        $record = Regularization::findOrFail($id);

        $validated = $request->validate([
            'student_name' => 'nullable|string|max:200',
            'gender' => 'nullable|string|max:10',
            'eligibility_case_no' => 'nullable|string|max:60',
            'admission_letter_for' => 'nullable|string|max:200',
            'admission_letter_date' => 'nullable|date',
            'letter_no' => 'nullable|string|max:100',
            'letter_date' => 'nullable|date',
            'remarks' => 'nullable|string|max:1000',
            'admission_taken_year' => 'nullable|string|max:60',
            'admission_taken_in' => 'nullable|string|max:100',
            'university_name' => 'nullable|string|max:255',
            'passing_course' => 'nullable|string|max:100',
        ]);

        $updateData = [];
        foreach (['student_name', 'gender', 'eligibility_case_no', 'admission_letter_for', 'admission_letter_date', 'letter_no', 'letter_date', 'remarks', 'admission_taken_year', 'admission_taken_in', 'university_name', 'passing_course'] as $field) {
            if ($request->has($field)) {
                $updateData[$field] = $validated[$field] ?? null;
            }
        }

        if (! empty($updateData)) {
            $record->update($updateData);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Regularization record updated successfully.',
                'record' => $record,
            ]);
        }

        return redirect()->back()->with('success', 'Regularization record updated successfully.');
    }

    /**
     * Delete regularization record.
     */
    public function destroy(int $id): RedirectResponse
    {
        abort_unless(Setting::enabled('feature_delete_enabled'), 403, 'Deleting records is currently disabled by an administrator.');

        $record = Regularization::findOrFail($id);
        $record->delete();

        return redirect()->back()->with('success', 'Regularization record deleted successfully.');
    }

    /**
     * Export regularization history to CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        abort_unless(Setting::enabled('feature_export_enabled'), 403, 'Exporting records is currently disabled by an administrator.');

        $records = Regularization::orderBy('id', 'desc')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="regularization_history_'.date('Ymd_His').'.csv"',
        ];

        return response()->stream(function () use ($records) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Gender', 'Student Name', 'Case No', 'Letter No', 'Letter Date', 'Remarks', 'Admitted Course', 'Academic Year', 'University', 'Letter For', 'Created By', 'Created At']);

            foreach ($records as $r) {
                fputcsv($handle, $this->sanitizeRow([
                    $r->id,
                    $r->gender,
                    $r->student_name,
                    $r->eligibility_case_no,
                    $r->letter_no,
                    $r->letter_date?->format('Y-m-d'),
                    $r->remarks,
                    $r->admission_taken_in,
                    $r->admission_taken_year,
                    $r->university_name,
                    $r->admission_letter_for,
                    $r->created_by,
                    $r->created_at?->format('Y-m-d H:i:s'),
                ]));
            }
            fclose($handle);
        }, 200, $headers);
    }
}
