<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAdminAccess;
use App\Http\Controllers\Admin\Concerns\PaginatesAdminTables;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    use AuthorizesAdminAccess, PaginatesAdminTables;

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

        $query = Product::with('category:id,category_name')
            ->select('id', 'product_name', 'category_id', 'sku', 'image', 'price', 'description', 'status', 'created_at');
        foreach ($this->searchTerms($request) as $term) {
            $query->where(fn ($search) => $search
                ->whereRaw('LOWER(product_name) LIKE ?', ["%{$term}%"])
                ->orWhereRaw('LOWER(sku) LIKE ?', ["%{$term}%"])
                ->orWhereRaw('LOWER(description) LIKE ?', ["%{$term}%"])
                ->orWhereRaw('LOWER(status) LIKE ?', ["%{$term}%"])
                ->orWhere('price', 'like', "%{$term}%")
                ->orWhereHas('category', fn ($category) => $category->whereRaw('LOWER(category_name) LIKE ?', ["%{$term}%"])));
        }
        foreach ($this->fieldSearchTerms($request, 'product_search') as $term) {
            $query->whereRaw('LOWER(product_name) LIKE ?', ["%{$term}%"]);
        }
        foreach ($this->fieldSearchTerms($request, 'category_search') as $term) {
            $query->whereHas('category', fn ($category) => $category->whereRaw('LOWER(category_name) LIKE ?', ["%{$term}%"]));
        }
        foreach ($this->fieldSearchTerms($request, 'sku_search') as $term) {
            $query->whereRaw('LOWER(sku) LIKE ?', ["%{$term}%"]);
        }
        $direction = $request->input('direction') === 'asc' ? 'asc' : 'desc';
        if ($request->input('sort') === 'category') {
            $query->orderBy(Category::select('category_name')->whereColumn('categories.id', 'products.category_id'), $direction);
        } else {
            $sort = ['id' => 'id', 'product' => 'product_name', 'description' => 'description', 'price' => 'price', 'sku' => 'sku'][$request->input('sort')] ?? 'created_at';
            $query->orderBy($sort, $direction);
        }
        $products = $query->paginate($this->perPage($request));

        return response()->json(['products' => $products->items(), 'meta' => $this->paginationMeta($products)], 200);
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

    private function fieldSearchTerms(Request $request, string $field): array
    {
        preg_match_all('/"([^"]+)"|(\S+)/', strtolower(trim((string) $request->input($field, ''))), $matches);

        return array_values(array_filter(array_map(
            static fn ($phrase, $word) => $phrase !== '' ? $phrase : $word,
            $matches[1] ?? [],
            $matches[2] ?? []
        )));
    }
}
