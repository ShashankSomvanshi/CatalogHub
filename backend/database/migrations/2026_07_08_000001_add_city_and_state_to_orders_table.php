<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->string('billing_city', 100)->nullable()->after('billing_address');
            $table->string('billing_state', 100)->nullable()->after('billing_city');
            $table->string('shipping_city', 100)->nullable()->after('shipping_address');
            $table->string('shipping_state', 100)->nullable()->after('shipping_city');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table): void {
            $table->dropColumn(['billing_city', 'billing_state', 'shipping_city', 'shipping_state']);
        });
    }
};
