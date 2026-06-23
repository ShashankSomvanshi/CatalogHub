<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'somvanshishashank29@gmail.com'],
            [
                'name' => 'Shashank Admin',
                'email' => 'somvanshishashank29@gmail.com',
                'phone_no' => null,
                'profile_image' => null,
                'role' => 'admin',
                'role_id' => 1,
                'status' => 'active',
                'password' => Hash::make('Shashank@123'),
            ]
        );
    }
}
