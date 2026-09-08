<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class UniversityReminderBatch extends Model
{
    protected $fillable = [
        'academic_year',
        'university_name',
        'admission_taken_in',
        'head_name',
        'created_by',
    ];

    public function notes(): HasMany
    {
        return $this->hasMany(UniversityReminderNote::class, 'batch_id', 'id');
    }
}
