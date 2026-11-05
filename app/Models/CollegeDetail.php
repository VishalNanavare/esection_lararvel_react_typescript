<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CollegeDetail extends Model
{
    protected $table = 'college_details';
    public $timestamps = false;

    protected $fillable = [
        'Name',
        'States',
        'Address',
        'email_id',
        'mobile_no',
        'fees',
        'head_name',
        'in_favour_of',
        'sel_data',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Scope a query to only include active and non-deleted colleges.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($b) {
                $b->where('sel_data', '!=', '0')->orWhereNull('sel_data');
            });
    }

    /**
     * Check if this college record is active.
     */
    public function isActive(): bool
    {
        $sel = (string) ($this->sel_data ?? '1');
        return (bool) ($this->is_active ?? true) && $sel !== '0';
    }
}
