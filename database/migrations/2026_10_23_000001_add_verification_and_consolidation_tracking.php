<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_details', function (Blueprint $table) {
            if (! Schema::hasColumn('student_details', 'verification_status')) {
                $table->string('verification_status', 30)->default('pending')->index();
            }
            if (! Schema::hasColumn('student_details', 'exclusion_reason')) {
                $table->string('exclusion_reason', 255)->nullable();
            }
            if (! Schema::hasColumn('student_details', 'verified_at')) {
                $table->timestamp('verified_at')->nullable();
            }
            if (! Schema::hasColumn('student_details', 'verified_by')) {
                $table->string('verified_by', 50)->nullable();
            }
        });

        Schema::table('university_reminder_batches', function (Blueprint $table) {
            if (! Schema::hasColumn('university_reminder_batches', 'is_consolidated')) {
                $table->boolean('is_consolidated')->default(false)->index();
            }
            if (! Schema::hasColumn('university_reminder_batches', 'consolidated_meta')) {
                $table->json('consolidated_meta')->nullable();
            }
        });

        if (! Schema::hasTable('university_reminder_batch_sources')) {
            Schema::create('university_reminder_batch_sources', function (Blueprint $table) {
                $table->increments('id');
                $table->unsignedInteger('consolidated_batch_id')->index();
                $table->unsignedInteger('source_batch_id')->index();
                $table->timestamp('created_at')->nullable();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('university_reminder_batch_sources');

        Schema::table('university_reminder_batches', function (Blueprint $table) {
            if (Schema::hasColumn('university_reminder_batches', 'consolidated_meta')) {
                $table->dropColumn('consolidated_meta');
            }
            if (Schema::hasColumn('university_reminder_batches', 'is_consolidated')) {
                $table->dropColumn('is_consolidated');
            }
        });

        Schema::table('student_details', function (Blueprint $table) {
            if (Schema::hasColumn('student_details', 'verified_by')) {
                $table->dropColumn('verified_by');
            }
            if (Schema::hasColumn('student_details', 'verified_at')) {
                $table->dropColumn('verified_at');
            }
            if (Schema::hasColumn('student_details', 'exclusion_reason')) {
                $table->dropColumn('exclusion_reason');
            }
            if (Schema::hasColumn('student_details', 'verification_status')) {
                $table->dropColumn('verification_status');
            }
        });
    }
};
