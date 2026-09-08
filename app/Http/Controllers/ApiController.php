<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\CollegeDetail;
use App\Models\Course;
use App\Models\StreamDetail;
use App\Models\StudentDetail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiController extends Controller
{
    public function colleges(Request $request): JsonResponse
    {
        $q = trim((string) ($request->input('q') ?? $request->input('term') ?? ''));
        $page = max(1, (int) $request->input('page', 1));
        $limit = 25;
        $activeOnly = $request->input('active_only') !== '0';

        $query = CollegeDetail::query();

        if ($activeOnly) {
            $query->where('is_active', true);
        }

        if ($q !== '') {
            $query->where(function ($b) use ($q) {
                $b->where('Name', 'like', "%{$q}%")
                  ->orWhere('States', 'like', "%{$q}%")
                  ->orWhere('Address', 'like', "%{$q}%");
            });
        }

        $total = $query->count();
        $colleges = $query->orderBy('Name', 'asc')
            ->skip(($page - 1) * $limit)
            ->take($limit)
            ->get();

        $results = $colleges->map(function ($c) {
            return [
                'id' => $c->id,
                'text' => $c->Name,
                'name' => $c->Name,
                'state' => $c->States,
                'address' => $c->Address,
                'fees' => $c->fees,
                'head_name' => $c->head_name,
                'in_favour_of' => $c->in_favour_of,
            ];
        });

        return response()->json([
            'results' => $results,
            'pagination' => [
                'more' => ($page * $limit) < $total,
            ],
        ]);
    }

    public function states(Request $request): JsonResponse
    {
        $q = trim((string) ($request->input('q') ?? $request->input('term') ?? ''));

        $query = CollegeDetail::whereNotNull('States')
            ->where('States', '!=', '')
            ->distinct();

        if ($q !== '') {
            $query->where('States', 'like', "%{$q}%");
        }

        $states = $query->orderBy('States', 'asc')->pluck('States');

        $results = $states->map(fn ($state) => [
            'id' => $state,
            'text' => $state,
        ]);

        return response()->json(['results' => $results]);
    }

    public function streams(Request $request): JsonResponse
    {
        $q = trim((string) ($request->input('q') ?? $request->input('term') ?? ''));

        $query = StreamDetail::whereNotNull('Division')
            ->where('Division', '!=', '');

        if ($q !== '') {
            $query->where(function ($b) use ($q) {
                $b->where('Division', 'like', "%{$q}%")
                  ->orWhere('Name', 'like', "%{$q}%");
            });
        }

        $streams = $query->orderBy('Division', 'asc')->get();

        $results = $streams->map(fn ($s) => [
            'id' => $s->Division,
            'text' => $s->Division,
            'Division' => $s->Division,
            'stream' => $s->Name,
        ]);

        return response()->json(['results' => $results]);
    }

    public function academicYears(): JsonResponse
    {
        $years = AcademicYear::orderBy('id', 'desc')->get();

        $results = $years->map(fn ($y) => [
            'id' => $y->year_label,
            'text' => $y->year_label,
            'is_current' => (bool) $y->is_current,
        ]);

        return response()->json(['results' => $results]);
    }

    public function batchFilterOptions(string $field): JsonResponse
    {
        $column = match ($field) {
            'year' => 'admission_taken_year',
            'course' => 'admission_taken_in',
            'university' => 'clg_add',
            default => null,
        };

        if (!$column) {
            return response()->json(['results' => []]);
        }

        $options = StudentDetail::whereNotNull($column)
            ->where($column, '!=', '')
            ->distinct()
            ->orderBy($column, 'asc')
            ->pluck($column);

        $results = $options->map(fn ($val) => [
            'id' => $val,
            'text' => $val,
        ]);

        return response()->json(['results' => $results]);
    }

    public function collegeDetail(int $id): JsonResponse
    {
        $college = CollegeDetail::find($id);

        if (!$college) {
            return response()->json(['error' => 'College not found'], 404);
        }

        return response()->json([
            'id' => $college->id,
            'name' => $college->Name,
            'state' => $college->States,
            'address' => $college->Address,
            'fees' => $college->fees,
            'head_name' => $college->head_name,
            'in_favour_of' => $college->in_favour_of,
        ]);
    }

    public function nextCaseNo(): JsonResponse
    {
        $prefix = 'CASE';
        $maxId = StudentDetail::max('id') ?? 0;
        $nextId = $maxId + 1;
        $caseNo = strtoupper($prefix) . '-' . date('Y') . '/' . sprintf('%04d', $nextId);

        return response()->json([
            'case_no' => $caseNo,
            'next_id' => $nextId,
        ]);
    }
}
