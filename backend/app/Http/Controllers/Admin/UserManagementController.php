<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAdminAccess;
use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserManagementController extends Controller
{
    use AuthorizesAdminAccess;

    private function normalizeRoleName(string $name): string
    {
        return strtolower(str_replace(' ', '_', trim($name)));
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'users', 'view');

        $users = User::with(['roleRelation', 'subAdminRole'])
            ->select('id', 'name', 'email', 'phone_no', 'profile_image', 'role', 'role_id', 'sub_role_id', 'status', 'created_at')
            ->where('id', '!=', $request->user()->id)
            ->when(! $this->isFullAdmin($request->user()), fn ($query) => $query->where(function ($roleQuery) {
                $roleQuery->where('role_id', 3)->orWhere('role', 'user');
            }))
            ->latest()
            ->get()
            ->map(function (User $user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone_no' => $user->phone_no,
                    'profile_image' => $user->profile_image,
                    'role_id' => $user->role_id,
                    'role' => $user->role,
                    'role_name' => optional($user->roleRelation)->name,
                    'sub_role_id' => $user->sub_role_id,
                    'sub_role_name' => optional($user->subAdminRole)->name,
                    'status' => $user->status,
                    'created_at' => $user->created_at,
                ];
            });

        return response()->json(['users' => $users], 200);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'users', 'create');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'phone_no' => ['nullable', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'profile_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'role_id' => ['nullable', 'integer', 'exists:roles,id'],
            'sub_role_id' => ['nullable', 'integer', 'required_if:role_id,2', 'exists:sub_role_admin,id'],
            'status' => ['nullable', 'in:active,inactive'],
        ]);

        $roleId = (int) ($this->isFullAdmin($request->user()) ? ($validated['role_id'] ?? 3) : 3);
        $role = Role::find($roleId);

        $profilePath = null;
        if ($request->hasFile('profile_image')) {
            $profilePath = $request->file('profile_image')->store('profile-images', 'public');
        }

        $roleName = $role ? $this->normalizeRoleName($role->name) : 'user';

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone_no' => $validated['phone_no'] ?? null,
            'profile_image' => $profilePath,
            'role' => $roleName,
            'role_id' => $roleId,
            'sub_role_id' => $roleId === 2 ? $validated['sub_role_id'] : null,
            'status' => $validated['status'] ?? 'active',
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone_no' => $user->phone_no,
                'profile_image' => $user->profile_image,
                'role_id' => $user->role_id,
                'role' => $user->role,
                'sub_role_id' => $user->sub_role_id,
                'status' => $user->status,
            ],
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'users', 'update');
        $this->ensurePermittedUserRecord($request, $user);

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'unique:users,email,' . $user->id],
            'phone_no' => ['nullable', 'string', 'max:20'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'profile_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'role_id' => ['nullable', 'integer', 'exists:roles,id'],
            'sub_role_id' => ['nullable', 'integer', 'required_if:role_id,2', 'exists:sub_role_admin,id'],
            'status' => ['nullable', 'in:active,inactive'],
        ]);

        if (! $this->isFullAdmin($request->user())) {
            unset($validated['role_id'], $validated['sub_role_id']);
        }

        if ($request->hasFile('profile_image')) {
            $validated['profile_image'] = $request->file('profile_image')->store('profile-images', 'public');
        }

        if (! empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        if (array_key_exists('role_id', $validated) && $validated['role_id'] !== null) {
            $role = Role::find($validated['role_id']);
            $validated['role'] = $role ? $this->normalizeRoleName($role->name) : 'user';
            $validated['sub_role_id'] = (int) $validated['role_id'] === 2
                ? $validated['sub_role_id']
                : null;
        }

        $user->update($validated);

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->fresh(),
        ], 200);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'users', 'delete');
        $this->ensurePermittedUserRecord($request, $user);

        $user->delete();

        return response()->json(['message' => 'User deleted successfully'], 200);
    }

    private function ensurePermittedUserRecord(Request $request, User $user): void
    {
        if ($this->isFullAdmin($request->user())) {
            return;
        }

        if ((int) $user->role_id !== 3 && $user->role !== 'user') {
            abort(403, 'Sub admins can manage user accounts only.');
        }
    }
}
