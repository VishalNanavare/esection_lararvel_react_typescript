<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentReminder extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'student_name',
        'eligibility_case_no',
        'course_name',
        'missing_doc',
        'letter_no',
        'letter_date',
        'remarks',
        'created_by',
        'created_at',
        'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'letter_date' => 'date',
            'created_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }
}
