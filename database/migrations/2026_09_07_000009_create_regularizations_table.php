<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('regularizations', function (Blueprint $table) {
            $table->increments('id');
            $table->string('gender', 10)->nullable();
            $table->string('student_name', 200);
            $table->string('eligibility_case_no', 60)->nullable();
            $table->string('admission_letter_for', 200)->nullable();
            $table->date('admission_letter_date')->nullable();
            $table->string('admission_taken_year', 60)->nullable();
            $table->string('admission_taken_in', 100)->nullable();
            $table->string('university_name', 255)->nullable();
            $table->string('passing_course', 100)->nullable();
            $table->string('created_by', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('regularizations');
    }
};
