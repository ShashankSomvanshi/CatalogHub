<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin Dashboard</title>
</head>
<body style="font-family: Arial, sans-serif; background:#111827; color:#fff; min-height:100vh; margin:0; padding:24px;">
    <h1>Hello Admin</h1>
    <p>Welcome, {{ auth('admin')->user()->name ?? auth('admin')->user()->email }}.</p>
    <form method="POST" action="{{ route('admin.logout') }}">
        @csrf
        <button type="submit">Admin Logout</button>
    </form>
</body>
</html>
