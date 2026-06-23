<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modules', function (Blueprint $table) {
            $table->id();
            $table->string('module_name')->unique();
        });

        DB::table('modules')->insert([
            ['id' => 1, 'module_name' => 'User Management'],
            ['id' => 2, 'module_name' => 'Category Management'],
            ['id' => 3, 'module_name' => 'Product Management'],
            ['id' => 4, 'module_name' => 'Role Management'],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('modules');
    }
};
