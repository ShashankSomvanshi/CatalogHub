<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\ApiRefreshToken;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Illuminate\View\View;

class AuthController extends Controller
{
    private const ACCESS_TOKEN_MINUTES = 60;
    private const REFRESH_TOKEN_DAYS = 7;

    public function apiLogin(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $credentials['email'])->first();
        $isUser = $user && ($user->role === 'user' || (int) $user->role_id === 3);

        if (! $user || ! Hash::check($credentials['password'], $user->password) || ! $isUser) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        if (($user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Your account is inactive.'], 403);
        }

        return response()->json(array_merge([
            'message' => 'Hello ' . $user->name,
        ], $this->issueTokenPayload($user, 'cataloghub-user')));
    }

    public function apiAdminLogin(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::with('subAdminRole.modules')->where('email', $credentials['email'])->first();
        $isAdminUser = $user && (
            $user->role === 'admin'
            || $user->role === 'sub_admin'
            || in_array((int) $user->role_id, [1, 2], true)
        );

        if (! $user || ! Hash::check($credentials['password'], $user->password) || ! $isAdminUser) {
            return response()->json(['message' => 'Invalid admin credentials'], 401);
        }

        if (($user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Your account is inactive.'], 403);
        }

        return response()->json(array_merge([
            'message' => 'Hello ' . $user->name,
        ], $this->issueTokenPayload($user, 'admin-token')));
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()]);
    }

    public function apiLogout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($request->filled('refresh_token')) {
            ApiRefreshToken::where('user_id', $user->id)
                ->where('token_hash', $this->hashRefreshToken($request->string('refresh_token')->toString()))
                ->update(['revoked_at' => now()]);
        } else {
            $user->apiRefreshTokens()->whereNull('revoked_at')->update(['revoked_at' => now()]);
        }

        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function refreshToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'refresh_token' => ['required', 'string'],
        ]);

        $refreshToken = ApiRefreshToken::with('user.subAdminRole.modules')
            ->where('token_hash', $this->hashRefreshToken($validated['refresh_token']))
            ->whereNull('revoked_at')
            ->first();

        if (! $refreshToken || $refreshToken->expires_at->isPast()) {
            return response()->json(['message' => 'Refresh token expired. Please login again.'], 401);
        }

        $user = $refreshToken->user;

        if (! $user || ($user->status ?? 'active') !== 'active') {
            return response()->json(['message' => 'Your session is no longer active.'], 401);
        }

        $refreshToken->update([
            'last_used_at' => now(),
            'revoked_at' => now(),
        ]);

        $tokenName = in_array((int) $user->role_id, [1, 2], true) || in_array($user->role, ['admin', 'sub_admin'], true)
            ? 'admin-token'
            : 'cataloghub-user';

        return response()->json(array_merge([
            'message' => 'Token refreshed successfully',
        ], $this->issueTokenPayload($user, $tokenName)));
    }

    private function issueTokenPayload(User $user, string $tokenName): array
    {
        $accessExpiresAt = CarbonImmutable::now()->addMinutes(self::ACCESS_TOKEN_MINUTES);
        $refreshExpiresAt = CarbonImmutable::now()->addDays(self::REFRESH_TOKEN_DAYS);
        $accessToken = $user->createToken($tokenName, ['*'], $accessExpiresAt)->plainTextToken;
        $refreshToken = Str::random(80);

        $user->apiRefreshTokens()->create([
            'token_hash' => $this->hashRefreshToken($refreshToken),
            'expires_at' => $refreshExpiresAt,
        ]);

        return [
            'access_token' => $accessToken,
            'token_type' => 'Bearer',
            'expires_in' => self::ACCESS_TOKEN_MINUTES * 60,
            'access_token_expires_at' => $accessExpiresAt->toIso8601String(),
            'refresh_token' => $refreshToken,
            'refresh_token_expires_at' => $refreshExpiresAt->toIso8601String(),
            'user' => $this->userPayload($user->fresh('subAdminRole.modules')),
        ];
    }

    private function userPayload(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'role_id' => $user->role_id,
            'sub_role_id' => $user->sub_role_id,
            'status' => $user->status ?? 'active',
            'permissions' => $user->resolvedModulePermissions(),
        ];
    }

    private function hashRefreshToken(string $refreshToken): string
    {
        return hash('sha256', $refreshToken);
    }

    public function showUserLoginForm(): View
    {
        return view('auth.login', ['pageTitle' => 'User Login']);
    }

    public function showAdminLoginForm(): View
    {
        return view('auth.admin-login', ['pageTitle' => 'Admin Login']);
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $credentials['role'] = 'user';

        if (Auth::attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();

            return redirect()->intended('/dashboard');
        }

        throw ValidationException::withMessages([
            'email' => __('These credentials do not match our records.'),
        ]);
    }

    public function loginAdmin(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required'],
        ]);

        $credentials['role'] = 'admin';

        if (Auth::guard('admin')->attempt($credentials, $request->boolean('remember'))) {
            $request->session()->regenerate();

            return redirect()->intended('/admin/dashboard');
        }

        throw ValidationException::withMessages([
            'email' => __('These credentials do not match our records.'),
        ]);
    }

    public function dashboard(): View
    {
        return view('auth.dashboard');
    }

    public function adminDashboard(): View
    {
        return view('auth.admin-dashboard');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    public function adminLogout(Request $request): RedirectResponse
    {
        Auth::guard('admin')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    public function showForgotPassword(): View
    {
        return view('auth.forgot-password');
    }

    public function showAdminForgotPassword(): View
    {
        return view('auth.admin-forgot-password');
    }

    public function sendPasswordResetLink(Request $request): RedirectResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::RESET_LINK_SENT
            ? back()->with('status', __($status))
            : back()->withErrors(['email' => __($status)]);
    }

    public function sendAdminPasswordResetLink(Request $request): RedirectResponse
    {
        return $this->sendPasswordResetLink($request);
    }

    public function showResetPasswordForm(string $token): View
    {
        return view('auth.reset-password', ['token' => $token]);
    }

    public function resetPassword(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', 'min:8'],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->setRememberToken(str()->random(60));

                $user->save();
            }
        );

        return $status === Password::PASSWORD_RESET
            ? redirect()->route('login')->with('status', __($status))
            : back()->withErrors(['email' => __($status)]);
    }
}
