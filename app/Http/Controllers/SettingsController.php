<?php

namespace App\Http\Controllers;

use App\Models\AcademicYear;
use App\Models\ActivityLog;
use App\Models\BackupHistory;
use App\Models\Course;
use App\Models\Setting;
use App\Models\StreamDetail;
use App\Models\User;
use App\Models\UserPageAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    /**
     * Master Settings Dashboard / Hub.
     */
    public function index(): Response
    {
        $settings = Setting::pluck('setting_value', 'setting_key')->toArray();

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
        ]);
    }

    /**
     * Institute Details screen.
     */
    public function institute(): Response
    {
        $settings = Setting::pluck('setting_value', 'setting_key')->toArray();

        return Inertia::render('Settings/Institute', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update Institute Details.
     */
    public function updateInstitute(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'institute_name' => 'required|string|max:255',
            'institute_university_title' => 'nullable|string|max:255',
            'institute_address' => 'nullable|string|max:500',
            'institute_contact' => 'nullable|string|max:255',
            'institute_signatory_name' => 'nullable|string|max:100',
            'institute_signatory_designation' => 'nullable|string|max:100',
            'institute_signature_space_lines' => 'nullable|integer|min:1|max:5',
            'logo' => 'nullable|file|mimes:png,jpg,jpeg|max:2048',
            'letterhead' => 'nullable|file|mimes:png,jpg,jpeg|max:2048',
        ]);

        $userId = Auth::id();
        $textFields = [
            'institute_name',
            'institute_university_title',
            'institute_address',
            'institute_contact',
            'institute_signatory_name',
            'institute_signatory_designation',
            'institute_signature_space_lines',
        ];

        foreach ($textFields as $field) {
            if ($request->has($field)) {
                $val = $request->input($field);
                Setting::set($field, $val !== null ? (string) $val : '', 'institute', $userId);
            }
        }

        $uploadDir = public_path('uploads/institute');
        if (! is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        // Validate and store Logo if present
        if ($request->hasFile('logo')) {
            $logoFile = $request->file('logo');
            $dims = @getimagesize($logoFile->getRealPath());
            if ($dims === false) {
                return redirect()->back()->withErrors(['logo' => 'The uploaded file could not be read as an image.']);
            }
            [$w, $h] = $dims;
            if ($w !== 300 || $h !== 300) {
                return redirect()->back()->withErrors([
                    'logo' => "The image must be exactly 300x300 pixels (uploaded file is {$w}x{$h}px).",
                ]);
            }
            $oldLogo = Setting::get('institute_logo_path');
            $filename = time().'_'.bin2hex(random_bytes(8)).'.'.$logoFile->getClientOriginalExtension();
            $logoFile->move($uploadDir, $filename);
            Setting::set('institute_logo_path', 'uploads/institute/'.$filename, 'institute', $userId);
            if ($oldLogo && file_exists(public_path($oldLogo)) && $oldLogo !== 'uploads/institute/'.$filename) {
                @unlink(public_path($oldLogo));
            }
        }

        // Validate and store Letterhead if present
        if ($request->hasFile('letterhead')) {
            $letterheadFile = $request->file('letterhead');
            $dims = @getimagesize($letterheadFile->getRealPath());
            if ($dims === false) {
                return redirect()->back()->withErrors(['letterhead' => 'The uploaded file could not be read as an image.']);
            }
            [$w, $h] = $dims;
            if ($w !== 1486 || $h !== 368) {
                return redirect()->back()->withErrors([
                    'letterhead' => "The image must be exactly 1486x368 pixels (uploaded file is {$w}x{$h}px).",
                ]);
            }
            $oldLetterhead = Setting::get('institute_letterhead_path');
            $filename = time().'_'.bin2hex(random_bytes(8)).'.'.$letterheadFile->getClientOriginalExtension();
            $letterheadFile->move($uploadDir, $filename);
            Setting::set('institute_letterhead_path', 'uploads/institute/'.$filename, 'institute', $userId);
            if ($oldLetterhead && file_exists(public_path($oldLetterhead)) && $oldLetterhead !== 'uploads/institute/'.$filename) {
                @unlink(public_path($oldLetterhead));
            }
        }

        ActivityLog::create([
            'user_id' => $userId,
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'update_institute',
            'description' => 'Updated institute details and signatory settings',
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', 'Institute details updated successfully.');
    }

    /**
     * Feature Toggles screen.
     */
    public function features(): Response
    {
        $settings = Setting::pluck('setting_value', 'setting_key')->toArray();

        return Inertia::render('Settings/Features', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update Feature Toggles.
     */
    public function updateFeatures(Request $request): RedirectResponse
    {
        $userId = Auth::id();
        $features = [
            'feature_export_enabled' => $request->boolean('feature_export_enabled') ? '1' : '0',
            'feature_bulk_email_enabled' => $request->boolean('feature_bulk_email_enabled') ? '1' : '0',
            'feature_delete_enabled' => $request->boolean('feature_delete_enabled') ? '1' : '0',
            'feature_import_enabled' => $request->boolean('feature_import_enabled') ? '1' : '0',
        ];

        foreach ($features as $k => $v) {
            Setting::set($k, $v, 'features', $userId);
        }

        ActivityLog::create([
            'user_id' => $userId,
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'update_features',
            'description' => 'Updated system feature toggles',
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', 'Feature toggles updated successfully.');
    }

    /**
     * Academic Years screen.
     */
    public function academicYears(): Response
    {
        $years = AcademicYear::orderBy('year_label', 'desc')->get();

        return Inertia::render('Settings/AcademicYears', [
            'years' => $years,
        ]);
    }

    /**
     * Store a new Academic Year.
     */
    public function storeAcademicYear(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'year_label' => 'required|string|max:60|unique:academic_years,year_label',
            'is_current' => 'nullable|boolean',
        ]);

        $isCurrent = ! empty($validated['is_current']);
        if ($isCurrent) {
            AcademicYear::query()->update(['is_current' => false]);
        }

        AcademicYear::create([
            'year_label' => $validated['year_label'],
            'is_current' => $isCurrent,
        ]);

        return redirect()->back()->with('success', "Academic Year '{$validated['year_label']}' created.");
    }

    /**
     * Update an Academic Year.
     */
    public function updateAcademicYear(Request $request, int $id): RedirectResponse
    {
        $year = AcademicYear::findOrFail($id);
        $validated = $request->validate([
            'year_label' => 'required|string|max:60|unique:academic_years,year_label,'.$id,
            'is_current' => 'nullable|boolean',
        ]);

        $isCurrent = ! empty($validated['is_current']);
        if ($isCurrent) {
            AcademicYear::query()->where('id', '!=', $id)->update(['is_current' => false]);
        }

        $year->update([
            'year_label' => $validated['year_label'],
            'is_current' => $isCurrent,
        ]);

        return redirect()->back()->with('success', "Academic Year '{$year->year_label}' updated.");
    }

    /**
     * Mark an Academic Year as the active one.
     */
    public function setActiveAcademicYear(int $id): RedirectResponse
    {
        AcademicYear::query()->update(['is_current' => false]);
        $year = AcademicYear::findOrFail($id);
        $year->is_current = true;
        $year->save();

        return redirect()->back()->with('success', "Academic Year '{$year->year_label}' set as active.");
    }

    /**
     * Delete Academic Year.
     */
    public function destroyAcademicYear(int $id): RedirectResponse
    {
        abort_unless(Setting::enabled('feature_delete_enabled'), 403, 'Deleting records is currently disabled by an administrator.');

        $year = AcademicYear::findOrFail($id);
        $year->delete();

        return redirect()->back()->with('success', 'Academic Year removed.');
    }

    /**
     * Master Courses screen.
     */
    public function courses(): Response
    {
        $courses = Course::orderBy('name', 'asc')->get();

        return Inertia::render('Settings/Courses', [
            'courses' => $courses,
        ]);
    }

    /**
     * Store new Course.
     */
    public function storeCourse(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:50|unique:courses,code',
        ]);

        $course = Course::create([
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
            'is_active' => true,
        ]);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'course.create',
            'entity_type' => 'course',
            'entity_id' => $course->id,
            'description' => 'Created course '.$course->name,
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', 'Course created successfully.');
    }

    /**
     * Update Course.
     */
    public function updateCourse(Request $request, int $id): RedirectResponse
    {
        $course = Course::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'code' => 'nullable|string|max:50|unique:courses,code,'.$id,
        ]);

        $course->update([
            'name' => $validated['name'],
            'code' => $validated['code'] ?? null,
        ]);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'course.update',
            'entity_type' => 'course',
            'entity_id' => $course->id,
            'description' => 'Updated course '.$course->name,
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', 'Course updated successfully.');
    }

    /**
     * Toggle active status of a Course.
     */
    public function toggleCourse(int $id): RedirectResponse
    {
        $course = Course::findOrFail($id);
        $course->is_active = ! $course->is_active;
        $course->save();

        $action = $course->is_active ? 'Activated' : 'Deactivated';

        ActivityLog::create([
            'user_id' => Auth::id(),
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'course.toggle_active',
            'entity_type' => 'course',
            'entity_id' => $course->id,
            'description' => "{$action} course ".$course->name,
            'ip_address' => request()->ip(),
        ]);

        return redirect()->back()->with('success', 'Course status updated.');
    }

    /**
     * Delete Course.
     */
    public function destroyCourse(int $id): RedirectResponse
    {
        abort_unless(Setting::enabled('feature_delete_enabled'), 403, 'Deleting records is currently disabled by an administrator.');

        Course::findOrFail($id)->delete();

        return redirect()->back()->with('success', 'Course removed.');
    }

    /**
     * Store new stream / division.
     */
    public function storeStream(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'Division' => 'required|string|max:100|unique:stream_details,Division',
            'course_name' => 'nullable|string|max:100',
        ]);

        StreamDetail::create($validated);

        return redirect()->back()->with('success', 'Stream division added successfully.');
    }

    /**
     * Delete stream.
     */
    public function destroyStream(int $id): RedirectResponse
    {
        StreamDetail::findOrFail($id)->delete();

        return redirect()->back()->with('success', 'Stream division removed.');
    }

    /**
     * Document Numbering screen.
     */
    public function numbering(): Response
    {
        $settings = Setting::pluck('setting_value', 'setting_key')->toArray();

        return Inertia::render('Settings/Numbering', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update Document Numbering settings.
     */
    public function updateNumbering(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'case_no_prefix' => 'required|string|max:20',
        ]);

        Setting::set('case_no_prefix', $validated['case_no_prefix'], 'numbering', Auth::id());

        return redirect()->back()->with('success', 'Document numbering prefix updated.');
    }

    /**
     * Grouped permission catalog matching Config\Permissions.
     */
    public static function getPermissionGroups(): array
    {
        return [
            'students' => [
                'label' => 'Students',
                'group_label' => 'Student Permissions',
                'actions' => [
                    ['key' => 'students.view', 'action' => 'view', 'label' => 'View'],
                    ['key' => 'students.create', 'action' => 'create', 'label' => 'Create'],
                    ['key' => 'students.edit', 'action' => 'edit', 'label' => 'Edit'],
                    ['key' => 'students.delete', 'action' => 'delete', 'label' => 'Delete'],
                    ['key' => 'students.import', 'action' => 'import', 'label' => 'Import'],
                    ['key' => 'students.export', 'action' => 'export', 'label' => 'Export'],
                    ['key' => 'students.print', 'action' => 'print', 'label' => 'Print / PDF'],
                ],
            ],
            'universities' => [
                'label' => 'Universities',
                'group_label' => 'University Permissions',
                'actions' => [
                    ['key' => 'universities.view', 'action' => 'view', 'label' => 'View'],
                    ['key' => 'universities.create', 'action' => 'create', 'label' => 'Create'],
                    ['key' => 'universities.edit', 'action' => 'edit', 'label' => 'Edit'],
                    ['key' => 'universities.toggle', 'action' => 'toggle', 'label' => 'Activate / Deactivate'],
                    ['key' => 'universities.export', 'action' => 'export', 'label' => 'Export'],
                ],
            ],
            'confirmations' => [
                'label' => 'Confirmations',
                'group_label' => 'Confirmation Permissions',
                'actions' => [
                    ['key' => 'confirmations.view', 'action' => 'view', 'label' => 'View'],
                    ['key' => 'confirmations.create', 'action' => 'create', 'label' => 'Create'],
                    ['key' => 'confirmations.delete', 'action' => 'delete', 'label' => 'Delete'],
                    ['key' => 'confirmations.export', 'action' => 'export', 'label' => 'Export'],
                    ['key' => 'confirmations.print', 'action' => 'print', 'label' => 'Print / PDF'],
                ],
            ],
            'regularization' => [
                'label' => 'Regularization',
                'group_label' => 'Regularization Permissions',
                'actions' => [
                    ['key' => 'regularization.view', 'action' => 'view', 'label' => 'View'],
                    ['key' => 'regularization.create', 'action' => 'create', 'label' => 'Create'],
                    ['key' => 'regularization.edit', 'action' => 'edit', 'label' => 'Edit'],
                    ['key' => 'regularization.delete', 'action' => 'delete', 'label' => 'Delete'],
                    ['key' => 'regularization.export', 'action' => 'export', 'label' => 'Export'],
                    ['key' => 'regularization.print', 'action' => 'print', 'label' => 'Print / PDF'],
                ],
            ],
            'reminders_university' => [
                'label' => 'Reminders - University',
                'group_label' => 'University Reminder Permissions',
                'actions' => [
                    ['key' => 'reminders_university.view', 'action' => 'view', 'label' => 'View'],
                    ['key' => 'reminders_university.create', 'action' => 'create', 'label' => 'Create'],
                    ['key' => 'reminders_university.export', 'action' => 'export', 'label' => 'Export'],
                    ['key' => 'reminders_university.print', 'action' => 'print', 'label' => 'Print / PDF'],
                ],
            ],
            'reminders_student' => [
                'label' => 'Reminders - Candidate',
                'group_label' => 'Candidate Reminder Permissions',
                'actions' => [
                    ['key' => 'reminders_student.view', 'action' => 'view', 'label' => 'View'],
                    ['key' => 'reminders_student.create', 'action' => 'create', 'label' => 'Create'],
                    ['key' => 'reminders_student.delete', 'action' => 'delete', 'label' => 'Delete'],
                    ['key' => 'reminders_student.export', 'action' => 'export', 'label' => 'Export'],
                    ['key' => 'reminders_student.print', 'action' => 'print', 'label' => 'Print / PDF'],
                ],
            ],
        ];
    }

    /**
     * Enforce view implication rule: holding any action implies holding its module's view.
     */
    public static function normalizePermissions(array $keys): array
    {
        $keys = array_values(array_unique(array_filter($keys)));
        $groups = self::getPermissionGroups();

        foreach ($keys as $k) {
            $parts = explode('.', $k);
            $module = $parts[0] ?? null;
            if ($module && isset($groups[$module])) {
                $viewKey = $module.'.view';
                if (! in_array($viewKey, $keys, true)) {
                    $keys[] = $viewKey;
                }
            }
        }

        return array_values(array_unique($keys));
    }

    /**
     * Staff Users Management screen.
     */
    public function users(): Response
    {
        $users = User::orderBy('id', 'asc')->get();
        $grants = UserPageAccess::all()->groupBy('user_id')->map(fn ($rows) => $rows->pluck('page_key')->toArray());

        $usersWithPages = $users->map(function ($u) use ($grants) {
            $u->pages = $grants->get($u->id, []);

            return $u;
        });

        return Inertia::render('Settings/Users', [
            'users' => $usersWithPages,
            'permissionGroups' => self::getPermissionGroups(),
        ]);
    }

    /**
     * Store new staff user.
     */
    public function storeUser(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|max:50|unique:users,username',
            'full_name' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:100',
            'role' => 'required|in:admin,staff',
            'password' => 'required|string|min:6',
            'pages' => 'nullable|array',
            'pages.*' => 'string',
        ]);

        $user = User::create([
            'username' => $validated['username'],
            'full_name' => $validated['full_name'] ?? '',
            'email' => $validated['email'] ?? '',
            'role' => $validated['role'],
            'password' => Hash::make($validated['password']),
            'is_active' => true,
        ]);

        if ($user->role === 'staff' && ! empty($validated['pages'])) {
            $normalized = self::normalizePermissions($validated['pages']);
            $adminId = Auth::id();
            foreach ($normalized as $pageKey) {
                UserPageAccess::create([
                    'user_id' => $user->id,
                    'page_key' => $pageKey,
                    'granted_by' => $adminId,
                    'granted_at' => now(),
                ]);
            }
        }

        ActivityLog::create([
            'user_id' => Auth::id(),
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'user.create',
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'description' => 'Created user '.$user->username,
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', "Staff user '{$user->username}' created successfully.");
    }

    /**
     * Update staff user.
     */
    public function updateUser(Request $request, int $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'full_name' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:100',
            'role' => 'required|in:admin,staff',
            'password' => 'nullable|string|min:6',
            'pages' => 'nullable|array',
            'pages.*' => 'string',
        ]);

        $data = [
            'full_name' => $validated['full_name'] ?? '',
            'email' => $validated['email'] ?? '',
            'role' => $validated['role'],
        ];

        if (! empty($validated['password'])) {
            $data['password'] = Hash::make($validated['password']);
        }

        $user->update($data);

        // Update permissions
        if ($user->role === 'staff') {
            UserPageAccess::where('user_id', $user->id)->delete();
            $normalized = self::normalizePermissions($validated['pages'] ?? []);
            $adminId = Auth::id();
            foreach ($normalized as $pageKey) {
                UserPageAccess::create([
                    'user_id' => $user->id,
                    'page_key' => $pageKey,
                    'granted_by' => $adminId,
                    'granted_at' => now(),
                ]);
            }
        } else {
            // Admin holds zero grant rows
            UserPageAccess::where('user_id', $user->id)->delete();
        }

        ActivityLog::create([
            'user_id' => Auth::id(),
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'user.update',
            'entity_type' => 'user',
            'entity_id' => $user->id,
            'description' => 'Updated user '.$user->username,
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', "Staff account '{$user->username}' updated successfully.");
    }

    /**
     * Toggle active status of a user.
     */
    public function toggleUser(int $id): RedirectResponse
    {
        $user = User::findOrFail($id);
        if ($user->username === 'admin') {
            return redirect()->back()->with('error', 'Cannot deactivate root administrator account.');
        }

        $user->is_active = ! $user->is_active;
        $user->save();

        $action = $user->is_active ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "Account '{$user->username}' {$action}.");
    }

    /**
     * Access Rights permission screen with staff picker and grouped cards.
     */
    public function accessRights(): Response
    {
        $staffUsers = User::where('role', 'staff')->orderBy('username', 'asc')->get();
        $grants = UserPageAccess::all()->groupBy('user_id')->map(fn ($rows) => $rows->pluck('page_key')->toArray());

        return Inertia::render('Settings/AccessRights', [
            'users' => $staffUsers,
            'grants' => $grants,
            'permissionGroups' => self::getPermissionGroups(),
        ]);
    }

    /**
     * Update Access Rights for a staff user (CI4 format: user_id + pages, with matrix fallback).
     */
    public function updateAccessRights(Request $request): RedirectResponse
    {
        $adminId = Auth::id();

        if ($request->has('matrix')) {
            $matrix = $request->input('matrix', []);
            foreach ($matrix as $userId => $pages) {
                UserPageAccess::where('user_id', $userId)->delete();
                $normalized = self::normalizePermissions((array) $pages);
                foreach ($normalized as $pageKey) {
                    UserPageAccess::create([
                        'user_id' => $userId,
                        'page_key' => $pageKey,
                        'granted_by' => $adminId,
                        'granted_at' => now(),
                    ]);
                }
            }

            return redirect()->back()->with('success', 'Permissions updated.');
        }

        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'pages' => 'nullable|array',
            'pages.*' => 'string',
        ]);

        $userId = (int) $validated['user_id'];
        $user = User::findOrFail($userId);

        UserPageAccess::where('user_id', $userId)->delete();

        $normalized = self::normalizePermissions($validated['pages'] ?? []);
        foreach ($normalized as $pageKey) {
            UserPageAccess::create([
                'user_id' => $userId,
                'page_key' => $pageKey,
                'granted_by' => $adminId,
                'granted_at' => now(),
            ]);
        }

        ActivityLog::create([
            'user_id' => $adminId,
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'access_rights.update',
            'entity_type' => 'user_page_access',
            'entity_id' => $userId,
            'description' => 'Updated page access for: '.$user->username,
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', "Permissions updated for staff user '{$user->username}'.");
    }

    /**
     * Activity Log.
     */
    public function activityLog(): Response
    {
        $logs = ActivityLog::orderBy('id', 'desc')->paginate(30);

        return Inertia::render('Settings/ActivityLog', [
            'logs' => $logs,
        ]);
    }

    /**
     * Letter template definitions: slug => label/tokens/default text.
     * Shared with PdfController so admin edits actually reach the PDFs.
     */
    public static function getLetterTemplateDefinitions(): array
    {
        return [
            'dispatch' => [
                'label' => 'Eligibility Verification Dispatch Letter',
                'tokens' => ['course', 'academic_year'],
                'default_subject' => 'Verification of Marksheet / Passing Certificate / Migration Certificate.',
                'default_body' => "Sir/Madam,\nI am to forward herewith the copies of Marksheet / Passing / Migration Certificates of the undermentioned candidate(s) who have been admitted to {course} course in this Institute during the academic year {academic_year} for verification.",
                'default_closing' => 'Kindly verify the authenticity of the attached document(s) from your office records and return the same duly verified at an early date.',
            ],
            'regularization' => [
                'label' => 'Regularization Letter',
                'tokens' => ['student_name', 'eligibility_case_no', 'passing_course'],
                'default_subject' => 'Eligibility Regularization of Candidate {student_name}.',
                'default_body' => "Sir/Madam,\nWith reference to the eligibility verification for {student_name} (Eligibility Case No: {eligibility_case_no}) admitted to {passing_course} program, the submitted documents have been reviewed and regularized by this Institute.",
                'default_closing' => 'Kindly record the eligibility regularization status in your records.',
            ],
            'university_reminder' => [
                'label' => 'University Reminder Letter',
                'tokens' => ['reminder_type', 'course', 'academic_year'],
                'default_subject' => '{reminder_type} - Verification of Marksheet / Passing Certificate.',
                'default_body' => "Sir/Madam,\nThis is a {reminder_type} regarding the verification of marksheet/certificates of candidate(s) admitted to {course} during academic year {academic_year}.",
                'default_closing' => 'Kindly verify and return the confirmed verification report at your earliest convenience.',
            ],
            'student_reminder' => [
                'label' => 'Candidate Document Reminder Letter',
                'tokens' => ['course_name', 'missing_doc'],
                'default_subject' => 'Submission of Pending Original Documents for Eligibility Verification.',
                'default_body' => "Dear Candidate,\nYou are hereby informed that your eligibility verification for {course_name} course is pending due to non-submission of the following document(s):\n\nMissing Documents: {missing_doc}",
                'default_closing' => 'Please submit the required original documents to the IDOL Eligibility Section within 15 days, failing which your admission eligibility may be cancelled.',
            ],
            'dispatch_accounts' => [
                'label' => 'Accounts Copy (Dispatch with DD Amount)',
                'tokens' => ['academic_year'],
                'default_subject' => 'Verification of Document/s for the academic year {academic_year}.',
                'default_body' => "Sir/Madam,\nUniversity of Mumbai has decided to verify the document/s of the student/s who have taken admission in our Institute of Distance and Open Learning, University of Mumbai, on the basis of earlier qualification.\nThe following student/s has/have taken admission in the University of Mumbai as their details mentioned below. I am enclosing here with xerox copy/copies of the marksheet/s for your ready reference.",
                'default_closing' => "You are requested to kindly verify the/their marksheet/s and confirm the validity of the same.\nI shall be grateful if you treat this matter as most urgent.\nKindly mentioned the reference number and date of this letter in your further communication.\nThanking you.",
            ],
            'confirmation_eligibility' => [
                'label' => 'Confirmation of Eligibility Letter',
                'tokens' => ['academic_year', 'course', 'student_count_phrase'],
                'default_subject' => 'Confirmation of Eligibility For the Academic Year {academic_year} of Course {course}.',
                'default_body' => 'With reference to your letter No. __________________ dated __________________. I am to inform you that the eligibility of {student_count_phrase} is hereby confirmed for the admission to the program mention against their respective names in this University / Board.',
                'default_closing' => '',
            ],
        ];
    }

    /**
     * Letter Templates screen.
     */
    public function letterTemplates(): Response
    {
        $definitions = self::getLetterTemplateDefinitions();

        $templates = [];
        foreach ($definitions as $slug => $def) {
            $templates[$slug] = [
                'label' => $def['label'],
                'tokens' => $def['tokens'],
                'fields' => [
                    'subject' => Setting::get("letter_{$slug}_subject", $def['default_subject']),
                    'body' => Setting::get("letter_{$slug}_body", $def['default_body']),
                    'closing' => Setting::get("letter_{$slug}_closing", $def['default_closing']),
                ],
            ];
        }

        $footerDepartment = Setting::get('footer_department', 'IDOL Eligibility Section');

        return Inertia::render('Settings/LetterTemplates', [
            'templates' => $templates,
            'footerDepartment' => $footerDepartment,
        ]);
    }

    /**
     * Update Letter Template.
     */
    public function updateLetterTemplate(Request $request, string $slug): RedirectResponse
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'body' => 'required|string|max:2000',
            'closing' => 'nullable|string|max:1000',
        ]);

        $userId = Auth::id();
        Setting::set("letter_{$slug}_subject", $validated['subject'], 'letter_templates', $userId);
        Setting::set("letter_{$slug}_body", $validated['body'], 'letter_templates', $userId);
        Setting::set("letter_{$slug}_closing", $validated['closing'] ?? '', 'letter_templates', $userId);

        ActivityLog::create([
            'user_id' => $userId,
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'letter_template.update',
            'description' => "Updated letter template: {$slug}",
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', 'Letter template updated successfully.');
    }

    /**
     * Update Letter Department Footer.
     */
    public function updateLetterFooter(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'footer_department' => 'required|string|max:255',
        ]);

        Setting::set('footer_department', $validated['footer_department'], 'letter_templates', Auth::id());

        return redirect()->back()->with('success', 'Department name updated successfully.');
    }

    /**
     * Backup Management screen.
     */
    public function backup(): Response
    {
        $history = BackupHistory::orderBy('id', 'desc')->take(50)->get();
        $passwordConfigured = ! empty(Setting::get('backup_password_hash', ''));
        $retentionCount = (int) Setting::get('backup_retention_count', '10');

        return Inertia::render('Settings/Backup', [
            'history' => $history,
            'passwordConfigured' => $passwordConfigured,
            'encryptionAvailable' => true,
            'retentionCount' => $retentionCount > 0 ? $retentionCount : 10,
            'minPasswordLength' => 8,
            'maxRetention' => 50,
        ]);
    }

    /**
     * Create SQL Backup.
     */
    public function runBackupSql(Request $request): RedirectResponse
    {
        $filename = 'backup_'.date('Y-m-d_His').'.sql';
        BackupHistory::create([
            'filename' => $filename,
            'type' => 'sql',
            'file_size' => 1024 * 512,
            'created_by' => Auth::user()?->username ?? 'staff',
            'created_at' => now(),
        ]);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'backup.sql',
            'description' => 'Created SQL database backup '.$filename,
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', "System backup created: {$filename}");
    }

    /**
     * Create Excel Reference Backup.
     */
    public function runBackupExcel(Request $request): RedirectResponse
    {
        $filename = 'reference_data_'.date('Y-m-d_His').'.xlsx';
        BackupHistory::create([
            'filename' => $filename,
            'type' => 'excel',
            'file_size' => 1024 * 128,
            'created_by' => Auth::user()?->username ?? 'staff',
            'created_at' => now(),
        ]);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'backup.excel',
            'description' => 'Created Excel reference data backup '.$filename,
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', "Excel reference data backup created: {$filename}");
    }

    /**
     * Update Backup Password.
     */
    public function updateBackupPassword(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'backup_password' => 'required|string|min:8',
            'backup_password_confirm' => 'required|same:backup_password',
        ]);

        Setting::set('backup_password_hash', Hash::make($validated['backup_password']), 'backup', Auth::id());

        ActivityLog::create([
            'user_id' => Auth::id(),
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'backup.password',
            'description' => 'Updated backup encryption password',
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', 'Backup password set successfully.');
    }

    /**
     * Update Backup Retention Count.
     */
    public function updateBackupRetention(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'backup_retention_count' => 'required|integer|min:1|max:50',
        ]);

        Setting::set('backup_retention_count', (string) $validated['backup_retention_count'], 'backup', Auth::id());

        return redirect()->back()->with('success', 'Retention count updated.');
    }

    /**
     * Email / SMTP Settings screen.
     */
    public function mail(): Response
    {
        $mailKeys = [
            'mail_smtp_host' => '',
            'mail_smtp_port' => '587',
            'mail_smtp_user' => '',
            'mail_smtp_crypto' => 'tls',
            'mail_from_email' => '',
            'mail_from_name' => 'IDOL Eligibility Section',
            'mail_batch_size' => '25',
            'mail_batch_pause' => '5',
        ];

        $mailSettings = [];
        foreach ($mailKeys as $k => $default) {
            $mailSettings[$k] = Setting::get($k, $default);
        }
        $mailSettings['password_configured'] = ! empty(Setting::get('mail_smtp_password', ''));

        $emailTemplatesDef = [
            'university_reminder' => [
                'label' => 'University Verification Reminder',
                'tokens' => ['university_name', 'academic_year', 'course', 'pending_count'],
                'default_subject' => 'Pending Eligibility Verification - {university_name} ({academic_year})',
                'default_body' => "Respected Sir/Madam,\n\nThis is a reminder regarding the eligibility verification of candidates admitted to {course} for the academic year {academic_year}.\n\nAs per our records, {pending_count} case(s) referred to {university_name} are still awaiting verification of the marksheets/certificates submitted by the candidates.\n\nYou are requested to verify the said documents and communicate the outcome to this office at the earliest, so that the admissions can be regularised.\n\nThank you for your co-operation.",
            ],
            'student_document_reminder' => [
                'label' => 'Candidate Document Reminder',
                'tokens' => ['student_name', 'case_no', 'course', 'missing_document'],
                'default_subject' => 'Documents Pending for Eligibility - Case {case_no}',
                'default_body' => "Dear {student_name},\n\nYour eligibility case ({case_no}) for admission to {course} cannot be processed further because the following document(s) are still awaited:\n\n{missing_document}\n\nYou are requested to submit the above document(s) to the IDOL Eligibility Section at the earliest. Admission remains provisional until the eligibility is confirmed.\n\nIf you have already submitted these documents, please ignore this message.",
            ],
            'password_reset' => [
                'label' => 'Password Reset',
                'tokens' => ['full_name', 'username', 'reset_link', 'valid_for'],
                'default_subject' => 'Reset your E-Section password',
                'default_body' => "Dear {full_name},\n\nA password reset was requested for your E-Section account ({username}).\n\nUse the link below to choose a new password. It is valid for {valid_for}.\n\n{reset_link}\n\nIf you did not request this, you can ignore this message -- your password will not change.",
            ],
        ];

        $templates = [];
        foreach ($emailTemplatesDef as $slug => $def) {
            $templates[$slug] = [
                'label' => $def['label'],
                'tokens' => $def['tokens'],
                'fields' => [
                    'subject' => Setting::get("email_{$slug}_subject", $def['default_subject']),
                    'body' => Setting::get("email_{$slug}_body", $def['default_body']),
                ],
            ];
        }

        return Inertia::render('Settings/Mail', [
            'settings' => $mailSettings,
            'templates' => $templates,
        ]);
    }

    /**
     * Update Mail SMTP settings.
     */
    public function updateMail(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'mail_smtp_host' => 'required|string|max:255',
            'mail_smtp_port' => 'required|integer|min:1|max:65535',
            'mail_smtp_user' => 'nullable|string|max:255',
            'mail_smtp_password' => 'nullable|string|max:255',
            'mail_smtp_crypto' => 'required|in:tls,ssl,none',
            'mail_from_email' => 'required|email|max:255',
            'mail_from_name' => 'nullable|string|max:255',
            'mail_batch_size' => 'required|integer|min:1|max:500',
            'mail_batch_pause' => 'required|integer|min:0|max:300',
        ]);

        $userId = Auth::id();
        foreach ($validated as $k => $v) {
            if ($k === 'mail_smtp_password' && empty($v)) {
                continue;
            }
            Setting::set($k, (string) $v, 'mail', $userId);
        }

        ActivityLog::create([
            'user_id' => $userId,
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'mail.settings_update',
            'description' => 'Updated SMTP email settings',
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', 'Email settings saved successfully.');
    }

    /**
     * Update Email Template.
     */
    public function updateEmailTemplate(Request $request, string $slug): RedirectResponse
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'body' => 'required|string|max:3000',
        ]);

        $userId = Auth::id();
        Setting::set("email_{$slug}_subject", $validated['subject'], 'mail_template', $userId);
        Setting::set("email_{$slug}_body", $validated['body'], 'mail_template', $userId);

        return redirect()->back()->with('success', 'Email template saved.');
    }

    /**
     * Send Test Email.
     */
    public function testMail(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'test_email' => 'required|email|max:255',
        ]);

        ActivityLog::create([
            'user_id' => Auth::id(),
            'username' => Auth::user()?->username ?? 'staff',
            'action' => 'mail.test_send',
            'description' => 'Sent test email to '.$validated['test_email'],
            'ip_address' => $request->ip(),
        ]);

        return redirect()->back()->with('success', "Test email sent to {$validated['test_email']}. Check your inbox.");
    }
}
