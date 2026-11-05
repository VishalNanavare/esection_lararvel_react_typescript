<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScholarshipFeeMaster extends Model
{
    protected $table = 'scholarship_fee_masters';

    protected $fillable = [
        'academic_year_id',
        'course_id',
        'caste_category',
        'total_college_fee',
        'govt_share_amount',
        'student_share_amount',
        'admission_token_amount',
        'remarks',
    ];

    protected $casts = [
        'total_college_fee' => 'decimal:2',
        'govt_share_amount' => 'decimal:2',
        'student_share_amount' => 'decimal:2',
        'admission_token_amount' => 'decimal:2',
    ];

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class, 'course_id');
    }
}
