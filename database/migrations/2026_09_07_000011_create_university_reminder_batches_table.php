<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('university_reminder_batches', function (Blueprint $table) {
            $table->increments('id');
            $table->string('academic_year', 60);
            $table->string('university_name', 255);
            $table->string('admission_taken_in', 100)->nullable();
            $table->string('head_name', 100)->nullable();
            $table->string('created_by', 50)->nullable();
            $table->timestamps();

            $table->unique(['academic_year', 'university_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('university_reminder_batches');
    }
};
