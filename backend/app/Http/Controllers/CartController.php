<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return $this->cartResponse($this->cartFor($request));
    }

    public function sync(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => ['required', 'array'],
            'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:99'],
        ]);

        $productIds = collect($validated['items'])->pluck('product_id');
        $activeProductIds = Product::whereIn('id', $productIds)->where('status', 'active')->pluck('id');
        $cart = $this->cartFor($request);

        DB::transaction(function () use ($cart, $validated, $activeProductIds): void {
            foreach ($validated['items'] as $item) {
                if (! $activeProductIds->contains($item['product_id'])) {
                    continue;
                }

                $cart->items()->updateOrCreate(
                    ['product_id' => $item['product_id']],
                    ['quantity' => $item['quantity']],
                );
            }
        });

        return $this->cartResponse($cart, 'Cart synchronized successfully');
    }

    public function storeItem(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:99'],
        ]);

        $product = Product::where('status', 'active')->findOrFail($validated['product_id']);
        $cart = $this->cartFor($request);
        $item = $cart->items()->firstOrNew(['product_id' => $product->id]);
        $item->quantity = min(99, ($item->exists ? $item->quantity : 0) + ($validated['quantity'] ?? 1));
        $item->save();

        return $this->cartResponse($cart, 'Product added to cart', 201);
    }

    public function updateItem(Request $request, CartItem $cartItem): JsonResponse
    {
        $this->ensureOwnItem($request, $cartItem);
        $validated = $request->validate(['quantity' => ['required', 'integer', 'min:1', 'max:99']]);
        $cartItem->update($validated);

        return $this->cartResponse($cartItem->cart, 'Cart quantity updated');
    }

    public function destroyItem(Request $request, CartItem $cartItem): JsonResponse
    {
        $this->ensureOwnItem($request, $cartItem);
        $cart = $cartItem->cart;
        $cartItem->delete();

        return $this->cartResponse($cart, 'Product removed from cart');
    }

    private function cartFor(Request $request): Cart
    {
        return Cart::firstOrCreate(['user_id' => $request->user()->id]);
    }

    private function ensureOwnItem(Request $request, CartItem $cartItem): void
    {
        abort_unless($cartItem->cart()->where('user_id', $request->user()->id)->exists(), 404);
    }

    private function cartResponse(Cart $cart, ?string $message = null, int $status = 200): JsonResponse
    {
        $items = $cart->items()->with('product:id,product_name,sku,image,price,status')->get()
            ->filter(fn (CartItem $item): bool => (bool) $item->product)
            ->map(fn (CartItem $item): array => [
                'cart_item_id' => $item->id,
                'id' => $item->product->id,
                'product_id' => $item->product->id,
                'name' => $item->product->product_name,
                'product_name' => $item->product->product_name,
                'sku' => $item->product->sku,
                'image' => $item->product->image,
                'price' => $item->product->price,
                'quantity' => $item->quantity,
                'subtotal' => number_format((float) $item->product->price * $item->quantity, 2, '.', ''),
                'available' => $item->product->status === 'active',
            ])->values();

        $subtotal = $items->sum(fn (array $item): float => (float) $item['subtotal']);
        $payload = [
            'cart' => [
                'id' => $cart->id,
                'items' => $items,
                'item_count' => $items->sum('quantity'),
                'subtotal' => number_format($subtotal, 2, '.', ''),
                'shipping_amount' => '0.00',
                'final_amount' => number_format($subtotal, 2, '.', ''),
            ],
        ];

        if ($message) {
            $payload = ['message' => $message] + $payload;
        }

        return response()->json($payload, $status);
    }
}
