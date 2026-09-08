<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_log', function (Blueprint $table) {
            $table->increments('id');
            $table->string('batch_ref', 60)->nullable()->index();
            $table->string('template_slug', 60)->nullable();
            $table->string('recipient_type', 20)->nullable();
            $table->unsignedInteger('recipient_id')->nullable();
            $table->string('recipient_name', 200)->nullable();
            $table->string('recipient_email', 190);
            $table->string('subject', 255)->nullable();
            $table->string('status', 10)->index();
            $table->text('error_message')->nullable();
            $table->unsignedInteger('attempts')->default(1);
            $table->string('sent_by', 50)->nullable();
            $table->dateTime('created_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_log');
    }
};
