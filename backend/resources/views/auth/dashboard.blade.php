<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>User Dashboard</title>
</head>
<body style="font-family: Arial, sans-serif; background:#0f172a; color:#fff; min-height:100vh; margin:0; padding:24px;">
    <h1>User Dashboard</h1>
    <p>Welcome, {{ auth()->user()->name ?? auth()->user()->email }}.</p>
    <form method="POST" action="{{ route('logout') }}">
        @csrf
        <button type="submit">Logout</button>
    </form>
</body>
</html>
