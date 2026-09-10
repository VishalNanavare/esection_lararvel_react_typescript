<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    /**
     * A bcrypt hash of no real password, used to keep password_verify()'s
     * timing identical whether or not the submitted username exists — a
     * login attempt against a nonexistent/inactive account still spends the
     * same bcrypt cost as a real one, so response time can't be used to
     * enumerate valid usernames.
     */
    public const DUMMY_HASH = '$2y$12$usesomesillystringfoeX7Ic0zXQhhFCFtDaZQ8ojmSNMj/mHKbBK';

    protected $fillable = [
        'username',
        'email',
        'password',
        'password_hash',
        'role',
        'full_name',
        'is_active',
        'reset_token_hash',
        'reset_expires_at',
    ];

    public function getAuthPassword(): string
    {
        return (string) ($this->password ?: $this->password_hash);
    }

    protected $hidden = [
        'password',
        'remember_token',
        'reset_token_hash',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'reset_expires_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function permissions(): HasMany
    {
        return $this->hasMany(UserPageAccess::class, 'user_id', 'id');
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function hasPermission(string $key): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        return $this->permissions()->where('page_key', $key)->exists();
    }

    public function hasAnyPermission(array $keys): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        return $this->permissions()->whereIn('page_key', $keys)->exists();
    }

    public function getPermissionKeys(): array
    {
        if ($this->isAdmin()) {
            return AccessPage::pluck('page_key')->toArray();
        }

        return $this->permissions()->pluck('page_key')->toArray();
    }

    /**
     * A short, non-reversible marker for "which password this session was
     * established under". Stored in the session at login and compared on
     * every revalidation, so a password change ends the account's other
     * sessions without needing a token table. A digest OF the hash, never
     * the hash itself — the session store shouldn't hand out an offline
     * cracking target.
     */
    public static function sessionFingerprint(string $passwordHash): string
    {
        return substr(hash('sha256', $passwordHash), 0, 32);
    }
}
