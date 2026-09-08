<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_reminders', function (Blueprint $table) {
            $table->increments('id');
            $table->string('student_name', 200);
            $table->string('eligibility_case_no', 60)->nullable();
            $table->string('course_name', 100)->nullable();
            $table->string('missing_doc', 255)->nullable();
            $table->string('created_by', 50)->nullable();
            $table->dateTime('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_reminders');
    }
};
