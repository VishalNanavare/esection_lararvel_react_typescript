<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\Course;
use App\Models\ScholarshipFeeMaster;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ScholarshipFeeMasterController extends Controller
{
    /**
     * Display fee master matrix.
     */
    public function index(Request $request): Response
    {
        $query = ScholarshipFeeMaster::with(['academicYear', 'course']);

        if ($request->filled('academic_year_id')) {
            $query->where('academic_year_id', $request->integer('academic_year_id'));
        }

        if ($request->filled('course_id')) {
            $query->where('course_id', $request->integer('course_id'));
        }

        $feeMasters = $query->orderByDesc('academic_year_id')->orderBy('course_id')->get();
        $academicYears = AcademicYear::orderByDesc('is_current')->orderByDesc('year_label')->get(['id', 'year_label', 'is_current']);
        $courses = Course::orderBy('name')->get(['id', 'name']);
        $categories = ['SC', 'ST', 'OBC', 'VJNT', 'SBC', 'SEBC', 'EWS', 'General'];

        return Inertia::render('Scholarship/FeeMaster', [
            'feeMasters' => $feeMasters,
            'academicYears' => $academicYears,
            'courses' => $courses,
            'categories' => $categories,
            'filters' => $request->only(['academic_year_id', 'course_id']),
        ]);
    }

    /**
     * Store or update a fee reference rule.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'course_id' => 'required|exists:courses,id',
            'caste_category' => 'required|string|max:50',
            'total_college_fee' => 'required|numeric|min:0',
            'govt_share_amount' => 'required|numeric|min:0',
            'student_share_amount' => 'required|numeric|min:0',
            'admission_token_amount' => 'nullable|numeric|min:0',
            'remarks' => 'nullable|string|max:500',
        ]);

        ScholarshipFeeMaster::updateOrCreate(
            [
                'academic_year_id' => $validated['academic_year_id'],
                'course_id' => $validated['course_id'],
                'caste_category' => $validated['caste_category'],
            ],
            $validated
        );

        return back()->with('success', 'Scholarship fee structure saved successfully.');
    }

    /**
     * Delete a fee reference rule.
     */
    public function destroy(int $id): RedirectResponse
    {
        $master = ScholarshipFeeMaster::findOrFail($id);
        $master->delete();

        return back()->with('success', 'Fee structure rule deleted.');
    }
}
