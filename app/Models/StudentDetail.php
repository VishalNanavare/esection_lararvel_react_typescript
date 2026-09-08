<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class StudentDetail extends Model
{
    protected $table = 'student_details';
    public $timestamps = false;

    protected $fillable = [
        'array_space',
        'to_name',
        'clg_add',
        'admission_taken_year',
        'student_name',
        'student_nee_name',
        'email',
        'eligibility_case_no',
        'admission_taken_in',
        'verification_of_marksheet_done_by_you',
        'in_favour_of',
        'en_time',
    ];

    public function confirmation(): HasOne
    {
        return $this->hasOne(ConfStudData::class, 'student_id', 'id');
    }
}
