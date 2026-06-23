<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable()->change();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->string('customer_name')->after('order_number');
            $table->string('customer_email')->after('customer_name');
            $table->string('customer_phone', 20)->nullable()->after('customer_email');
            $table->text('billing_address')->after('customer_phone');
            $table->string('billing_pincode', 12)->after('billing_address');
            $table->text('shipping_address')->after('billing_pincode');
            $table->string('shipping_pincode', 12)->after('shipping_address');
            $table->string('payment_method')->after('shipping_pincode');
            $table->string('payment_status')->default('pending')->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn([
                'customer_name', 'customer_email', 'customer_phone',
                'billing_address', 'billing_pincode', 'shipping_address',
                'shipping_pincode', 'payment_method', 'payment_status',
            ]);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
        });
    }
};
