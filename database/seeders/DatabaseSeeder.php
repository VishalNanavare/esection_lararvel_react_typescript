<?php

namespace Database\Seeders;

use App\Http\Controllers\SettingsController;
use App\Models\AcademicYear;
use App\Models\AccessPage;
use App\Models\CollegeDetail;
use App\Models\ConfStudData;
use App\Models\Course;
use App\Models\Regularization;
use App\Models\Setting;
use App\Models\StreamDetail;
use App\Models\StudentDetail;
use App\Models\StudentReminder;
use App\Models\UniversityReminderBatch;
use App\Models\UniversityReminderNote;
use App\Models\User;
use App\Models\UserPageAccess;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = $this->seedUsers();
        $this->seedAccessPages();
        $this->grantDefaultPermissions($admin);
        $years = $this->seedAcademicYears();
        $this->seedCourses();
        $this->seedStreams();
        $colleges = $this->seedColleges();
        $this->seedSettings();
        $this->seedDemoRecords($colleges, $years);
    }

    /**
     * Admin + the six legacy esection1-6 staff accounts, with the exact
     * passwords the app has always shipped with for local development.
     */
    private function seedUsers(): User
    {
        $admin = User::firstOrCreate(
            ['username' => 'admin'],
            [
                'full_name' => 'System Administrator',
                'email' => 'admin@esection.test',
                'role' => 'admin',
                'is_active' => true,
            ]
        );
        $admin->forceFill(['password' => Hash::make('qwerty@123')])->save();

        for ($i = 1; $i <= 6; $i++) {
            $staff = User::firstOrCreate(
                ['username' => "esection{$i}"],
                [
                    'full_name' => "E-Section Staff {$i}",
                    'email' => "esection{$i}@esection.test",
                    'role' => 'staff',
                    'is_active' => true,
                ]
            );
            $staff->forceFill(['password' => Hash::make("esection{$i}#123")])->save();
        }

        return $admin;
    }

    /**
     * One access_pages row per permission key SettingsController already
     * knows about, so User::getPermissionKeys() (admins) and the Access
     * Rights matrix have real rows to work with instead of an empty table.
     */
    private function seedAccessPages(): void
    {
        $sortOrder = 0;
        foreach (SettingsController::getPermissionGroups() as $moduleKey => $group) {
            foreach ($group['actions'] as $action) {
                AccessPage::firstOrCreate(
                    ['page_key' => $action['key']],
                    [
                        'page_label' => "{$group['label']} \u{2014} {$action['label']}",
                        'module' => $moduleKey,
                        'module_label' => $group['label'],
                        'sort_order' => $sortOrder,
                    ]
                );
                $sortOrder++;
            }
        }
    }

    /** Every staff account gets every permission, so local testing never has to fight Access Rights. */
    private function grantDefaultPermissions(User $admin): void
    {
        $pageKeys = AccessPage::pluck('page_key');

        User::where('role', 'staff')->get()->each(function (User $staff) use ($pageKeys, $admin) {
            foreach ($pageKeys as $pageKey) {
                UserPageAccess::firstOrCreate(
                    ['user_id' => $staff->id, 'page_key' => $pageKey],
                    ['granted_by' => $admin->id, 'granted_at' => now()]
                );
            }
        });
    }

    /** @return array<string, AcademicYear> keyed by year_label */
    private function seedAcademicYears(): array
    {
        $labels = ['2023-24', '2024-25', '2025-26'];
        $years = [];

        foreach ($labels as $label) {
            $startYear = (int) substr($label, 0, 4);

            $years[$label] = AcademicYear::firstOrCreate(
                ['year_label' => $label],
                [
                    'start_date' => "{$startYear}-06-01",
                    'end_date' => ($startYear + 1).'-05-31',
                    'is_current' => $label === '2025-26',
                ]
            );
        }

        return $years;
    }

    private function seedCourses(): void
    {
        foreach ([
            ['name' => 'Bachelor of Arts', 'code' => 'BA'],
            ['name' => 'Bachelor of Commerce', 'code' => 'BCOM'],
            ['name' => 'Bachelor of Science', 'code' => 'BSC'],
            ['name' => 'Master of Arts', 'code' => 'MA'],
            ['name' => 'Master of Commerce', 'code' => 'MCOM'],
        ] as $course) {
            Course::firstOrCreate(['code' => $course['code']], [
                'name' => $course['name'],
                'is_active' => true,
            ]);
        }
    }

    private function seedStreams(): void
    {
        foreach (['BA', 'BCom', 'BSc', 'MA', 'MCom'] as $name) {
            StreamDetail::firstOrCreate(['Name' => $name, 'Division' => null]);
        }
    }

    /** @return array<int, CollegeDetail> */
    private function seedColleges(): array
    {
        $rows = [
            [
                'Name' => 'Sample State University',
                'States' => 'Demo State',
                'Address' => '1 Sample Campus Road, Demo City - 100 001.',
                'email_id' => 'registrar@sample-state-university.test',
                'mobile_no' => '000-1111111',
                'fees' => '500',
                'head_name' => 'The Registrar',
                'in_favour_of' => 'The Registrar, Sample State University',
            ],
            [
                'Name' => 'Northfield University',
                'States' => 'Demo State',
                'Address' => '22 Northfield Avenue, Demo City - 100 002.',
                'email_id' => 'registrar@northfield-university.test',
                'mobile_no' => '000-2222222',
                'fees' => '450',
                'head_name' => 'The Registrar',
                'in_favour_of' => 'The Registrar, Northfield University',
            ],
            [
                'Name' => 'Riverside University',
                'States' => 'Demo State',
                'Address' => '5 Riverside Lane, Demo Town - 100 003.',
                'email_id' => 'registrar@riverside-university.test',
                'mobile_no' => '000-3333333',
                'fees' => '400',
                'head_name' => 'The Registrar',
                'in_favour_of' => 'The Registrar, Riverside University',
            ],
            [
                'Name' => 'Lakeside University',
                'States' => 'Demo Province',
                'Address' => '9 Lakeside Drive, Demo City - 100 004.',
                'email_id' => 'registrar@lakeside-university.test',
                'mobile_no' => '000-4444444',
                'fees' => '400',
                'head_name' => 'The Registrar',
                'in_favour_of' => 'The Registrar, Lakeside University',
            ],
            [
                'Name' => 'Hilltown University',
                'States' => 'Demo Province',
                'Address' => '14 Hilltown Road, Demo Town - 100 005.',
                'email_id' => 'registrar@hilltown-university.test',
                'mobile_no' => '000-5555555',
                'fees' => '550',
                'head_name' => 'The Registrar',
                'in_favour_of' => 'The Registrar, Hilltown University',
            ],
        ];

        return array_map(
            fn (array $row) => CollegeDetail::firstOrCreate(['Name' => $row['Name']], [
                ...$row,
                'sel_data' => '1',
                'is_active' => true,
            ]),
            $rows
        );
    }

    /** Institute details, feature toggles, and numbering — the settings the app needs merely to render. Deliberately no SMTP credentials. */
    private function seedSettings(): void
    {
        $defaults = [
            'institute_name' => 'Institute of Distance and Open Learning (IDOL)',
            'institute_address' => 'Dr. Shankar Dayal Sharma Bhavan, Vidyanagari, Santacruz (East), Mumbai - 400 098.',
            'institute_contact' => 'eligibility@idol.mu.ac.in | 022-26526091',
            'institute_signatory_name' => '',
            'institute_signatory_designation' => 'Deputy Registrar / Assistant Registrar',
            'institute_signature_space_lines' => '3',
            'institute_university_title' => 'UNIVERSITY OF MUMBAI',
            'footer_department' => 'IDOL Eligibility Section',
            'feature_export_enabled' => '1',
            'feature_import_enabled' => '1',
            'feature_bulk_email_enabled' => '1',
            'feature_delete_enabled' => '1',
            'case_no_prefix' => 'CASE',
            'mail_batch_size' => '25',
            'mail_batch_pause' => '5',
            'backup_retention_count' => '10',
        ];

        foreach ($defaults as $key => $value) {
            Setting::firstOrCreate(['setting_key' => $key], [
                'setting_value' => $value,
                'setting_group' => 'seed',
            ]);
        }
    }

    /**
     * @param  array<int, CollegeDetail>  $colleges
     * @param  array<string, AcademicYear>  $years
     */
    private function seedDemoRecords(array $colleges, array $years): void
    {
        $university = $colleges[0];
        $year = '2025-26';

        $students = collect([
            ['name' => 'Aarav Sharma', 'nee' => null, 'case_no' => 'CASE-0001', 'stream' => 'BA'],
            ['name' => 'Diya Patel', 'nee' => null, 'case_no' => 'CASE-0002', 'stream' => 'BA'],
            ['name' => 'Vihaan Iyer', 'nee' => null, 'case_no' => 'CASE-0003', 'stream' => 'BCom'],
            ['name' => 'Ananya Nair', 'nee' => 'Ananya Menon', 'case_no' => 'CASE-0004', 'stream' => 'BCom'],
            ['name' => 'Kabir Deshmukh', 'nee' => null, 'case_no' => 'CASE-0005', 'stream' => 'BSc'],
        ])->map(fn (array $row) => StudentDetail::firstOrCreate(
            ['eligibility_case_no' => $row['case_no']],
            [
                'array_space' => 'demo_batch_1',
                'to_name' => 'The Registrar',
                'clg_add' => $university->Address,
                'admission_taken_year' => $year,
                'student_name' => $row['name'],
                'student_nee_name' => $row['nee'] ?? '-',
                'email' => strtolower(str_replace(' ', '.', $row['name'])).'@example.com',
                'admission_taken_in' => $row['stream'],
                'verification_of_marksheet_done_by_you' => 'Marksheet Verification',
                'in_favour_of' => $university->in_favour_of,
                'en_time' => (string) now()->subDays(10)->timestamp,
            ]
        ));

        // Confirm the eligibility checklist for the first two students.
        $students->take(2)->each(fn (StudentDetail $student) => ConfStudData::firstOrCreate(
            ['student_id' => $student->id],
            [
                'array_space' => 'demo_conf_batch_1',
                'name' => $student->student_name,
                'stream' => $student->admission_taken_in,
                'uni_add' => $university->Name,
                'case_no' => $student->eligibility_case_no,
                'en_time' => (string) now()->subDays(3)->timestamp,
                'acd_year' => $year,
                'mig_TC' => 'Yes',
                's_marks' => 'Yes',
                'p_degree' => 'Yes',
                'en_by' => 'admin',
            ]
        ));

        Regularization::firstOrCreate(
            ['eligibility_case_no' => 'REG-0001'],
            [
                'gender' => 'Ms.',
                'student_name' => 'Ishita Rao',
                'admission_letter_for' => 'The Controller of Examinations',
                'admission_letter_date' => now()->subDays(20)->toDateString(),
                'admission_taken_year' => $year,
                'admission_taken_in' => 'BA',
                'university_name' => $university->Name,
                'passing_course' => 'H.S.C.',
                'created_by' => 'admin',
            ]
        );

        StudentReminder::firstOrCreate(
            ['eligibility_case_no' => 'CASE-0003'],
            [
                'student_name' => 'Vihaan Iyer',
                'course_name' => 'BCom',
                'missing_doc' => 'Original Statement of Marks',
                'created_by' => 'admin',
                'created_at' => now()->subDays(2),
            ]
        );

        $batch = UniversityReminderBatch::firstOrCreate(
            ['academic_year' => $year, 'university_name' => $university->Name],
            [
                'admission_taken_in' => 'BA',
                'head_name' => 'The Registrar',
                'created_by' => 'admin',
            ]
        );

        UniversityReminderNote::firstOrCreate(
            ['batch_id' => $batch->id, 'student_id' => $students->first()->id],
            [
                'note_text' => '1st Reminder',
                'note_date' => now()->subDays(1)->toDateString(),
                'created_by' => 'admin',
                'created_at' => now()->subDays(1),
            ]
        );
    }
}
