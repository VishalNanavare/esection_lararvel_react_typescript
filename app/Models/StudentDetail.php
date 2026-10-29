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
        'letter_no',
        'letter_date',
        'remarks',
        'en_time',
        'verification_status',
        'exclusion_reason',
        'verified_at',
        'verified_by',
    ];

    protected function casts(): array
    {
        return [
            'letter_date' => 'date',
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

    protected static ?bool $hasVerificationStatusCol = null;

    public static function hasVerificationStatusColumn(): bool
    {
        if (static::$hasVerificationStatusCol === null) {
            try {
                static::$hasVerificationStatusCol = \Illuminate\Support\Facades\Schema::hasColumn('student_details', 'verification_status');
                if (! static::$hasVerificationStatusCol) {
                    \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
                    static::$hasVerificationStatusCol = \Illuminate\Support\Facades\Schema::hasColumn('student_details', 'verification_status');
                }
            } catch (\Throwable) {
                static::$hasVerificationStatusCol = false;
            }
        }

        return (bool) static::$hasVerificationStatusCol;
    }

    public function isVerified(): bool
    {
        if (static::hasVerificationStatusColumn() && $this->getAttribute('verification_status') === 'verified') {
            return true;
        }

        return $this->confirmation !== null;
    }

    public function isExcluded(): bool
    {
        if (static::hasVerificationStatusColumn()) {
            return $this->getAttribute('verification_status') === 'excluded';
        }

        return false;
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
        if (! static::hasVerificationStatusColumn()) {
            return $query->whereHas('confirmation');
        }

        return $query->where(function ($q) {
            $q->where('verification_status', 'verified')
                ->orWhereHas('confirmation');
        });
    }

    public function scopeExcluded($query)
    {
        if (! static::hasVerificationStatusColumn()) {
            return $query->whereRaw('0 = 1');
        }

        return $query->where('verification_status', 'excluded');
    }

    public function scopeEligibleForReminder($query)
    {
        if (! static::hasVerificationStatusColumn()) {
            return $query->doesntHave('confirmation');
        }

        return $query->where(function ($q) {
            $q->whereNull('verification_status')
                ->orWhere(function ($sub) {
                    $sub->where('verification_status', '!=', 'verified')
                        ->where('verification_status', '!=', 'excluded');
                });
        })->doesntHave('confirmation');
    }
}

