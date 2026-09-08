<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'setting_key',
        'setting_value',
        'setting_group',
        'updated_by',
    ];

    public static function get(string $key, ?string $default = null): ?string
    {
        $setting = self::where('setting_key', $key)->first();
        return $setting ? $setting->setting_value : $default;
    }

    public static function set(string $key, ?string $value, ?string $group = null, ?int $updatedBy = null): void
    {
        self::updateOrCreate(
            ['setting_key' => $key],
            [
                'setting_value' => $value,
                'setting_group' => $group,
                'updated_by' => $updatedBy,
            ]
        );
    }
}
