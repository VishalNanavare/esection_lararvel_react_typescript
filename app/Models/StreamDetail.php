<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StreamDetail extends Model
{
    protected $table = 'stream_details';
    public $timestamps = false;

    protected $fillable = [
        'Name',
        'Division',
    ];
}
