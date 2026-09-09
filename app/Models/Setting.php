<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class Setting extends Model
{
    public const MAIL_MAILER_NAME = 'dynamic_smtp';

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

    public static function enabled(string $key, bool $default = true): bool
    {
        return self::get($key, $default ? '1' : '0') === '1';
    }

    public static function isMailConfigured(): bool
    {
        return self::get('mail_smtp_host', '') !== '' && self::get('mail_from_email', '') !== '';
    }

    /**
     * Builds a runtime SMTP mailer from the DB-stored settings and points
     * Laravel's mail.from at them. Call this once per request before the
     * first send, then use Mail::mailer(self::MAIL_MAILER_NAME).
     */
    public static function applyMailerConfig(): void
    {
        $crypto = self::get('mail_smtp_crypto', 'tls');
        $encryptedPassword = self::get('mail_smtp_password', '');
        $password = $encryptedPassword !== '' ? Crypt::decryptString($encryptedPassword) : '';

        config([
            'mail.mailers.'.self::MAIL_MAILER_NAME => [
                'transport' => 'smtp',
                'host' => self::get('mail_smtp_host', ''),
                'port' => (int) self::get('mail_smtp_port', '587'),
                'encryption' => $crypto === 'none' ? null : $crypto,
                'username' => self::get('mail_smtp_user', ''),
                'password' => $password,
                'timeout' => 20,
            ],
            'mail.from' => [
                'address' => self::get('mail_from_email', ''),
                'name' => self::get('mail_from_name', '') ?: 'E Section',
            ],
        ]);
    }
}
