<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sub_role_admin', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        DB::table('sub_role_admin')->insert(collect([
            'Store Manager',
            'Product Manager',
            'Order Manager',
            'Inventory Manager',
            'Sales Manager',
            'Content Manager',
            'Support Executive',
        ])->map(fn (string $name): array => [
            'name' => $name,
            'created_at' => now(),
            'updated_at' => now(),
        ])->all());

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('sub_role_id')
                ->nullable()
                ->after('role_id')
                ->constrained('sub_role_admin')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sub_role_id');
        });

        Schema::dropIfExists('sub_role_admin');
    }
};
