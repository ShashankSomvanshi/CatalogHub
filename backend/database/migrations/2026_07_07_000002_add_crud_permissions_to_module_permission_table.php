<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('module_permission', function (Blueprint $table) {
            $table->boolean('can_view')->default(false)->after('module_id');
            $table->boolean('can_create')->default(false)->after('can_view');
            $table->boolean('can_update')->default(false)->after('can_create');
            $table->boolean('can_delete')->default(false)->after('can_update');
        });

        // Existing module assignments represented view access before CRUD columns existed.
        DB::table('module_permission')->update(['can_view' => true]);
    }

    public function down(): void
    {
        Schema::table('module_permission', function (Blueprint $table) {
            $table->dropColumn(['can_view', 'can_create', 'can_update', 'can_delete']);
        });
    }
};
