<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\MatchesColleges;
use App\Http\Controllers\Concerns\SanitizesSpreadsheetCells;
use App\Models\CollegeDetail;
use App\Models\Setting;
use App\Models\StudentDetail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UniversityController extends Controller
{
    use MatchesColleges, SanitizesSpreadsheetCells;

    /**
     * Display the university directory list with optional filters.
     */
    public function index(Request $request): Response
    {
        $nameFilter = trim((string) $request->input('name', ''));
        $stateFilter = trim((string) $request->input('state', ''));

        $query = CollegeDetail::query();

        if ($nameFilter !== '') {
            $query->where('Name', 'like', "%{$nameFilter}%");
        }

        if ($stateFilter !== '') {
            $query->where('States', $stateFilter);
        }

        $colleges = $query->orderBy('id', 'desc')->paginate(30)->withQueryString();

        $states = CollegeDetail::query()
            ->whereNotNull('States')
            ->where('States', '!=', '')
            ->distinct()
            ->orderBy('States')
            ->pluck('States');

        return Inertia::render('Universities/Index', [
            'colleges' => $colleges,
            'states' => $states,
            'filters' => [
                'name' => $nameFilter,
                'state' => $stateFilter,
            ],
        ]);
    }

    /**
     * Store a newly created university in database.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:1000',
            'state' => 'required|string|max:100',
            'head_name' => 'nullable|string|max:255',
            'fees' => 'nullable|numeric|min:0',
            'in_favour_of' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:1500',
            'email_id' => 'nullable|email|max:100',
            'mobile_no' => 'nullable|string|max:30',
        ]);

        CollegeDetail::create([
            'Name' => $validated['name'],
            'States' => $validated['state'],
            'head_name' => $validated['head_name'] ?? 'The Controller of Examinations',
            'fees' => $validated['fees'] ?? 0,
            'in_favour_of' => $validated['in_favour_of'] ?? '',
            'Address' => $validated['address'] ?? '',
            'email_id' => $validated['email_id'] ?? '',
            'mobile_no' => $validated['mobile_no'] ?? '',
            'sel_data' => '1',
            'is_active' => true,
        ]);

        return redirect()->back()->with('success', 'New university registered successfully.');
    }

    /**
     * Update an existing university's details.
     */
    public function update(Request $request, int $id): RedirectResponse
    {
        $college = CollegeDetail::findOrFail($id);
        $oldAddress = (string) ($college->Address ?? '');
        $oldName = (string) ($college->Name ?? '');

        $validated = $request->validate([
            'name' => 'required|string|max:1000',
            'state' => 'required|string|max:100',
            'head_name' => 'nullable|string|max:255',
            'fees' => 'nullable|numeric|min:0',
            'in_favour_of' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:1500',
            'email_id' => 'nullable|email|max:100',
            'mobile_no' => 'nullable|string|max:30',
        ]);

        $newAddress = $validated['address'] ?? '';
        $newName = $validated['name'];

        $college->update([
            'Name' => $newName,
            'States' => $validated['state'],
            'head_name' => $validated['head_name'] ?? 'The Controller of Examinations',
            'fees' => $validated['fees'] ?? 0,
            'in_favour_of' => $validated['in_favour_of'] ?? '',
            'Address' => $newAddress,
            'email_id' => $validated['email_id'] ?? '',
            'mobile_no' => $validated['mobile_no'] ?? '',
        ]);

        // Sync updated address to existing StudentDetail records matching old address or name
        if ($newAddress !== '') {
            $oldCore = $this->extractAddressCore($oldAddress);
            $newCore = $this->extractAddressCore($newAddress);

            $students = StudentDetail::where(function ($q) use ($id, $oldAddress, $oldName) {
                $q->where('clg_add', (string) $id);
                if ($oldAddress !== '') {
                    $q->orWhere('clg_add', $oldAddress);
                }
                if ($oldName !== '') {
                    $q->orWhere('clg_add', 'like', "%{$oldName}%");
                }
            })->get();

            if ($students->isEmpty() && strlen($oldCore) >= 15) {
                $allStudents = StudentDetail::whereNotNull('clg_add')->where('clg_add', '!=', '')->get();
                $matchingIds = [];
                foreach ($allStudents as $st) {
                    $stCore = $this->extractAddressCore($st->clg_add);
                    if ($stCore !== '' && ($stCore === $oldCore || $stCore === $newCore || str_contains($stCore, $oldCore) || str_contains($oldCore, $stCore))) {
                        $matchingIds[] = $st->id;
                    }
                }
                if (! empty($matchingIds)) {
                    $students = StudentDetail::whereIn('id', $matchingIds)->get();
                }
            }

            foreach ($students as $stud) {
                $stud->update(['clg_add' => $newAddress]);
            }
        }

        return redirect()->back()->with('success', 'University details updated successfully.');
    }

    /**
     * Toggle active/inactive status of a university.
     */
    public function toggleActive(int $id): RedirectResponse
    {
        $college = CollegeDetail::findOrFail($id);
        $college->is_active = ! $college->is_active;
        $college->sel_data = $college->is_active ? '1' : '0';
        $college->save();

        $statusStr = $college->is_active ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "University '{$college->Name}' {$statusStr} successfully.");
    }

    /**
     * Export universities to CSV matching active filters.
     */
    public function export(Request $request): StreamedResponse
    {
        abort_unless(Setting::enabled('feature_export_enabled'), 403, 'Exporting records is currently disabled by an administrator.');

        $nameFilter = trim((string) $request->input('name', ''));
        $stateFilter = trim((string) $request->input('state', ''));

        $query = CollegeDetail::query();

        if ($nameFilter !== '') {
            $query->where('Name', 'like', "%{$nameFilter}%");
        }

        if ($stateFilter !== '') {
            $query->where('States', $stateFilter);
        }

        $colleges = $query->orderBy('Name', 'asc')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="universities_directory_'.date('Ymd_His').'.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($colleges) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'University Name', 'State', 'Head Title', 'Fees', 'In Favour Of', 'Address', 'Email', 'Mobile', 'Status']);

            foreach ($colleges as $c) {
                fputcsv($handle, $this->sanitizeRow([
                    $c->id,
                    $c->Name,
                    $c->States,
                    $c->head_name ?: 'The Controller of Examinations',
                    $c->fees ?: 0,
                    $c->in_favour_of,
                    $c->Address,
                    $c->email_id,
                    $c->mobile_no,
                    $c->is_active ? 'Active' : 'Inactive',
                ]));
            }
            fclose($handle);
        }, 200, $headers);
    }
}
