<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ModulePermission extends Model
{
    public $timestamps = false;

    protected $table = 'module_permission';

    protected $fillable = ['sub_role_admin_id', 'module_id'];
}
