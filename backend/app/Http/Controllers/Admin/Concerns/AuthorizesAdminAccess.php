<?php

namespace App\Http\Controllers\Admin\Concerns;

use Illuminate\Http\Request;

trait AuthorizesAdminAccess
{
    private const MODULE_IDS = [
        'users' => 1,
        'categories' => 2,
        'products' => 3,
        'role_management' => 4,
    ];

    protected function ensureFullAdmin(Request $request, string $message = 'Only admin can perform this action.'): void
    {
        if (! $this->isFullAdmin($request->user())) {
            abort(403, $message);
        }
    }

    protected function ensureAdminOrPermission(Request $request, string $module, string $action = 'view'): void
    {
        $user = $request->user();

        if ($this->isFullAdmin($user)) {
            return;
        }

        if (! $user || ! $this->isSubAdmin($user)) {
            abort(403, 'Only admin or permitted sub admin can access this module.');
        }

        if ($action !== 'view') {
            abort(403, 'Sub admins currently have view-only access.');
        }

        $moduleId = self::MODULE_IDS[$module] ?? null;
        $hasPermission = $moduleId
            && $user->subAdminRole
            && $user->subAdminRole->modules()->where('modules.id', $moduleId)->exists();

        if (! $hasPermission) {
            abort(403, 'You do not have permission for this module.');
        }
    }

    protected function isFullAdmin(mixed $user): bool
    {
        return $user && ((int) $user->role_id === 1 || $user->role === 'admin');
    }

    protected function isSubAdmin(mixed $user): bool
    {
        return $user && ((int) $user->role_id === 2 || $user->role === 'sub_admin');
    }
}
