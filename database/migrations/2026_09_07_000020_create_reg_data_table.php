<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reg_data', function (Blueprint $table) {
            $table->increments('id');
            $table->string('gender', 10)->nullable();
            $table->string('Name', 150)->nullable();
            $table->date('Admission_letter_date')->nullable();
            $table->string('Adm_taken_yr', 50)->nullable();
            $table->string('Adm_taken_in', 50)->nullable();
            $table->string('Uni_add', 500)->nullable();
            $table->string('Adm_letter', 200)->nullable();
            $table->string('Pass_Course', 50)->nullable();
            $table->timestamp('en_time')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reg_data');
    }
};
