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
}
