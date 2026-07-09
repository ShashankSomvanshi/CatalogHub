<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAdminAccess;
use App\Http\Controllers\Admin\Concerns\PaginatesAdminTables;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    use AuthorizesAdminAccess, PaginatesAdminTables;

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'transactions', 'view');

        $query = Transaction::query()
            ->with('order:id,order_number,customer_name,customer_email,final_amount,created_at')
            ->select([
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
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }
        foreach ($this->searchTerms($request) as $term) {
            $query->where(fn ($search) => $search
                ->whereRaw('LOWER(transaction_number) LIKE ?', ["%{$term}%"])
                ->orWhereRaw('LOWER(status) LIKE ?', ["%{$term}%"])
                ->orWhere('order_id', 'like', "%{$term}%")
                ->orWhere('amount', 'like', "%{$term}%")
                ->orWhereHas('order', fn ($order) => $order
                    ->whereRaw('LOWER(order_number) LIKE ?', ["%{$term}%"])
                    ->orWhereRaw('LOWER(customer_name) LIKE ?', ["%{$term}%"])
                    ->orWhereRaw('LOWER(customer_email) LIKE ?', ["%{$term}%"])));
        }
        $direction = $request->input('direction') === 'asc' ? 'asc' : 'desc';
        if ($request->input('sort') === 'order') {
            $query->orderBy(Order::select('order_number')->whereColumn('orders.id', 'transactions.order_id'), $direction);
        } elseif ($request->input('sort') === 'customer') {
            $query->orderBy(Order::select('customer_name')->whereColumn('orders.id', 'transactions.order_id'), $direction);
        } else {
            $sort = ['id' => 'id', 'price' => 'amount', 'status' => 'status', 'date' => 'created_at'][$request->input('sort')] ?? 'created_at';
            $query->orderBy($sort, $direction);
        }
        $transactions = $query->paginate($this->perPage($request));

        return response()->json(['transactions' => $transactions->items(), 'meta' => $this->paginationMeta($transactions)]);
    }

    public function show(Request $request, Transaction $transaction): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'transactions', 'view');

        $transaction->load([
            'order:id,user_id,order_number,customer_name,customer_email,customer_phone,billing_address,billing_city,billing_state,billing_pincode,shipping_address,shipping_city,shipping_state,shipping_pincode,payment_method,payment_status,subtotal,shipping_amount,final_amount,status,created_at',
            'order.items:id,order_id,product_id,product_name,sku,unit_price,quantity,subtotal',
            'order.items.product:id,image',
        ]);

        return response()->json(['transaction' => $transaction]);
    }
}
