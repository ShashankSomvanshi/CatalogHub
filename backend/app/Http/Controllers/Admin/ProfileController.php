<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json(['profile' => $this->profilePayload($request->user())], 200);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'phone_no' => ['nullable', 'string', 'max:20'],
            'profile_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'current_password' => ['nullable', 'required_with:password', 'string'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();
        $updates = array_filter([
            'name' => $validated['name'] ?? null,
            'phone_no' => $validated['phone_no'] ?? null,
        ], static fn ($value) => $value !== null);

        if ($request->hasFile('profile_image')) {
            $updates['profile_image'] = $request->file('profile_image')->store('profile-images', 'public');
        }

        if (! empty($validated['password'])) {
            if (! Hash::check($validated['current_password'] ?? '', $user->password)) {
                return response()->json(['message' => 'Current password is incorrect.'], 422);
            }

            $updates['password'] = Hash::make($validated['password']);
        }

        $user->update($updates);

        return response()->json([
            'message' => 'Profile updated successfully',
            'profile' => $this->profilePayload($user->fresh('subAdminRole.modules')),
        ], 200);
    }

    private function profilePayload($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone_no' => $user->phone_no,
            'profile_image' => $user->profile_image,
            'role' => $user->role,
            'role_id' => $user->role_id,
            'status' => $user->status ?? 'active',
            'permissions' => $user->resolvedModulePermissions(),
        ];
    }
}
