<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ConfStudData extends Model
{
    protected $table = 'conf_stud_data';
    public $timestamps = false;

    protected $fillable = [
        'array_space',
        'name',
        'stream',
        'uni_add',
        'case_no',
        'en_time',
        'acd_year',
        'mig_TC',
        's_marks',
        'p_degree',
        'letter_no_date',
        'letter_no',
        'letter_date',
        'remark',
        'remarks',
        'conf_from',
        'conf_from_text',
        'conf_from_select',
        'etc_data',
        'student_id',
        'dd_no',
        'bank_name',
        'dd_date',
        'dd_amount',
        'en_by',
    ];

    protected function casts(): array
    {
        return [
            'letter_date' => 'date',
            'dd_date' => 'date',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(StudentDetail::class, 'student_id', 'id');
    }
}
