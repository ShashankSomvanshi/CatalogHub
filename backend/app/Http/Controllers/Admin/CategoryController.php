<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAdminAccess;
use App\Http\Controllers\Admin\Concerns\PaginatesAdminTables;
use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    use AuthorizesAdminAccess, PaginatesAdminTables;

    public function publicIndex(): JsonResponse
    {
        $categories = Category::select('id', 'category_name')
            ->where('status', 'active')
            ->latest()
            ->limit(6)
            ->get();

        return response()->json(['categories' => $categories]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'categories', 'view');

        $query = Category::select('id', 'category_name', 'status', 'created_at');
        foreach ($this->searchTerms($request) as $term) {
            $query->where(fn ($search) => $search
                ->whereRaw('LOWER(category_name) LIKE ?', ["%{$term}%"])
                ->orWhereRaw('LOWER(status) LIKE ?', ["%{$term}%"])
                ->orWhere('id', 'like', "%{$term}%"));
        }
        $sort = ['id' => 'id', 'name' => 'category_name', 'created' => 'created_at'][$request->input('sort')] ?? 'created_at';
        $categories = $query->orderBy($sort, $request->input('direction') === 'asc' ? 'asc' : 'desc')->paginate($this->perPage($request));

        return response()->json(['categories' => $categories->items(), 'meta' => $this->paginationMeta($categories)], 200);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'categories', 'create');

        $validated = $request->validate([
            'category_name' => ['nullable', 'string', 'max:255', 'required_without:name'],
            'name' => ['nullable', 'string', 'max:255', 'required_without:category_name'],
            'status' => ['nullable', Rule::in(['active', 'inactive', '1', '0', 1, 0, true, false])],
        ]);

        $category = Category::create([
            'category_name' => $validated['category_name'] ?? $validated['name'],
            'status' => $this->normalizeStatus($validated['status'] ?? 'active'),
        ]);

        return response()->json([
            'message' => 'Category created successfully',
            'category' => $category,
        ], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'categories', 'update');

        $validated = $request->validate([
            'category_name' => ['nullable', 'string', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', Rule::in(['active', 'inactive', '1', '0', 1, 0, true, false])],
        ]);

        $category->update(array_filter([
            'category_name' => $validated['category_name'] ?? $validated['name'] ?? null,
            'status' => array_key_exists('status', $validated)
                ? $this->normalizeStatus($validated['status'])
                : null,
        ], static fn ($value) => $value !== null));

        return response()->json([
            'message' => 'Category updated successfully',
            'category' => $category->fresh(),
        ], 200);
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        $this->ensureAdminOrPermission($request, 'categories', 'delete');

        $category->delete();

        return response()->json(['message' => 'Category deleted successfully'], 200);
    }

    private function normalizeStatus(mixed $status): string
    {
        return in_array($status, ['inactive', '0', 0, false], true) ? 'inactive' : 'active';
    }
}
