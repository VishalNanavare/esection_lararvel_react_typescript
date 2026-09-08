<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('access_pages', function (Blueprint $table) {
            $table->increments('id');
            $table->string('page_key', 50)->unique();
            $table->string('page_label', 100);
            $table->string('module', 40)->nullable();
            $table->string('module_label', 100)->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('access_pages');
    }
};
