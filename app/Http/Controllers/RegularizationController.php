<?php

namespace App\Http\Controllers;

use App\Models\Regularization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RegularizationController extends Controller
{
    /**
     * Show regularization form.
     */
    public function index(): Response
    {
        return Inertia::render('Regularization/Index');
    }

    /**
     * Store new regularization letter.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'student_name' => 'required|string|max:200',
            'gender' => 'nullable|string|max:10',
            'eligibility_case_no' => 'nullable|string|max:60',
            'admission_letter_for' => 'nullable|string|max:200',
            'admission_letter_date' => 'nullable|date',
            'admission_taken_year' => 'nullable|string|max:60',
            'admission_taken_in' => 'nullable|string|max:100',
            'university_name' => 'nullable|string|max:255',
            'clg_add' => 'nullable|string|max:255',
            'passing_course' => 'nullable|string|max:100',
            'admission_passing_course' => 'nullable|string|max:100',
        ]);

        $univ = $validated['university_name'] ?? $validated['clg_add'] ?? null;
        $course = $validated['passing_course'] ?? $validated['admission_passing_course'] ?? null;

        $record = Regularization::create([
            'gender' => $validated['gender'] ?? 'Mr.',
            'student_name' => $validated['student_name'],
            'eligibility_case_no' => $validated['eligibility_case_no'] ?? null,
            'admission_letter_for' => $validated['admission_letter_for'] ?? 'The Controller of Examinations',
            'admission_letter_date' => $validated['admission_letter_date'] ?? null,
            'admission_taken_year' => $validated['admission_taken_year'] ?? null,
            'admission_taken_in' => $validated['admission_taken_in'] ?? null,
            'university_name' => $univ,
            'passing_course' => $course,
            'created_by' => Auth::user()?->username ?? 'staff',
        ]);

        return redirect()->route('regularization.history')->with([
            'success' => 'Regularization letter generated successfully.',
            'pdf_url' => route('pdf.regularization', ['id' => $record->id]),
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
    public function update(Request $request, int $id): RedirectResponse
    {
        $record = Regularization::findOrFail($id);

        $validated = $request->validate([
            'student_name' => 'required|string|max:200',
            'gender' => 'nullable|string|max:10',
            'eligibility_case_no' => 'nullable|string|max:60',
            'admission_letter_for' => 'nullable|string|max:200',
            'admission_letter_date' => 'nullable|date',
            'admission_taken_year' => 'nullable|string|max:60',
            'admission_taken_in' => 'nullable|string|max:100',
            'university_name' => 'nullable|string|max:255',
            'passing_course' => 'nullable|string|max:100',
        ]);

        $record->update($validated);

        return redirect()->back()->with('success', 'Regularization record updated successfully.');
    }

    /**
     * Delete regularization record.
     */
    public function destroy(int $id): RedirectResponse
    {
        $record = Regularization::findOrFail($id);
        $record->delete();

        return redirect()->back()->with('success', 'Regularization record deleted successfully.');
    }

    /**
     * Export regularization history to CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        $records = Regularization::orderBy('id', 'desc')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="regularization_history_' . date('Ymd_His') . '.csv"',
        ];

        return response()->stream(function () use ($records) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Gender', 'Student Name', 'Case No', 'Admitted Course', 'Academic Year', 'University', 'Letter For', 'Letter Date', 'Created By', 'Created At']);

            foreach ($records as $r) {
                fputcsv($handle, [
                    $r->id,
                    $r->gender,
                    $r->student_name,
                    $r->eligibility_case_no,
                    $r->admission_taken_in,
                    $r->admission_taken_year,
                    $r->university_name,
                    $r->admission_letter_for,
                    $r->admission_letter_date?->format('Y-m-d'),
                    $r->created_by,
                    $r->created_at?->format('Y-m-d H:i:s'),
                ]);
            }
            fclose($handle);
        }, 200, $headers);
    }
}
