<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UniversityReminderNote extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'batch_id',
        'student_id',
        'note_text',
        'note_date',
        'created_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'note_date' => 'date',
            'created_at' => 'datetime',
        ];
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(UniversityReminderBatch::class, 'batch_id', 'id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(StudentDetail::class, 'student_id', 'id');
    }
}
