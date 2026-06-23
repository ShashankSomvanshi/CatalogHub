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

    public function show(Request $request, SubAdminRole $subAdminRole): JsonResponse
    {
        $this->ensureFullAdmin($request, 'Only admin can assign role permissions.');

        return response()->json($this->payload($subAdminRole));
    }

    public function update(Request $request, SubAdminRole $subAdminRole): JsonResponse
    {
        $this->ensureFullAdmin($request, 'Only admin can assign role permissions.');

        $validated = $request->validate([
            'module_ids' => ['present', 'array'],
            'module_ids.*' => ['integer', 'distinct', 'exists:modules,id'],
        ]);

        $subAdminRole->modules()->sync($validated['module_ids']);

        return response()->json(array_merge(
            ['message' => 'Role permissions updated successfully.'],
            $this->payload($subAdminRole->fresh())
        ));
    }

    private function payload(SubAdminRole $subAdminRole): array
    {
        $selectedIds = $subAdminRole->modules()->pluck('modules.id');

        return [
            'sub_admin_role' => $subAdminRole->only(['id', 'name']),
            'modules' => Module::orderBy('id')->get(['id', 'module_name'])->map(fn (Module $module): array => [
                'id' => $module->id,
                'module_name' => $module->module_name,
                'selected' => $selectedIds->contains($module->id),
            ]),
        ];
    }
}
