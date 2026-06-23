<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAdminAccess;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    use AuthorizesAdminAccess;

    public function publicIndex(): JsonResponse
    {
        $products = Product::with('category:id,category_name')
            ->select('id', 'product_name', 'category_id', 'image', 'price')
            ->where('status', 'active')
            ->whereHas('category', fn ($query) => $query->where('status', 'active'))
            ->latest()
            ->limit(8)
            ->get();

        return response()->json(['products' => $products]);
    }

    public function publicAll(): JsonResponse
    {
        $products = Product::with('category:id,category_name')
            ->select('id', 'product_name', 'category_id', 'sku', 'image', 'price', 'description')
            ->where('status', 'active')
            ->whereHas('category', fn ($query) => $query->where('status', 'active'))
            ->latest()
            ->get();

        return response()->json(['products' => $products]);
    }

    public function publicShow(Product $product): JsonResponse
    {
        $product->load('category:id,category_name,status');

        if ($product->status !== 'active' || optional($product->category)->status !== 'active') {
            abort(404, 'Product not found.');
        }

        return response()->json([
            'product' => $product->only([
                'id',
                'product_name',
                'category_id',
                'sku',
                'image',
                'price',
                'description',
                'status',
            ]) + ['category' => $product->category],
        ]);
    }

    public function publicByCategory(Category $category): JsonResponse
    {
        if ($category->status !== 'active') {
            abort(404, 'Category not found.');
        }

        $products = Product::select('id', 'product_name', 'category_id', 'sku', 'image', 'price', 'description')
            ->where('category_id', $category->id)
            ->where('status', 'active')
            ->latest()
            ->get();

        return response()->json([
            'category' => $category->only(['id', 'category_name']),
            'products' => $products,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'products', 'view');

        $products = Product::with('category:id,category_name')
            ->select('id', 'product_name', 'category_id', 'sku', 'image', 'price', 'description', 'status', 'created_at')
            ->latest()
            ->get();

        return response()->json(['products' => $products], 200);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'products', 'create');

        $validated = $request->validate([
            'product_name' => ['nullable', 'string', 'max:255', 'required_without:name'],
            'name' => ['nullable', 'string', 'max:255', 'required_without:product_name'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'sku' => ['required', 'string', 'max:255', 'unique:products,sku'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'price' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['active', 'inactive', '1', '0', 1, 0, true, false])],
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('product-images', 'public');
        }

        $product = Product::create([
            'product_name' => $validated['product_name'] ?? $validated['name'],
            'category_id' => $validated['category_id'],
            'sku' => $validated['sku'],
            'image' => $imagePath,
            'price' => $validated['price'],
            'description' => $validated['description'] ?? null,
            'status' => $this->normalizeStatus($validated['status'] ?? 'active'),
        ]);

        return response()->json([
            'message' => 'Product created successfully',
            'product' => $product->load('category:id,category_name'),
        ], 201);
    }

    public function show(Request $request, Product $product): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'products', 'view');

        return response()->json([
            'product' => $product->load('category:id,category_name'),
        ], 200);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'products', 'update');

        $validated = $request->validate([
            'product_name' => ['nullable', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', 'exists:categories,id'],
            'sku' => ['nullable', 'string', 'max:255', Rule::unique('products', 'sku')->ignore($product->id)],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['active', 'inactive', '1', '0', 1, 0, true, false])],
        ]);

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('product-images', 'public');
        }

        $product->update(array_filter([
            'product_name' => $validated['product_name'] ?? $validated['name'] ?? null,
            'category_id' => $validated['category_id'] ?? null,
            'sku' => $validated['sku'] ?? null,
            'image' => $imagePath,
            'price' => $validated['price'] ?? null,
            'description' => array_key_exists('description', $validated) ? $validated['description'] : null,
            'status' => array_key_exists('status', $validated)
                ? $this->normalizeStatus($validated['status'])
                : null,
        ], static fn ($value) => $value !== null));

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $product->fresh()->load('category:id,category_name'),
        ], 200);
    }

    public function destroy(Request $request, Product $product): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'products', 'delete');

        $product->delete();

        return response()->json(['message' => 'Product deleted successfully'], 200);
    }

    private function normalizeStatus(mixed $status): string
    {
        return in_array($status, ['inactive', '0', 0, false], true) ? 'inactive' : 'active';
    }
}
