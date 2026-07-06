<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('modules')->updateOrInsert(
            ['id' => 5],
            ['module_name' => 'Transaction Management'],
        );
    }

    public function down(): void
    {
        DB::table('modules')->where('id', 5)->delete();
    }
};
