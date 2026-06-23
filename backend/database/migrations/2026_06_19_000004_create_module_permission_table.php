<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('module_permission', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sub_role_admin_id')->constrained('sub_role_admin')->cascadeOnDelete();
            $table->foreignId('module_id')->constrained('modules')->cascadeOnDelete();
            $table->unique(['sub_role_admin_id', 'module_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('module_permission');
    }
};
