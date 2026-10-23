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
     * Decrypts the stored SMTP password, with backward-compatibility support for
     * legacy CodeIgniter 4 encryption. If legacy encryption is detected, it is
     * automatically upgraded to Laravel's native encryption.
     */
    public static function getDecryptedMailPassword(): string
    {
        $stored = self::get('mail_smtp_password', '');
        if ($stored === null || $stored === '') {
            return '';
        }

        // 1. Try Laravel Crypt
        try {
            $plain = Crypt::decryptString($stored);

            return preg_replace('/\s+/u', '', $plain);
        } catch (\Throwable $e) {
            // Not a valid Laravel Crypt payload, attempt legacy CI4 fallback below
        }

        // 2. Try legacy CodeIgniter 4 OpenSSL decryption fallback
        try {
            $raw = base64_decode($stored, true);
            if ($raw !== false && strlen($raw) > 80) {
                $ciKey = hex2bin('d6e45f3c37002ac989e083bf21f9ac5c64aaa45f8d7d3f82c3b5dc99666a7181');
                $authKey = hash_hkdf('SHA512', $ciKey, 0, '');
                $hmacKey = substr($raw, 0, 64);
                $cipherPayload = substr($raw, 64);
                $hmacCalc = hash_hmac('SHA512', $cipherPayload, $authKey, true);

                if (hash_equals($hmacKey, $hmacCalc)) {
                    $iv = substr($cipherPayload, 0, 16);
                    $cipherText = substr($cipherPayload, 16);
                    $encryptKey = hash_hkdf('SHA512', $ciKey, 0, '');
                    $plain = openssl_decrypt($cipherText, 'AES-256-CTR', $encryptKey, OPENSSL_RAW_DATA, $iv);

                    if ($plain !== false) {
                        $clean = preg_replace('/\s+/u', '', $plain);
                        // Upgrade to Laravel native Crypt
                        self::set('mail_smtp_password', Crypt::encryptString($clean), 'mail');

                        return $clean;
                    }
                }
            }
        } catch (\Throwable $e) {
            // Ignore fallback error
        }

        // If neither Laravel Crypt nor legacy CI4 decrypt succeeded, fail closed
        throw new \Illuminate\Contracts\Encryption\DecryptException('The stored SMTP password could not be decrypted.');
    }

    /**
     * Builds a runtime SMTP mailer from the DB-stored settings and points
     * Laravel's mail.from at them. Call this once per request before the
     * first send, then use Mail::mailer(self::MAIL_MAILER_NAME).
     */
    public static function applyMailerConfig(): void
    {
        $crypto = self::get('mail_smtp_crypto', 'tls');
        $password = self::getDecryptedMailPassword();

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
