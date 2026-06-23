<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAdminAccess;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class SubAdminController extends Controller
{
    use AuthorizesAdminAccess;

    public function index(Request $request): JsonResponse
    {
        $this->ensureFullAdmin($request, 'Only admin can manage sub admins.');

        $subAdmins = User::with(['subAdminPermissions', 'subAdminRole'])
            ->select('id', 'name', 'email', 'phone_no', 'role', 'role_id', 'sub_role_id', 'status', 'created_at')
            ->where(function ($query) {
                $query->where('role_id', 2)->orWhere('role', 'sub_admin');
            })
            ->latest()
            ->get()
            ->map(function (User $user): array {
                $data = $user->toArray();
                $data['permissions'] = $data['sub_admin_permissions'];
                unset($data['sub_admin_permissions']);

                return $data;
            });

        return response()->json(['sub_admins' => $subAdmins], 200);
    }

    public function show(Request $request, User $subAdmin): JsonResponse
    {
        $this->ensureFullAdmin($request, 'Only admin can view sub admins.');

        return response()->json([
            'sub_admin' => $this->ensureSubAdmin($subAdmin)->load(['subAdminPermissions', 'subAdminRole']),
        ], 200);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureFullAdmin($request, 'Only admin can create sub admins.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone_no' => ['nullable', 'string', 'max:20'],
            'phone' => ['nullable', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'sub_role_id' => ['required', 'integer', 'exists:sub_role_admin,id'],
            'status' => ['nullable', 'in:active,inactive'],
        ]);

        $roleId = Role::where('name', 'Sub Admin')->value('id') ?? 2;

        $subAdmin = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone_no' => $validated['phone_no'] ?? $validated['phone'] ?? null,
            'role' => 'sub_admin',
            'role_id' => $roleId,
            'sub_role_id' => $validated['sub_role_id'],
            'status' => $validated['status'] ?? 'active',
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'message' => 'Sub admin created successfully',
            'sub_admin' => $subAdmin->load('subAdminPermissions'),
        ], 201);
    }

    public function update(Request $request, User $subAdmin): JsonResponse
    {
        $this->ensureFullAdmin($request, 'Only admin can update sub admins.');

        $this->ensureSubAdmin($subAdmin);
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => [
                'nullable',
                'email',
                Rule::unique('users', 'email')->ignore($subAdmin->id),
            ],
            'phone_no' => ['nullable', 'string', 'max:20'],
            'phone' => ['nullable', 'string', 'max:20'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'sub_role_id' => ['required', 'integer', 'exists:sub_role_admin,id'],
            'status' => ['nullable', 'in:active,inactive'],
        ]);

        $updates = array_filter([
            'name' => $validated['name'] ?? null,
            'email' => $validated['email'] ?? null,
            'phone_no' => $validated['phone_no'] ?? $validated['phone'] ?? null,
            'status' => $validated['status'] ?? null,
            'sub_role_id' => $validated['sub_role_id'],
        ], static fn ($value) => $value !== null);

        if (! empty($validated['password'])) {
            $updates['password'] = Hash::make($validated['password']);
        }

        $subAdmin->update($updates);

        return response()->json([
            'message' => 'Sub admin updated successfully',
            'sub_admin' => $subAdmin->fresh()->load('subAdminPermissions'),
        ], 200);
    }

    public function destroy(Request $request, User $subAdmin): JsonResponse
    {
        $this->ensureFullAdmin($request, 'Only admin can delete sub admins.');

        $this->ensureSubAdmin($subAdmin)->delete();

        return response()->json(['message' => 'Sub admin deleted successfully'], 200);
    }

    private function ensureSubAdmin(User $user): User
    {
        if ((int) $user->role_id !== 2 && $user->role !== 'sub_admin') {
            abort(404, 'Sub admin not found.');
        }

        return $user;
    }
}
