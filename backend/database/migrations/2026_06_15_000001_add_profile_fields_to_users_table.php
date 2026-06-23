<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone_no')->nullable()->after('email');
            $table->string('profile_image')->nullable()->after('phone_no');
            $table->unsignedBigInteger('role_id')->nullable()->after('profile_image');
            $table->string('status')->default('active')->after('role_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone_no', 'profile_image', 'role_id', 'status']);
        });
    }
};
