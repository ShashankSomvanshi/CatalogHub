<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAdminAccess;
use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Models\SubAdminRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModulePermissionController extends Controller
{
    use AuthorizesAdminAccess;

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'role_management', 'create');

        return response()->json([
            'modules' => Module::orderBy('id')->get(['id', 'module_name'])->map(fn (Module $module): array => [
                'id' => $module->id,
                'module_name' => $module->module_name,
                'can_view' => false,
                'can_create' => false,
                'can_update' => false,
                'can_delete' => false,
            ]),
        ]);
    }

    public function show(Request $request, SubAdminRole $subAdminRole): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'role_management', 'view');

        return response()->json($this->payload($subAdminRole));
    }

    public function update(Request $request, SubAdminRole $subAdminRole): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'role_management', 'update');

        $validated = $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*.module_id' => ['required', 'integer', 'distinct', 'exists:modules,id'],
            'permissions.*.can_view' => ['nullable', 'boolean'],
            'permissions.*.can_create' => ['nullable', 'boolean'],
            'permissions.*.can_update' => ['nullable', 'boolean'],
            'permissions.*.can_delete' => ['nullable', 'boolean'],
        ]);

        $syncData = [];
        foreach ($validated['permissions'] as $permission) {
            $canCreate = (bool) ($permission['can_create'] ?? false);
            $canUpdate = (bool) ($permission['can_update'] ?? false);
            $canDelete = (bool) ($permission['can_delete'] ?? false);
            $canView = (bool) ($permission['can_view'] ?? false) || $canCreate || $canUpdate || $canDelete;

            if (! $canView) {
                continue;
            }

            $syncData[$permission['module_id']] = [
                'can_view' => $canView,
                'can_create' => $canCreate,
                'can_update' => $canUpdate,
                'can_delete' => $canDelete,
            ];
        }

        $subAdminRole->modules()->sync($syncData);

        return response()->json(array_merge(
            ['message' => 'Role permissions updated successfully.'],
            $this->payload($subAdminRole->fresh())
        ));
    }

    private function payload(SubAdminRole $subAdminRole): array
    {
        $selectedModules = $subAdminRole->modules()->get()->keyBy('id');

        return [
            'sub_admin_role' => $subAdminRole->only(['id', 'name']),
            'modules' => Module::orderBy('id')->get(['id', 'module_name'])->map(fn (Module $module): array => [
                'id' => $module->id,
                'module_name' => $module->module_name,
                'selected' => $selectedModules->has($module->id),
                'can_view' => (bool) optional(optional($selectedModules->get($module->id))->pivot)->can_view,
                'can_create' => (bool) optional(optional($selectedModules->get($module->id))->pivot)->can_create,
                'can_update' => (bool) optional(optional($selectedModules->get($module->id))->pivot)->can_update,
                'can_delete' => (bool) optional(optional($selectedModules->get($module->id))->pivot)->can_delete,
            ]),
        ];
    }
}
