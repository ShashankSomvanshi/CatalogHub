<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAdminAccess;
use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    use AuthorizesAdminAccess;

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'transactions', 'view');

        $transactions = Transaction::query()
            ->with('order:id,order_number,customer_name,customer_email,final_amount,created_at')
            ->latest()
            ->get([
                'id',
                'transaction_number',
                'order_id',
                'amount',
                'currency',
                'payment_gateway',
                'payment_method',
                'status',
                'paid_at',
                'created_at',
            ]);

        return response()->json(['transactions' => $transactions]);
    }

    public function show(Request $request, Transaction $transaction): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'transactions', 'view');

        $transaction->load([
            'order:id,user_id,order_number,customer_name,customer_email,customer_phone,billing_address,billing_pincode,shipping_address,shipping_pincode,payment_method,payment_status,subtotal,shipping_amount,final_amount,status,created_at',
            'order.items:id,order_id,product_id,product_name,sku,unit_price,quantity,subtotal',
            'order.items.product:id,image',
        ]);

        return response()->json(['transaction' => $transaction]);
    }
}
