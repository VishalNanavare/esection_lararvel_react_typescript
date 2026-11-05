<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScholarshipInstallment extends Model
{
    protected $table = 'scholarship_installments';

    protected $fillable = [
        'scholarship_student_id',
        'installment_no',
        'amount',
        'status',
        'paid_date',
        'reference_no',
        'remarks',
    ];

    protected $casts = [
        'installment_no' => 'integer',
        'amount' => 'decimal:2',
        'paid_date' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(ScholarshipStudent::class, 'scholarship_student_id');
    }
}
