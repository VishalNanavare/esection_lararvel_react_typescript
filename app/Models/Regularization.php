<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Regularization extends Model
{
    protected $fillable = [
        'gender',
        'student_name',
        'eligibility_case_no',
        'admission_letter_for',
        'admission_letter_date',
        'admission_taken_year',
        'admission_taken_in',
        'university_name',
        'passing_course',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'admission_letter_date' => 'date',
        ];
    }
}
