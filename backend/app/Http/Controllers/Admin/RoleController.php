<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAdminAccess;
use App\Http\Controllers\Admin\Concerns\PaginatesAdminTables;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\SubAdminRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    use AuthorizesAdminAccess, PaginatesAdminTables;

    public function index(): JsonResponse
    {
        $roles = Role::select('id', 'name')
            ->orderBy('id')
            ->get();

        return response()->json(['roles' => $roles], 200);
    }

    public function subAdminRoles(Request $request): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'role_management', 'view');

        $query = SubAdminRole::with('modules:id,module_name')->select('id', 'name');
        foreach ($this->searchTerms($request) as $term) {
            $query->where(fn ($search) => $search
                ->whereRaw('LOWER(name) LIKE ?', ["%{$term}%"])
                ->orWhereHas('modules', fn ($module) => $module->whereRaw('LOWER(module_name) LIKE ?', ["%{$term}%"])));
        }
        $sort = ['id' => 'id', 'name' => 'name'][$request->input('sort')] ?? 'id';
        $roles = $query->orderBy($sort, $request->input('direction') === 'desc' ? 'desc' : 'asc')->paginate($this->perPage($request));

        return response()->json(['sub_admin_roles' => $roles->items(), 'meta' => $this->paginationMeta($roles)]);
    }

    public function showSubAdminRole(Request $request, SubAdminRole $subAdminRole): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'role_management', 'view');

        return response()->json([
            'sub_admin_role' => $subAdminRole->load('modules:id,module_name'),
        ]);
    }

    public function storeSubAdminRole(Request $request): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'role_management', 'create');
        $request->merge(['name' => trim((string) $request->input('name'))]);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:sub_role_admin,name'],
            'permissions' => ['present', 'array'],
            'permissions.*.module_id' => ['required', 'integer', 'distinct', 'exists:modules,id'],
            'permissions.*.can_view' => ['nullable', 'boolean'],
            'permissions.*.can_create' => ['nullable', 'boolean'],
            'permissions.*.can_update' => ['nullable', 'boolean'],
            'permissions.*.can_delete' => ['nullable', 'boolean'],
        ]);

        $role = DB::transaction(function () use ($validated): SubAdminRole {
            $role = SubAdminRole::create(['name' => trim($validated['name'])]);
            $syncData = [];

            foreach ($validated['permissions'] as $permission) {
                $canCreate = (bool) ($permission['can_create'] ?? false);
                $canUpdate = (bool) ($permission['can_update'] ?? false);
                $canDelete = (bool) ($permission['can_delete'] ?? false);
                $canView = (bool) ($permission['can_view'] ?? false) || $canCreate || $canUpdate || $canDelete;

                if ($canView) {
                    $syncData[$permission['module_id']] = [
                        'can_view' => $canView,
                        'can_create' => $canCreate,
                        'can_update' => $canUpdate,
                        'can_delete' => $canDelete,
                    ];
                }
            }

            $role->modules()->sync($syncData);

            return $role;
        });

        return response()->json([
            'message' => 'Role created successfully.',
            'sub_admin_role' => $role->load('modules:id,module_name'),
        ], 201);
    }

    public function updateSubAdminRole(Request $request, SubAdminRole $subAdminRole): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'role_management', 'update');
        $request->merge(['name' => trim((string) $request->input('name'))]);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('sub_role_admin', 'name')->ignore($subAdminRole->id)],
        ]);

        $subAdminRole->update(['name' => trim($validated['name'])]);

        return response()->json([
            'message' => 'Role updated successfully.',
            'sub_admin_role' => $subAdminRole->fresh('modules:id,module_name'),
        ]);
    }

    public function destroySubAdminRole(Request $request, SubAdminRole $subAdminRole): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'role_management', 'delete');

        if ($subAdminRole->users()->exists()) {
            return response()->json([
                'message' => 'This role is assigned to users and cannot be deleted.',
            ], 422);
        }

        $subAdminRole->delete();

        return response()->json(['message' => 'Role deleted successfully.']);
    }
}
