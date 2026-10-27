<?php

namespace App\Console\Commands;

use App\Models\CollegeDetail;
use App\Models\StudentDetail;
use App\Models\UniversityReminderBatch;
use App\Models\UniversityReminderNote;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SyncLegacyRemindersCommand extends Command
{
    protected $signature = 'app:sync-legacy-reminders {--force : Force re-importing all batches}';
    protected $description = 'Sync legacy reminder batches from rem_db into university_reminder_batches and university_reminder_notes';

    public function handle(): int
    {
        if (!Schema::hasTable('rem_db')) {
            $this->warn('rem_db table does not exist. Nothing to sync.');
            return 0;
        }

        $remCount = DB::table('rem_db')->count();
        if ($remCount === 0) {
            $this->info('rem_db table is empty. Nothing to sync.');
            return 0;
        }

        // If not force and already imported
        if (!$this->option('force') && UniversityReminderBatch::whereNotNull('legacy_array_space')->exists()) {
            $this->info('Legacy reminder batches have already been synced. Use --force to re-sync.');
            return 0;
        }

        if ($this->option('force')) {
            $legacyBatchIds = UniversityReminderBatch::whereNotNull('legacy_array_space')->pluck('id');
            if ($legacyBatchIds->isNotEmpty()) {
                UniversityReminderNote::whereIn('batch_id', $legacyBatchIds)->delete();
                UniversityReminderBatch::whereIn('id', $legacyBatchIds)->delete();
            }
        }

        $this->info("Found {$remCount} rows in rem_db. Starting sync...");

        // Ensure stub students exist for missing legacy IDs if any
        $stubs = [
            2953 => ['name' => 'Student #2953', 'course' => 'MA (Edu) - I', 'year' => '2017-2018', 'clg_id' => 92],
            3547 => ['name' => 'Student #3547', 'course' => 'MA Part I', 'year' => '2019-2020', 'clg_id' => 310],
            5439 => ['name' => 'Student #5439', 'course' => 'MA (Edu) - I', 'year' => '2016-2017', 'clg_id' => 1],
        ];
        foreach ($stubs as $id => $info) {
            if (!StudentDetail::where('id', $id)->exists()) {
                $clg = CollegeDetail::find($info['clg_id']);
                DB::table('student_details')->insert([
                    'id' => $id,
                    'student_name' => $info['name'],
                    'admission_taken_year' => $info['year'],
                    'admission_taken_in' => $info['course'],
                    'clg_add' => $clg?->Address ?: ($clg?->Name ?: 'University'),
                    'eligibility_case_no' => (string) $id,
                    'en_time' => now()->format('Y-m-d H:i:s'),
                ]);
            }
        }

        $groups = DB::table('rem_db')
            ->orderBy('id', 'asc')
            ->get()
            ->groupBy(function ($row) {
                $asp = (int) $row->array_space;
                if ($asp > 0) {
                    return "asp_{$asp}";
                }
                return "zero_{$row->clg_id}_{$row->acd_year}_{$row->course_name}";
            });

        $batchesCreated = 0;
        $notesCreated = 0;

        foreach ($groups as $groupKey => $rows) {
            $first = $rows->first();
            $asp = (int) $first->array_space;

            $college = $first->clg_id ? CollegeDetail::find($first->clg_id) : null;
            $univName = $college ? trim((string) $college->Name, " ,\t\n\r\0\x0B") : '';

            $acdYear = trim((string) $first->acd_year);
            $courseName = trim((string) $first->course_name);
            $headName = trim((string) $first->head_name) ?: 'The Controller of Examinations';
            $createdAt = $first->Current_Date_Time ? Carbon::parse($first->Current_Date_Time) : now();

            // Try to resolve first student to fill missing university/year/course
            $firstStudent = null;
            foreach ($rows as $r) {
                $sid = trim((string) $r->name);
                $firstStudent = is_numeric($sid)
                    ? StudentDetail::find((int) $sid)
                    : StudentDetail::where('student_name', $sid)->orWhere('student_name', 'like', $sid . '%')->first();
                if ($firstStudent) {
                    break;
                }
            }

            if (empty($univName) && $firstStudent && !empty($firstStudent->clg_add)) {
                $clean = strip_tags(explode('<br>', (string) $firstStudent->clg_add)[0]);
                $univName = trim($clean, " ,\t\n\r\0\x0B");
            }
            if (empty($univName)) {
                $univName = 'Target University';
            }

            if (empty($acdYear)) {
                $acdYear = $firstStudent?->admission_taken_year ?: '2020-2021';
            }
            if (empty($courseName)) {
                $courseName = $firstStudent?->admission_taken_in ?: 'General';
            }

            $batch = UniversityReminderBatch::create([
                'academic_year' => $acdYear,
                'university_name' => $univName,
                'admission_taken_in' => $courseName,
                'head_name' => $headName,
                'legacy_array_space' => $asp > 0 ? $asp : 0,
                'created_by' => 'Legacy Import',
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ]);
            $batchesCreated++;

            foreach ($rows as $r) {
                $sid = trim((string) $r->name);
                $student = is_numeric($sid)
                    ? StudentDetail::find((int) $sid)
                    : StudentDetail::where('student_name', $sid)->orWhere('student_name', 'like', $sid . '%')->first();

                if (!$student) {
                    continue;
                }

                $notesInRow = 0;
                for ($k = 1; $k <= 4; $k++) {
                    $txt = trim((string) $r->{'eligib' . $k});
                    if ($txt !== '') {
                        $dateVal = $r->{'dated' . $k} ?: ($r->Current_Date_Time ? Carbon::parse($r->Current_Date_Time)->toDateString() : date('Y-m-d'));
                        UniversityReminderNote::create([
                            'batch_id' => $batch->id,
                            'student_id' => $student->id,
                            'note_text' => mb_substr($txt, 0, 200),
                            'note_date' => $dateVal,
                            'created_by' => 'Legacy Import',
                            'created_at' => $createdAt,
                        ]);
                        $notesCreated++;
                        $notesInRow++;
                    }
                }

                if ($notesInRow === 0) {
                    $dateVal = $r->dated1 ?: ($r->Current_Date_Time ? Carbon::parse($r->Current_Date_Time)->toDateString() : date('Y-m-d'));
                    UniversityReminderNote::create([
                        'batch_id' => $batch->id,
                        'student_id' => $student->id,
                        'note_text' => 'Reminder Notice',
                        'note_date' => $dateVal,
                        'created_by' => 'Legacy Import',
                        'created_at' => $createdAt,
                    ]);
                    $notesCreated++;
                }
            }
        }

        $this->info("Sync completed! Created {$batchesCreated} batches and {$notesCreated} reminder notes.");
        return 0;
    }
}
