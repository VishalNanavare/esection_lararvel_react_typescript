<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $replacements = [
            "\xc3\xa2\xe2\x82\xac\xe2\x80\x9c" => '-', // â€“ / â€"
            "\xc3\xa2\xe2\x82\xac\xe2\x80\x9d" => '-', // â€”
            "\xc3\xa2\xe2\x82\xac\xe2\x80\x93" => '-', // â€“
            "\xc3\xa2\xe2\x82\xac\xe2\x80\x94" => '-', // â€”
            "\xc3\xa2\xe2\x82\xac\""            => '-', // â€"
            "\xc3\xa2\xe2\x82\xac\xcb\x9c"     => "'", // â€˜
            "\xc3\xa2\xe2\x82\xac\xe2\x84\xa2" => "'", // â€™
            "\xc3\xa2\xe2\x82\xac\xc5\xbd"     => '',  // â€Ž
            "\xc3\x82\xc2\xb7"                 => '-', // Â·
            "\xc3\x82\xc2\xa0"                 => ' ', // Â + nbsp
            "\xc3\x82"                         => '',  // stray Â
            "\xc2\xa0"                         => ' ', // Non-breaking space
            "\xe2\x80\x93"                     => '-', // en-dash
            "\xe2\x80\x94"                     => '-', // em-dash
            "\xe2\x80\x95"                     => '-', // horizontal bar
            "\xe2\x88\x92"                     => '-', // minus sign
            "\xe2\x80\x98"                     => "'", // left single quote
            "\xe2\x80\x99"                     => "'", // right single quote
            "\xe2\x80\x9c"                     => '"', // left double quote
            "\xe2\x80\x9d"                     => '"', // right double quote
            "\xe2\x80\x8e"                     => '',  // LTR mark
            "\xe2\x80\x8f"                     => '',  // RTL mark
            "\xc2\xb7"                         => '-', // middle dot
            "\xe2\x80\xa2"                     => '-', // bullet
            'â€"'                              => '-',
            'â€“'                              => '-',
            'â€”'                              => '-',
            'â€˜'                              => "'",
            'â€™'                              => "'",
            'â€œ'                              => '"',
            'â€"'                              => '"',
            'â€Ž'                              => '',
            'Â·'                               => '-',
            'Â'                                => '',
        ];

        $targets = [
            'college_details' => ['Address', 'mobile_no', 'email_id', 'Name'],
            'student_details' => ['clg_add', 'student_name', 'to_name'],
            'conf_stud_data' => ['uni_add', 'stream', 'letter_no_date'],
            'university_reminder_batches' => ['university_name', 'head_name'],
            'regularizations' => ['university_name', 'student_name'],
        ];

        foreach ($targets as $table => $columns) {
            if (!Schema::hasTable($table)) {
                continue;
            }
            foreach ($columns as $column) {
                if (!Schema::hasColumn($table, $column)) {
                    continue;
                }
                $rows = DB::table($table)
                    ->whereRaw("INSTR(CAST(`{$column}` AS BINARY), UNHEX('C3A2')) > 0 OR INSTR(CAST(`{$column}` AS BINARY), UNHEX('E28093')) > 0 OR INSTR(CAST(`{$column}` AS BINARY), UNHEX('C2A0')) > 0")
                    ->get(['id', $column]);

                foreach ($rows as $row) {
                    $original = $row->{$column};
                    $cleaned = strtr($original, $replacements);
                    $cleaned = preg_replace("/\xc3\xa2\xe2\x82\xac[\\s\"'\\x2d]*/", '-', $cleaned);
                    if ($cleaned !== $original) {
                        DB::table($table)->where('id', $row->id)->update([$column => $cleaned]);
                    }
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Data cleanup migration does not need rollback
    }
};
