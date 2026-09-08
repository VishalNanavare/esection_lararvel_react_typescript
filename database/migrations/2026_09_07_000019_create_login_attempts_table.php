<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_attempts', function (Blueprint $table) {
            $table->increments('id');
            $table->string('ip_address', 45);
            $table->string('username', 150)->nullable();
            $table->boolean('successful')->default(0);
            $table->dateTime('attempted_at')->index('idx_login_attempts_time');

            $table->index(['ip_address', 'attempted_at'], 'idx_login_attempts_ip_time');
            $table->index(['username', 'attempted_at'], 'idx_login_attempts_user_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_attempts');
    }
};
