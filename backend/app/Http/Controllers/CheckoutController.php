<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CheckoutController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_type' => ['required', Rule::in(['guest', 'existing', 'new', 'authenticated'])],
            'name' => ['required_if:customer_type,guest,new', 'nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone_no' => ['nullable', 'string', 'max:20'],
            'password' => ['required_if:customer_type,existing,new', 'nullable', 'string', 'min:8'],
            'password_confirmation' => ['required_if:customer_type,new', 'nullable', 'same:password'],
            'billing_address' => ['required', 'string', 'max:1000'],
            'billing_pincode' => ['required', 'string', 'max:12'],
            'shipping_address' => ['required', 'string', 'max:1000'],
            'shipping_pincode' => ['required', 'string', 'max:12'],
            'payment_method' => ['required', Rule::in(['card', 'upi', 'net_banking'])],
            'checkout_source' => ['nullable', Rule::in(['cart', 'buy_now'])],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);

        $products = Product::whereIn('id', collect($validated['items'])->pluck('product_id'))
            ->where('status', 'active')
            ->get()
            ->keyBy('id');

        if ($products->count() !== count($validated['items'])) {
            return response()->json(['message' => 'One or more products are no longer available.'], 422);
        }

        $order = DB::transaction(function () use ($request, $validated, $products): Order {
            $user = $validated['customer_type'] === 'authenticated'
                ? $request->user()
                : $this->resolveUser($validated);
            abort_if($validated['customer_type'] === 'authenticated' && ! $user, 401, 'Please log in to continue checkout.');
            $name = $user?->name ?? $validated['name'];
            $phone = $user?->phone_no ?? ($validated['phone_no'] ?? null);
            $subtotal = collect($validated['items'])->sum(function (array $item) use ($products): float {
                return (float) $products[$item['product_id']]->price * $item['quantity'];
            });

            $order = Order::create([
                'user_id' => $user?->id,
                'order_number' => 'ORD-' . now()->format('Ymd') . '-' . Str::upper(Str::random(8)),
                'customer_name' => $name,
                'customer_email' => $validated['email'],
                'customer_phone' => $phone,
                'billing_address' => $validated['billing_address'],
                'billing_pincode' => $validated['billing_pincode'],
                'shipping_address' => $validated['shipping_address'],
                'shipping_pincode' => $validated['shipping_pincode'],
                'payment_method' => $validated['payment_method'],
                'payment_status' => 'pending',
                'subtotal' => $subtotal,
                'shipping_amount' => 0,
                'final_amount' => $subtotal,
                'status' => 'pending',
            ]);

            foreach ($validated['items'] as $item) {
                $product = $products[$item['product_id']];
                $order->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->product_name,
                    'sku' => $product->sku,
                    'unit_price' => $product->price,
                    'quantity' => $item['quantity'],
                    'subtotal' => (float) $product->price * $item['quantity'],
                ]);
            }

            if ($user && ($validated['checkout_source'] ?? 'cart') !== 'buy_now') {
                $user->cart?->items()->delete();
            }

            return $order->load('items');
        });

        return response()->json(['message' => 'Order placed successfully', 'order' => $order], 201);
    }

    private function resolveUser(array $validated): ?User
    {
        if ($validated['customer_type'] === 'guest') {
            return null;
        }

        if ($validated['customer_type'] === 'existing') {
            $user = User::where('email', $validated['email'])->first();
            $isCustomer = $user && ($user->role === 'user' || (int) $user->role_id === 3);

            if (! $isCustomer || ! Hash::check($validated['password'], $user->password)) {
                abort(401, 'Invalid user email or password.');
            }

            abort_if(($user->status ?? 'active') !== 'active', 403, 'Your account is inactive.');
            return $user;
        }

        abort_if(User::where('email', $validated['email'])->exists(), 422, 'An account already exists with this email.');

        return User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone_no' => $validated['phone_no'] ?? null,
            'role' => 'user',
            'role_id' => 3,
            'status' => 'active',
            'password' => Hash::make($validated['password']),
        ]);
    }
}
