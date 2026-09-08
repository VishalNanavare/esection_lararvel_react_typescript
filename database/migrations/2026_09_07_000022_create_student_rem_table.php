<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_rem', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name', 15)->nullable();
            $table->string('address', 350)->nullable();
            $table->timestamp('create_time')->useCurrent();
            $table->string('pdf_time', 30)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_rem');
    }
};
