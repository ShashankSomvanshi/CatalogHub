<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $permissionsNeedMigration = Schema::hasTable('sub_admin_permissions')
            && (Schema::hasTable('sub_admins') || ! Schema::hasColumn('sub_admin_permissions', 'user_id'));

        if ($permissionsNeedMigration) {
            Schema::create('user_permissions_migration', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('module');
                $table->boolean('can_view')->default(false);
                $table->boolean('can_create')->default(false);
                $table->boolean('can_update')->default(false);
                $table->boolean('can_delete')->default(false);
                $table->timestamps();
                $table->unique(['user_id', 'module']);
            });

            $permissions = DB::table('sub_admin_permissions')->get();
            $subAdminUsers = Schema::hasTable('sub_admins')
                ? DB::table('sub_admins')->pluck('user_id', 'id')
                : collect();

            foreach ($permissions as $permission) {
                $userId = $permission->user_id
                    ?? $subAdminUsers->get($permission->sub_admin_id ?? null);

                if (! $userId || ! DB::table('users')->where('id', $userId)->exists()) {
                    continue;
                }

                DB::table('user_permissions_migration')->updateOrInsert(
                    ['user_id' => $userId, 'module' => $permission->module],
                    [
                        'can_view' => $permission->can_view,
                        'can_create' => $permission->can_create,
                        'can_update' => $permission->can_update,
                        'can_delete' => $permission->can_delete,
                        'created_at' => $permission->created_at ?? now(),
                        'updated_at' => $permission->updated_at ?? now(),
                    ]
                );
            }

            Schema::drop('sub_admin_permissions');
            Schema::rename('user_permissions_migration', 'sub_admin_permissions');
        }

        Schema::dropIfExists('sub_admins');
    }

    public function down(): void
    {
        // The removed duplicate account data cannot be reconstructed reliably.
    }
};
