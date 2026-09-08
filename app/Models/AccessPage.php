<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccessPage extends Model
{
    protected $fillable = [
        'page_key',
        'page_label',
        'module',
        'module_label',
        'sort_order',
    ];
}
