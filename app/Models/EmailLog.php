<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailLog extends Model
{
    protected $table = 'email_log';
    public $timestamps = false;

    protected $fillable = [
        'batch_ref',
        'template_slug',
        'recipient_type',
        'recipient_id',
        'recipient_name',
        'recipient_email',
        'subject',
        'status',
        'error_message',
        'attempts',
        'sent_by',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }
}
