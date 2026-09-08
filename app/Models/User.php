<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

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
}
