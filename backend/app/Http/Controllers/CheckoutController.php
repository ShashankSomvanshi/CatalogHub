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
use Stripe\StripeClient;

class CheckoutController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        if (! config('services.stripe.secret')) {
            return response()->json(['message' => 'Stripe is not configured.'], 503);
        }

        $validated = $request->validate([
            'customer_type' => ['required', Rule::in(['guest', 'existing', 'new', 'authenticated'])],
            'name' => ['required_if:customer_type,guest,new', 'nullable', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'phone_no' => ['nullable', 'string', 'max:20'],
            'password' => ['required_if:customer_type,existing,new', 'nullable', 'string', 'min:8'],
            'password_confirmation' => ['required_if:customer_type,new', 'nullable', 'same:password'],
            'billing_address' => ['required', 'string', 'max:1000'],
            'billing_city' => ['required', 'string', 'max:100'],
            'billing_state' => ['required', 'string', 'max:100'],
            'billing_pincode' => ['required', 'string', 'max:12'],
            'shipping_address' => ['required', 'string', 'max:1000'],
            'shipping_city' => ['required', 'string', 'max:100'],
            'shipping_state' => ['required', 'string', 'max:100'],
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

        [$order, $transaction] = DB::transaction(function () use ($request, $validated, $products): array {
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
                'order_number' => 'ORD-'.now()->format('Ymd').'-'.Str::upper(Str::random(8)),
                'customer_name' => $name,
                'customer_email' => $validated['email'],
                'customer_phone' => $phone,
                'billing_address' => $validated['billing_address'],
                'billing_city' => $validated['billing_city'],
                'billing_state' => $validated['billing_state'],
                'billing_pincode' => $validated['billing_pincode'],
                'shipping_address' => $validated['shipping_address'],
                'shipping_city' => $validated['shipping_city'],
                'shipping_state' => $validated['shipping_state'],
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

            $transaction = $order->transactions()->create([
                'transaction_number' => 'TXN-'.now()->format('Ymd').'-'.Str::upper(Str::random(10)),
                'amount' => $order->final_amount,
                'currency' => 'INR',
                'payment_gateway' => 'stripe',
                'payment_method' => $validated['payment_method'],
                'status' => 'pending',
            ]);

            return [$order->load('items'), $transaction];
        });

        try {
            $stripe = new StripeClient(config('services.stripe.secret'));
            $frontendUrl = rtrim(config('services.frontend_url'), '/');
            $session = $stripe->checkout->sessions->create([
                'mode' => 'payment',
                'client_reference_id' => (string) $order->id,
                'customer_email' => $order->customer_email,
                'line_items' => $order->items->map(fn ($item): array => [
                    'quantity' => $item->quantity,
                    'price_data' => [
                        'currency' => 'inr',
                        'unit_amount' => (int) round((float) $item->unit_price * 100),
                        'product_data' => [
                            'name' => $item->product_name,
                            'metadata' => ['product_id' => (string) ($item->product_id ?? '')],
                        ],
                    ],
                ])->values()->all(),
                'metadata' => [
                    'order_id' => (string) $order->id,
                    'transaction_id' => (string) $transaction->id,
                    'transaction_number' => $transaction->transaction_number,
                ],
                'payment_intent_data' => [
                    'metadata' => [
                        'order_id' => (string) $order->id,
                        'transaction_id' => (string) $transaction->id,
                    ],
                ],
                'success_url' => $frontendUrl.'/payment/success?session_id={CHECKOUT_SESSION_ID}',
                'cancel_url' => $frontendUrl.'/payment/cancel?order='.urlencode($order->order_number),
            ]);

            $transaction->update([
                'gateway_order_id' => $session->id,
                'gateway_response' => [
                    'checkout_session_id' => $session->id,
                    'payment_status' => $session->payment_status,
                ],
            ]);
        } catch (\Throwable $exception) {
            report($exception);
            $transaction->update([
                'status' => 'failed',
                'failure_reason' => 'Unable to start Stripe Checkout.',
            ]);

            return response()->json(['message' => 'Unable to start payment. Please try again.'], 502);
        }

        return response()->json([
            'message' => 'Stripe Checkout created successfully.',
            'order' => $order,
            'transaction_number' => $transaction->transaction_number,
            'checkout_url' => $session->url,
        ], 201);
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
