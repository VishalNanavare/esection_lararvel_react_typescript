<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stream_details', function (Blueprint $table) {
            $table->increments('id');
            $table->string('Name', 50)->nullable();
            $table->string('Division', 50)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stream_details');
    }
};
