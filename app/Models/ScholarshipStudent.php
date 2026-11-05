<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ScholarshipStudent extends Model
{
    protected $table = 'scholarship_students';

    protected $fillable = [
        'form_number',
        'registration_no',
        'student_name',
        'email',
        'mobile',
        'alternate_mobile',
        'gender',
        'dob',
        'photo_url',
        'signature_url',
        'academic_year_id',
        'academic_year_label',
        'course_id',
        'applied_programme_name',
        'caste_category',
        'category_id',
        'family_income_code',
        'payment_status',
        'row_hash',
        'admission_status',
        'scholarship_status',
        'not_processed_reason',
        'manual_recovery_amount',
        'total_fee',
        'govt_expected_share',
        'student_expected_share',
        'admission_fee_paid',
        'total_collected',
        'balance_due',
        'existing_system_status',
        'internal_remarks',
        'last_imported_at',
    ];

    protected $casts = [
        'total_fee' => 'decimal:2',
        'govt_expected_share' => 'decimal:2',
        'student_expected_share' => 'decimal:2',
        'admission_fee_paid' => 'decimal:2',
        'total_collected' => 'decimal:2',
        'balance_due' => 'decimal:2',
        'manual_recovery_amount' => 'decimal:2',
        'last_imported_at' => 'datetime',
    ];

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class, 'academic_year_id');
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class, 'course_id');
    }

    public function document(): HasOne
    {
        return $this->hasOne(ScholarshipDocument::class, 'scholarship_student_id');
    }

    public function installments(): HasMany
    {
        return $this->hasMany(ScholarshipInstallment::class, 'scholarship_student_id')->orderBy('installment_no');
    }

    public function demandLetters(): HasMany
    {
        return $this->hasMany(ScholarshipDemandLetter::class, 'scholarship_student_id')->orderByDesc('id');
    }

    /**
     * Recalculates expected fee, collected installments, and balance due based on Fee Master & recorded payments.
     */
    public function recalculateFinancials(): self
    {
        // 1. Fetch fee master rule
        if ($this->academic_year_id && $this->course_id && $this->caste_category) {
            $master = ScholarshipFeeMaster::where('academic_year_id', $this->academic_year_id)
                ->where('course_id', $this->course_id)
                ->where('caste_category', $this->caste_category)
                ->first();

            if ($master) {
                $this->total_fee = $master->total_college_fee;
                $this->govt_expected_share = $master->govt_share_amount;
                $this->student_expected_share = $master->student_share_amount;
                if ($this->admission_fee_paid == 0 && $master->admission_token_amount > 0) {
                    $this->admission_fee_paid = $master->admission_token_amount;
                }
            }
        }

        // 2. Sum up collected money
        $paidInstallments = $this->installments()
            ->where('status', 'paid_done')
            ->sum('amount');

        $this->total_collected = (float) $this->admission_fee_paid + (float) $paidInstallments;
        $this->balance_due = max(0, (float) $this->total_fee - (float) $this->total_collected);

        // 3. Status adjustment
        if ($this->scholarship_status === 'not_processed') {
            // If scholarship was rejected/failed, student must pay the full remaining amount
            if ($this->manual_recovery_amount !== null && $this->manual_recovery_amount > 0) {
                $this->balance_due = (float) $this->manual_recovery_amount;
            }
        } elseif ($this->admission_status === 'CANCELLED') {
            $this->scholarship_status = 'cancelled';
        } elseif ($this->total_fee > 0 && $this->balance_due <= 0) {
            $this->scholarship_status = 'fully_settled';
        }

        $this->save();
        return $this;
    }
}
