<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('university_reminder_batches')) {
            // Check if unique index exists and drop it (cross-database safe for MySQL & SQLite)
            $indexes = collect(Schema::getIndexes('university_reminder_batches'))->pluck('name');
            $uniqueExists = $indexes->contains('university_reminder_batches_academic_year_university_name_unique');

            if ($uniqueExists) {
                Schema::table('university_reminder_batches', function (Blueprint $table) {
                    $table->dropUnique('university_reminder_batches_academic_year_university_name_unique');
                    $table->index(['academic_year', 'university_name'], 'idx_univ_rem_batches_year_univ');
                });
            }

            Schema::table('university_reminder_batches', function (Blueprint $table) {
                if (!Schema::hasColumn('university_reminder_batches', 'legacy_array_space')) {
                    $table->integer('legacy_array_space')->nullable()->index()->after('head_name');
                }
            });
        }

        if (Schema::hasTable('rem_db')) {
            Artisan::call('app:sync-legacy-reminders', ['--force' => true]);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('university_reminder_batches')) {
            Schema::table('university_reminder_batches', function (Blueprint $table) {
                if (Schema::hasColumn('university_reminder_batches', 'legacy_array_space')) {
                    $table->dropColumn('legacy_array_space');
                }
            });
        }
    }
};
