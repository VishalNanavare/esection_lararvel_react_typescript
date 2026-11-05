<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScholarshipDocument extends Model
{
    protected $table = 'scholarship_documents';

    protected $fillable = [
        'scholarship_student_id',
        'caste_cert',
        'caste_validity',
        'income_cert',
        'domicile_cert',
        'prev_marksheet',
        'bank_aadhaar_linked',
        'verified_by',
        'verified_at',
        'remarks',
    ];

    protected $casts = [
        'caste_cert' => 'boolean',
        'caste_validity' => 'boolean',
        'income_cert' => 'boolean',
        'domicile_cert' => 'boolean',
        'prev_marksheet' => 'boolean',
        'bank_aadhaar_linked' => 'boolean',
        'verified_at' => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(ScholarshipStudent::class, 'scholarship_student_id');
    }

    public function completedCount(): int
    {
        $count = 0;
        if ($this->caste_cert) $count++;
        if ($this->caste_validity) $count++;
        if ($this->income_cert) $count++;
        if ($this->domicile_cert) $count++;
        if ($this->prev_marksheet) $count++;
        if ($this->bank_aadhaar_linked) $count++;
        return $count;
    }
}
