<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rem_db', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('array_space')->nullable();
            $table->string('head_name', 150)->nullable();
            $table->string('name', 150)->nullable();
            $table->string('clg_id', 5)->nullable();
            $table->string('course_name', 30)->nullable();
            $table->string('acd_year', 100)->nullable();
            $table->string('eligib1', 1500)->nullable();
            $table->string('eligib2', 1500)->nullable();
            $table->string('eligib3', 1500)->nullable();
            $table->string('eligib4', 1500)->nullable();
            $table->date('dated1')->nullable();
            $table->date('dated2')->nullable();
            $table->date('dated3')->nullable();
            $table->date('dated4')->nullable();
            $table->string('pdf_time1', 30)->nullable();
            $table->string('pdf_time2', 30)->nullable();
            $table->string('pdf_time3', 30)->nullable();
            $table->string('pdf_time4', 30)->nullable();
            $table->timestamp('Current_Date_Time', 6)->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rem_db');
    }
};
