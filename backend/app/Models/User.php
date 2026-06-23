<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Support\Collection;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'phone_no',
        'profile_image',
        'role',
        'role_id',
        'sub_role_id',
        'status',
        'password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'status' => 'string',
            'role_id' => 'integer',
            'sub_role_id' => 'integer',
        ];
    }

    public function roleRelation(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    public function subAdminRole(): BelongsTo
    {
        return $this->belongsTo(SubAdminRole::class, 'sub_role_id');
    }

    public function resolvedModulePermissions(): Collection
    {
        if (! $this->subAdminRole) {
            return collect();
        }

        return $this->subAdminRole->modules->map(fn (Module $module): array => [
            'module' => match ((int) $module->id) {
                1 => 'users',
                2 => 'categories',
                3 => 'products',
                4 => 'role_management',
            },
            'module_id' => $module->id,
            'module_name' => $module->module_name,
            'can_view' => true,
        ])->values();
    }

    public function apiRefreshTokens(): HasMany
    {
        return $this->hasMany(ApiRefreshToken::class);
    }

    public function cart(): HasOne
    {
        return $this->hasOne(Cart::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function subAdminPermissions(): HasMany
    {
        return $this->hasMany(SubAdminPermission::class);
    }
}
