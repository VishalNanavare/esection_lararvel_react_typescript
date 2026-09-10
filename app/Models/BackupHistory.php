<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BackupHistory extends Model
{
    protected $table = 'backup_history';

    public $timestamps = false;

    protected $fillable = [
        'filename',
        'type',
        'file_size',
        'file_path',
        'created_by',
        'created_at',
    ];

    /** Server filesystem path — never expose this to the frontend. */
    protected $hidden = [
        'file_path',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
