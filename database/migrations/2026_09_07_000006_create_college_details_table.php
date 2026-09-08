<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('college_details', function (Blueprint $table) {
            $table->increments('id');
            $table->string('Name', 1500)->nullable();
            $table->string('States', 150)->nullable()->index();
            $table->string('Address', 1500)->nullable();
            $table->string('email_id', 150)->nullable();
            $table->string('mobile_no', 100)->nullable();
            $table->string('fees', 20)->nullable();
            $table->string('head_name', 150)->nullable();
            $table->string('in_favour_of', 250)->nullable();
            $table->string('sel_data', 1)->default('1');
            $table->boolean('is_active')->default(1);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('college_details');
    }
};
