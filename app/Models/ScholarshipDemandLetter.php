<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScholarshipDemandLetter extends Model
{
    protected $table = 'scholarship_demand_letters';

    protected $fillable = [
        'scholarship_student_id',
        'letter_no',
        'letter_date',
        'total_course_fee',
        'fee_collected',
        'balance_demanded',
        'non_processed_reason',
        'generated_by',
    ];

    protected $casts = [
        'letter_date' => 'date',
        'total_course_fee' => 'decimal:2',
        'fee_collected' => 'decimal:2',
        'balance_demanded' => 'decimal:2',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(ScholarshipStudent::class, 'scholarship_student_id');
    }
}
