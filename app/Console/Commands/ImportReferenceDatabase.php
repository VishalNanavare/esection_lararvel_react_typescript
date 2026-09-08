<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class ImportReferenceDatabase extends Command
{
    protected $signature = 'esection:import-reference-db {--all : Also import student verification records and past letters}';
    protected $description = 'Imports reference database tables from 31-08-2026 idol_e_section.sql into laravel_esection';

    public function handle(): int
    {
        $sqlPath = '/opt/homebrew/var/www/esection/esection_ci4/31-08-2026 idol_e_section.sql';

        if (!File::exists($sqlPath)) {
            $this->error("SQL file not found at: {$sqlPath}");
            return Command::FAILURE;
        }

        $this->info("Reading reference SQL dump: {$sqlPath}");

        $referenceTables = [
            'access_pages',
            'academic_years',
            'courses',
            'stream_details',
            'college_details',
            'settings',
            'import_mappings',
            'users',
            'user_page_access',
        ];

        if ($this->option('all')) {
            $referenceTables = array_merge($referenceTables, [
                'student_details',
                'conf_stud_data',
                'regularizations',
                'student_reminders',
                'university_reminder_batches',
                'university_reminder_notes',
                'e_student_data',
                'reg_data',
                'rem_db',
                'student_rem',
                'backup_history',
            ]);
        }

        $handle = fopen($sqlPath, 'r');
        if (!$handle) {
            $this->error("Failed to open SQL file.");
            return Command::FAILURE;
        }

        $currentQuery = '';
        $importedCounts = [];
        foreach ($referenceTables as $t) {
            $importedCounts[$t] = 0;
        }

        // Disable foreign key checks for clean bulk seeding
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        $this->info("Importing reference data into laravel_esection...");

        while (($line = fgets($handle)) !== false) {
            $trimmed = trim($line);

            // Skip comments and empty lines
            if ($trimmed === '' || str_starts_with($trimmed, '--') || str_starts_with($trimmed, '/*')) {
                continue;
            }

            $currentQuery .= $line;

            if (str_ends_with(rtrim($line), ';')) {
                // Check if this query is an INSERT into one of our selected tables
                foreach ($referenceTables as $table) {
                    if (preg_match('/^INSERT\s+INTO\s+[`"]?' . preg_quote($table, '/') . '[`"]?/i', trim($currentQuery))) {
                        try {
                            DB::unprepared($currentQuery);
                            $importedCounts[$table]++;
                        } catch (\Throwable $e) {
                            $this->warn("Note for {$table}: " . $e->getMessage());
                        }
                        break;
                    }
                }
                $currentQuery = '';
            }
        }

        fclose($handle);
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->newLine();
        $this->info("Reference Data Import Completed Successfully!");
        $this->table(
            ['Table Name', 'Total Records in DB'],
            collect($referenceTables)->map(fn ($t) => [$t, DB::table($t)->count()])
        );

        return Command::SUCCESS;
    }
}
