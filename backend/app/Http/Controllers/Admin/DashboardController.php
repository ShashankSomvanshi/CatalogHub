<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\AuthorizesAdminAccess;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use AuthorizesAdminAccess;

    public function index(Request $request): JsonResponse
    {
        if (! $this->isFullAdmin($request->user()) && ! $this->isSubAdmin($request->user())) {
            abort(403, 'Only admin or sub admin can view dashboard data.');
        }

        $recentUsers = User::with('roleRelation:id,name')
            ->select('id', 'name', 'email', 'phone_no', 'role', 'role_id', 'status', 'created_at')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone_no' => $user->phone_no,
                'role' => $user->role,
                'role_name' => optional($user->roleRelation)->name,
                'status' => $user->status,
                'created_at' => $user->created_at,
            ]);

        $recentProducts = Product::with('category:id,category_name')
            ->select('id', 'product_name', 'category_id', 'sku', 'price', 'status', 'created_at')
            ->latest()
            ->limit(10)
            ->get();

        return response()->json([
            'totals' => [
                'users' => User::count(),
                'categories' => Category::count(),
                'products' => Product::count(),
            ],
            'recent_users' => $recentUsers,
            'recent_products' => $recentProducts,
        ], 200);
    }

}
