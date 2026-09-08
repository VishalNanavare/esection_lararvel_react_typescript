<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Import reference tables from 31-08-2026 idol_e_section.sql
        Artisan::call('esection:import-reference-db');

        // Ensure admin account has the exact password requested: qwerty@123
        User::where('username', 'admin')->update([
            'password' => Hash::make('qwerty@123'),
        ]);

        for ($i = 1; $i <= 6; $i++) {
            User::where('username', "esection{$i}")->whereNull('password')->update([
                'password' => Hash::make("esection{$i}#123"),
            ]);
        }
    }
}
