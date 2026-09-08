<?php

namespace App\Http\Controllers;

use App\Models\CollegeDetail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UniversityController extends Controller
{
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

        $colleges = $query->orderBy('Name', 'asc')->paginate(30)->withQueryString();

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
            'name' => 'required|string|max:255',
            'state' => 'required|string|max:100',
            'head_name' => 'nullable|string|max:255',
            'fees' => 'nullable|numeric|min:0',
            'in_favour_of' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:1000',
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

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'state' => 'required|string|max:100',
            'head_name' => 'nullable|string|max:255',
            'fees' => 'nullable|numeric|min:0',
            'in_favour_of' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:1000',
            'email_id' => 'nullable|email|max:100',
            'mobile_no' => 'nullable|string|max:30',
        ]);

        $college->update([
            'Name' => $validated['name'],
            'States' => $validated['state'],
            'head_name' => $validated['head_name'] ?? 'The Controller of Examinations',
            'fees' => $validated['fees'] ?? 0,
            'in_favour_of' => $validated['in_favour_of'] ?? '',
            'Address' => $validated['address'] ?? '',
            'email_id' => $validated['email_id'] ?? '',
            'mobile_no' => $validated['mobile_no'] ?? '',
        ]);

        return redirect()->back()->with('success', 'University details updated successfully.');
    }

    /**
     * Toggle active/inactive status of a university.
     */
    public function toggleActive(int $id): RedirectResponse
    {
        $college = CollegeDetail::findOrFail($id);
        $college->is_active = !$college->is_active;
        $college->save();

        $statusStr = $college->is_active ? 'activated' : 'deactivated';
        return redirect()->back()->with('success', "University '{$college->Name}' {$statusStr} successfully.");
    }

    /**
     * Export universities to CSV matching active filters.
     */
    public function export(Request $request): StreamedResponse
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

        $colleges = $query->orderBy('Name', 'asc')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="universities_directory_' . date('Ymd_His') . '.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($colleges) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'University Name', 'State', 'Head Title', 'Fees', 'In Favour Of', 'Address', 'Email', 'Mobile', 'Status']);

            foreach ($colleges as $c) {
                fputcsv($handle, [
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
                ]);
            }
            fclose($handle);
        }, 200, $headers);
    }
}
