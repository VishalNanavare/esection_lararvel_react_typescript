<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UniversityReminderBatch extends Model
{
    protected $fillable = [
        'academic_year',
        'university_name',
        'admission_taken_in',
        'head_name',
        'letter_no',
        'letter_date',
        'remarks',
        'legacy_array_space',
        'created_by',
        'created_at',
        'updated_at',
        'is_consolidated',
        'consolidated_meta',
    ];

    protected function casts(): array
    {
        return [
            'letter_date' => 'date',
            'is_consolidated' => 'boolean',
            'consolidated_meta' => 'array',
        ];
    }

    public function notes(): HasMany
    {
        return $this->hasMany(UniversityReminderNote::class, 'batch_id', 'id');
    }

    public function sourceBatches(): BelongsToMany
    {
        return $this->belongsToMany(
            UniversityReminderBatch::class,
            'university_reminder_batch_sources',
            'consolidated_batch_id',
            'source_batch_id'
        )->withPivot('created_at');
    }

    public function consolidatedBatches(): BelongsToMany
    {
        return $this->belongsToMany(
            UniversityReminderBatch::class,
            'university_reminder_batch_sources',
            'source_batch_id',
            'consolidated_batch_id'
        )->withPivot('created_at');
    }
}
