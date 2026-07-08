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
        'transactions' => 5,
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

        $moduleId = self::MODULE_IDS[$module] ?? null;
        $hasPermission = $moduleId
            && $user->subAdminRole
            && $this->subAdminRoleHasPermission($user->subAdminRole, $moduleId, $action);

        if (! $hasPermission) {
            abort(403, 'You do not have permission for this action.');
        }
    }

    private function subAdminRoleHasPermission($subAdminRole, int $moduleId, string $action): bool
    {
        if (! in_array($action, ['view', 'create', 'update', 'delete'], true)) {
            $action = 'view';
        }

        return $subAdminRole->modules()
            ->where('modules.id', $moduleId)
            ->where("module_permission.can_{$action}", true)
            ->exists();
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
