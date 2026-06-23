<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_login_page_is_available_at_admin_route(): void
    {
        $response = $this->get('/admin');

        $response->assertStatus(200)
            ->assertSee('Admin Login');
    }

    public function test_admin_can_login_with_admin_role(): void
    {
        User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'role' => 'admin',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->post('/admin', [
            'email' => 'admin@example.com',
            'password' => 'password123',
        ]);

        $response->assertRedirect('/admin/dashboard');
        $this->assertTrue(auth('admin')->check());
        $this->assertEquals('admin@example.com', auth('admin')->user()->email);
    }

    public function test_user_can_login_and_logout(): void
    {
        User::factory()->create([
            'email' => 'user@example.com',
            'role' => 'user',
            'password' => Hash::make('password123'),
        ]);

        $response = $this->post('/login', [
            'email' => 'user@example.com',
            'password' => 'password123',
        ]);

        $response->assertRedirect('/dashboard');
        $this->assertTrue(auth()->check());

        $this->post('/logout')->assertRedirect('/');
        $this->assertFalse(auth()->check());
    }
}
