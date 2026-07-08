<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminAccess
{
    private const MODULE_IDS = [
        'users' => 1,
        'categories' => 2,
        'products' => 3,
        'role_management' => 4,
        'transactions' => 5,
    ];

    public function handle(Request $request, Closure $next, ?string $module = null): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if ($this->isFullAdmin($user)) {
            return $next($request);
        }

        if (! $this->isSubAdmin($user)) {
            abort(403, 'Only admin or permitted sub admin can access this module.');
        }

        if ($module && ! $this->hasModulePermission($user, $module)) {
            abort(403, 'You do not have permission for this module.');
        }

        return $next($request);
    }

    private function isFullAdmin(mixed $user): bool
    {
        return (int) $user->role_id === 1 || $user->role === 'admin';
    }

    private function isSubAdmin(mixed $user): bool
    {
        return (int) $user->role_id === 2 || $user->role === 'sub_admin';
    }

    private function hasModulePermission(mixed $user, string $module): bool
    {
        $moduleId = self::MODULE_IDS[$module] ?? null;

        return (bool) $moduleId
            && $user->subAdminRole
            && $user->subAdminRole->modules()
                ->where('modules.id', $moduleId)
                ->where('module_permission.can_view', true)
                ->exists();
    }
}
