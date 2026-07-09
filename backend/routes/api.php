<?php

use App\Http\Controllers\Admin\CategoryController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\ModulePermissionController;
use App\Http\Controllers\Admin\ProductController;
use App\Http\Controllers\Admin\ProfileController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\SubAdminController;
use App\Http\Controllers\Admin\SubAdminPermissionController;
use App\Http\Controllers\Admin\TransactionController;
use App\Http\Controllers\Admin\UserManagementController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\CartController;
use App\Http\Controllers\CheckoutController;
use App\Http\Controllers\CustomerOrderController;
use App\Http\Controllers\StripeWebhookController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [RegisterController::class, 'register']);
Route::post('/login', [AuthController::class, 'apiLogin']);
Route::post('/admin/login', [AuthController::class, 'apiAdminLogin']);
Route::post('/token/refresh', [AuthController::class, 'refreshToken']);
Route::get('/categories', [CategoryController::class, 'publicIndex']);
Route::get('/categories/{category}/products', [ProductController::class, 'publicByCategory']);
Route::get('/products', [ProductController::class, 'publicIndex']);
Route::get('/products/all', [ProductController::class, 'publicAll']);
Route::get('/products/{product}', [ProductController::class, 'publicShow']);
Route::post('/checkout/place-order', [CheckoutController::class, 'store']);
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle']);
Route::get('/stripe/checkout-status', [StripeWebhookController::class, 'status']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'apiLogout']);
    Route::post('/checkout/place-order-authenticated', [CheckoutController::class, 'store']);
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::post('/profile', [ProfileController::class, 'update']);
    Route::get('/cart', [CartController::class, 'show']);
    Route::get('/my-orders', [CustomerOrderController::class, 'index']);
    Route::put('/cart', [CartController::class, 'sync']);
    Route::post('/cart/items', [CartController::class, 'storeItem']);
    Route::patch('/cart/items/{cartItem}', [CartController::class, 'updateItem']);
    Route::delete('/cart/items/{cartItem}', [CartController::class, 'destroyItem']);

    Route::get('/admin/dashboard', [DashboardController::class, 'index']);
    Route::get('/admin/profile', [ProfileController::class, 'show']);
    Route::post('/admin/profile', [ProfileController::class, 'update']);
    Route::middleware('admin.access:users')->group(function () {
        Route::get('/admin/users', [UserManagementController::class, 'index']);
        Route::post('/admin/users', [UserManagementController::class, 'store']);
        Route::put('/admin/users/{user}', [UserManagementController::class, 'update']);
        Route::delete('/admin/users/{user}', [UserManagementController::class, 'destroy']);
    });
    Route::get('/admin/roles', [RoleController::class, 'index']);
    Route::get('/admin/sub-admin-roles', [RoleController::class, 'subAdminRoles']);
    Route::post('/admin/sub-admin-roles', [RoleController::class, 'storeSubAdminRole']);
    Route::get('/admin/sub-admin-roles/{subAdminRole}', [RoleController::class, 'showSubAdminRole']);
    Route::put('/admin/sub-admin-roles/{subAdminRole}', [RoleController::class, 'updateSubAdminRole']);
    Route::delete('/admin/sub-admin-roles/{subAdminRole}', [RoleController::class, 'destroySubAdminRole']);
    Route::get('/admin/role-modules', [ModulePermissionController::class, 'index']);
    Route::get('/admin/sub-admin-roles/{subAdminRole}/permissions', [ModulePermissionController::class, 'show']);
    Route::put('/admin/sub-admin-roles/{subAdminRole}/permissions', [ModulePermissionController::class, 'update']);
    Route::get('/admin/sub-admins', [SubAdminController::class, 'index']);
    Route::post('/admin/sub-admins', [SubAdminController::class, 'store']);
    Route::get('/admin/sub-admins/{subAdmin}', [SubAdminController::class, 'show']);
    Route::put('/admin/sub-admins/{subAdmin}', [SubAdminController::class, 'update']);
    Route::delete('/admin/sub-admins/{subAdmin}', [SubAdminController::class, 'destroy']);
    Route::get('/admin/sub-admins/{subAdmin}/permissions', [SubAdminPermissionController::class, 'show']);
    Route::put('/admin/sub-admins/{subAdmin}/permissions', [SubAdminPermissionController::class, 'update']);
    Route::get('/admin/categories', [CategoryController::class, 'index']);
    Route::post('/admin/categories', [CategoryController::class, 'store']);
    Route::post('/admin/category', [CategoryController::class, 'store']);
    Route::put('/admin/categories/{category}', [CategoryController::class, 'update']);
    Route::put('/admin/category/{category}', [CategoryController::class, 'update']);
    Route::delete('/admin/categories/{category}', [CategoryController::class, 'destroy']);
    Route::delete('/admin/category/{category}', [CategoryController::class, 'destroy']);
    Route::get('/admin/products', [ProductController::class, 'index']);
    Route::post('/admin/products', [ProductController::class, 'store']);
    Route::get('/admin/products/{product}', [ProductController::class, 'show']);
    Route::put('/admin/products/{product}', [ProductController::class, 'update']);
    Route::delete('/admin/products/{product}', [ProductController::class, 'destroy']);
    Route::middleware('admin.access:transactions')->group(function () {
        Route::get('/admin/transactions', [TransactionController::class, 'index']);
        Route::get('/admin/transactions/{transaction}', [TransactionController::class, 'show']);
    });
});
