<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\SubAdminRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_a_sub_admin_in_users_table_with_a_role(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'role_id' => 1]);
        $subAdminRole = Role::findOrFail(2);
        $storeManager = SubAdminRole::where('name', 'Store Manager')->firstOrFail();

        $response = $this->actingAs($admin)->postJson('/api/admin/users', [
            'name' => 'Staff User',
            'email' => 'staff@example.com',
            'phone_no' => '1234567890',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role_id' => $subAdminRole->id,
            'sub_role_id' => $storeManager->id,
            'status' => 'active',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.role_id', 2)
            ->assertJsonPath('user.role', 'sub_admin');

        $this->assertDatabaseHas('users', [
            'email' => 'staff@example.com',
            'role_id' => 2,
            'role' => 'sub_admin',
            'sub_role_id' => $storeManager->id,
        ]);
        $this->assertFalse(Schema::hasTable('sub_admins'));
    }

    public function test_sub_admin_compatibility_api_also_uses_users_table(): void
    {
        $admin = User::factory()->create(['role' => 'admin', 'role_id' => 1]);
        $productManager = SubAdminRole::where('name', 'Product Manager')->firstOrFail();

        $response = $this->actingAs($admin)->postJson('/api/admin/sub-admins', [
            'name' => 'Support Admin',
            'email' => 'support@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'sub_role_id' => $productManager->id,
        ]);

        $response->assertCreated()->assertJsonPath('sub_admin.role_id', 2);
        $this->assertDatabaseHas('users', [
            'email' => 'support@example.com',
            'role' => 'sub_admin',
            'role_id' => 2,
            'sub_role_id' => $productManager->id,
        ]);
        $this->assertFalse(Schema::hasTable('sub_admins'));
    }

    public function test_admin_users_route_rejects_regular_users(): void
    {
        $user = User::factory()->create(['role' => 'user', 'role_id' => 3]);

        $this->actingAs($user)
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_sub_admin_needs_users_permission_to_access_users_route(): void
    {
        $subAdminRole = SubAdminRole::where('name', 'Product Manager')->firstOrFail();
        $subAdmin = User::factory()->create([
            'role' => 'sub_admin',
            'role_id' => 2,
            'sub_role_id' => $subAdminRole->id,
        ]);

        $this->actingAs($subAdmin)
            ->getJson('/api/admin/users')
            ->assertForbidden();

        DB::table('module_permission')->insert([
            'sub_role_admin_id' => $subAdminRole->id,
            'module_id' => 1,
        ]);

        $this->actingAs($subAdmin)
            ->getJson('/api/admin/users')
            ->assertOk();
    }
}
