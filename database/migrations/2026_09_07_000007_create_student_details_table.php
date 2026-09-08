<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_details', function (Blueprint $table) {
            $table->increments('id');
            $table->string('array_space', 50)->nullable()->index();
            $table->string('to_name', 200)->nullable();
            $table->string('clg_add', 1500)->nullable();
            $table->string('admission_taken_year', 50)->nullable()->index();
            $table->string('student_name', 200)->nullable();
            $table->string('student_nee_name', 200)->nullable();
            $table->string('email', 190)->nullable();
            $table->string('eligibility_case_no', 60)->nullable()->index();
            $table->string('admission_taken_in', 100)->nullable();
            $table->string('verification_of_marksheet_done_by_you', 100)->nullable();
            $table->string('in_favour_of', 200)->nullable();
            $table->string('en_time', 50)->nullable();

            if (\Illuminate\Support\Facades\DB::getDriverName() === 'mysql') {
                $table->index([\Illuminate\Support\Facades\DB::raw('clg_add(191)')], 'idx_student_clg_add');
            } else {
                $table->index('clg_add', 'idx_student_clg_add');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_details');
    }
};
