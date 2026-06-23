<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAdminAccess;
use App\Http\Controllers\Controller;
use App\Models\SubAdminPermission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SubAdminPermissionController extends Controller
{
    use AuthorizesAdminAccess;

    private const MODULES = ['users', 'categories', 'products'];

    public function show(Request $request, User $subAdmin): JsonResponse
    {
        $this->ensureFullAdmin($request, 'Only admin can view sub admin permissions.');

        return response()->json([
            'sub_admin' => $this->ensureSubAdmin($subAdmin)->only(['id', 'name', 'email', 'status']),
            'permissions' => $this->permissionsFor($subAdmin),
            'modules' => self::MODULES,
        ], 200);
    }

    public function update(Request $request, User $subAdmin): JsonResponse
    {
        $this->ensureFullAdmin($request, 'Only admin can assign sub admin permissions.');

        $validated = $request->validate([
            'permissions' => ['required', 'array'],
            'permissions.*.module' => ['required', 'string', Rule::in(self::MODULES)],
            'permissions.*.can_view' => ['nullable', 'boolean'],
        ]);

        foreach ($validated['permissions'] as $permission) {
            SubAdminPermission::updateOrCreate(
                [
                    'user_id' => $this->ensureSubAdmin($subAdmin)->id,
                    'module' => $permission['module'],
                ],
                [
                    'can_view' => (bool) ($permission['can_view'] ?? false),
                    'can_create' => false,
                    'can_update' => false,
                    'can_delete' => false,
                ]
            );
        }

        return response()->json([
            'message' => 'Permissions updated successfully',
            'permissions' => $this->permissionsFor($subAdmin->fresh()),
        ], 200);
    }

    private function permissionsFor(User $subAdmin)
    {
        $existing = $subAdmin->subAdminPermissions()->get()->keyBy('module');

        return collect(self::MODULES)->map(fn (string $module): array => [
            'module' => $module,
            'can_view' => (bool) optional($existing->get($module))->can_view,
            'can_create' => (bool) optional($existing->get($module))->can_create,
            'can_update' => (bool) optional($existing->get($module))->can_update,
            'can_delete' => (bool) optional($existing->get($module))->can_delete,
        ])->values();
    }

    private function ensureSubAdmin(User $user): User
    {
        if ((int) $user->role_id !== 2 && $user->role !== 'sub_admin') {
            abort(404, 'Sub admin not found.');
        }

        return $user;
    }
}
