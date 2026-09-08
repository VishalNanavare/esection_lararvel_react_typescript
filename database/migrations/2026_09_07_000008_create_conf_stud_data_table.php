<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conf_stud_data', function (Blueprint $table) {
            $table->increments('id');
            $table->string('array_space', 50)->nullable()->index('idx_conf_array_space');
            $table->string('name', 200)->nullable();
            $table->string('stream', 50)->nullable();
            $table->string('uni_add', 1300)->nullable();
            $table->string('case_no', 60)->nullable();
            $table->string('en_time', 100)->nullable();
            $table->string('acd_year', 60)->nullable();
            $table->string('mig_TC', 10)->default('No');
            $table->string('s_marks', 10)->default('No');
            $table->string('p_degree', 10)->default('No');
            $table->string('letter_no_date', 300)->nullable();
            $table->string('remark', 300)->nullable();
            $table->string('conf_from', 50)->nullable();
            $table->string('conf_from_text', 100)->nullable();
            $table->string('conf_from_select', 10)->nullable();
            $table->string('etc_data', 100)->nullable();
            $table->unsignedInteger('student_id')->nullable()->index('idx_conf_student_id');
            $table->string('dd_no', 100)->nullable();
            $table->string('bank_name', 150)->nullable();
            $table->string('dd_date', 50)->nullable();
            $table->string('dd_amount', 50)->nullable();
            $table->string('en_by', 50)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conf_stud_data');
    }
};
