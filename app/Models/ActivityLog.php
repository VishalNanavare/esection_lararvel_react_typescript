<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $table = 'activity_log';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'username',
        'action',
        'entity_type',
        'entity_id',
        'description',
        'created_at',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public static function record(string $action, ?string $description = null, ?string $entityType = null, ?int $entityId = null): void
    {
        $user = auth()->user();
        self::create([
            'user_id' => $user?->id,
            'username' => $user?->username ?? 'system',
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'description' => $description,
            'created_at' => now(),
        ]);
    }
}
