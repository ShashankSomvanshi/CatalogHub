<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sub-admin accounts are users with role_id 2; no separate account table is needed.
    }

    public function down(): void
    {
        Schema::dropIfExists('sub_admins');
    }
};
