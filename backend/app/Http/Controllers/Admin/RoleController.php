<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\SubAdminRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Admin\Concerns\AuthorizesAdminAccess;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    use AuthorizesAdminAccess;

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

        return response()->json([
            'sub_admin_roles' => SubAdminRole::with('modules:id,module_name')
                ->select('id', 'name')
                ->orderBy('id')
                ->get(),
        ]);
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
        ]);

        $role = SubAdminRole::create(['name' => trim($validated['name'])]);

        return response()->json([
            'message' => 'Role created successfully.',
            'sub_admin_role' => $role,
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
