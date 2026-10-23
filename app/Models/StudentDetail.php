<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'verification_status',
        'exclusion_reason',
        'verified_at',
        'verified_by',
    ];

    protected function casts(): array
    {
        return [
            'verified_at' => 'datetime',
        ];
    }

    public function confirmation(): HasOne
    {
        return $this->hasOne(ConfStudData::class, 'student_id', 'id');
    }

    public function universityReminderNotes(): HasMany
    {
        return $this->hasMany(UniversityReminderNote::class, 'student_id', 'id');
    }

    public function isVerified(): bool
    {
        return $this->verification_status === 'verified' || $this->confirmation !== null;
    }

    public function isExcluded(): bool
    {
        return $this->verification_status === 'excluded';
    }

    public function isEligibleForReminder(): bool
    {
        return ! $this->isVerified() && ! $this->isExcluded();
    }

    public function getComputedStatusAttribute(): string
    {
        if ($this->isVerified()) {
            return 'verified';
        }

        if ($this->isExcluded()) {
            return 'excluded';
        }

        $hasNotes = $this->relationLoaded('universityReminderNotes')
            ? $this->universityReminderNotes->isNotEmpty()
            : $this->universityReminderNotes()->exists();

        return $hasNotes ? 'reminder_sent' : 'pending';
    }

    public function scopeVerified($query)
    {
        return $query->where(function ($q) {
            $q->where('verification_status', 'verified')
                ->orWhereHas('confirmation');
        });
    }

    public function scopeExcluded($query)
    {
        return $query->where('verification_status', 'excluded');
    }

    public function scopeEligibleForReminder($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('verification_status')
                ->orWhere(function ($sub) {
                    $sub->where('verification_status', '!=', 'verified')
                        ->where('verification_status', '!=', 'excluded');
                });
        })->doesntHave('confirmation');
    }
}

