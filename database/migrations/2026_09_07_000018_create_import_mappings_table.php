<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('import_mappings', function (Blueprint $table) {
            $table->increments('id');
            $table->string('source_type', 20);
            $table->string('source_value', 200);
            $table->string('target_value', 200);
            $table->string('created_by', 50)->nullable();
            $table->timestamps();

            $table->unique(['source_type', 'source_value']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_mappings');
    }
};
