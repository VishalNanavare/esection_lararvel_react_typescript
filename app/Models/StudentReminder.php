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
        'created_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
