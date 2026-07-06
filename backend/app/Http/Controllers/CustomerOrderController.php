<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = $request->user()->orders()
            ->with([
                'items:id,order_id,product_id,product_name,sku,unit_price,quantity,subtotal',
                'items.product:id,image',
            ])
            ->latest()
            ->get([
                'id',
                'user_id',
                'order_number',
                'shipping_address',
                'shipping_pincode',
                'payment_method',
                'payment_status',
                'subtotal',
                'shipping_amount',
                'final_amount',
                'status',
                'created_at',
            ]);

        return response()->json(['orders' => $orders]);
    }
}
