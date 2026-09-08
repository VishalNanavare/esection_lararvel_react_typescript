<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('university_reminder_notes', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('batch_id');
            $table->unsignedInteger('student_id');
            $table->string('note_text', 200);
            $table->date('note_date')->nullable();
            $table->string('created_by', 50)->nullable();
            $table->dateTime('created_at')->nullable();

            $table->index(['batch_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('university_reminder_notes');
    }
};
