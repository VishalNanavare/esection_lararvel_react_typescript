<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_page_access', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedBigInteger('user_id');
            $table->string('page_key', 50);
            $table->unsignedBigInteger('granted_by')->nullable();
            $table->dateTime('granted_at')->nullable();

            $table->unique(['user_id', 'page_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_page_access');
    }
};
