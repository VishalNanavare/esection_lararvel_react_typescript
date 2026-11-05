<?php

namespace App\Http\Controllers;

use App\Services\ScholarshipImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ScholarshipImportController extends Controller
{
    public function __construct(
        protected ScholarshipImportService $importService
    ) {}

    /**
     * Show upload and diff preview screen.
     */
    public function index(): Response
    {
        return Inertia::render('Scholarship/Import', [
            'title' => 'Import Admission Student Data for Scholarship',
        ]);
    }

    /**
     * Analyze uploaded file and return summary diff before committing.
     */
    public function analyze(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls|max:51200', // up to 50MB
        ]);

        $file = $request->file('file');
        $tempPath = $file->storeAs('temp_imports', 'import_' . time() . '.' . $file->getClientOriginalExtension());
        $fullPath = storage_path('app/' . $tempPath);

        try {
            $analysis = $this->importService->analyzeFile($fullPath);

            return response()->json([
                'success' => true,
                'temp_path' => $tempPath,
                'stats' => $analysis,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to parse Excel file: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Execute actual import using selected resolution options.
     */
    public function execute(Request $request): JsonResponse
    {
        $request->validate([
            'temp_path' => 'required|string',
            'skip_unchanged' => 'boolean',
            'update_modified' => 'boolean',
            'add_new' => 'boolean',
        ]);

        $fullPath = storage_path('app/' . $request->input('temp_path'));

        if (!file_exists($fullPath)) {
            return response()->json([
                'success' => false,
                'message' => 'Uploaded file has expired or was not found. Please upload again.',
            ], 404);
        }

        try {
            $options = [
                'skip_unchanged' => $request->boolean('skip_unchanged', true),
                'update_modified' => $request->boolean('update_modified', true),
                'add_new' => $request->boolean('add_new', true),
            ];

            $results = $this->importService->executeImport($fullPath, $options);

            // Clean up temporary file
            @unlink($fullPath);

            return response()->json([
                'success' => true,
                'message' => "Import complete! Inserted: {$results['inserted']}, Updated: {$results['updated']}, Skipped: {$results['skipped']}.",
                'results' => $results,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Import execution failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
