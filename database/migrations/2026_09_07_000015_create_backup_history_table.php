<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('backup_history', function (Blueprint $table) {
            $table->increments('id');
            $table->string('filename', 255);
            $table->string('type', 10);
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('created_by', 50)->nullable();
            $table->dateTime('created_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_history');
    }
};
