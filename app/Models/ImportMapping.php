<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportMapping extends Model
{
    protected $fillable = [
        'source_type',
        'source_value',
        'target_value',
        'created_by',
    ];
}
