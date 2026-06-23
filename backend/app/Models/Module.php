<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Module extends Model
{
    public $timestamps = false;

    protected $fillable = ['module_name'];

    public function subAdminRoles(): BelongsToMany
    {
        return $this->belongsToMany(
            SubAdminRole::class,
            'module_permission',
            'module_id',
            'sub_role_admin_id'
        );
    }
}
