<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>User Login</title>
</head>
<body style="font-family: Arial, sans-serif; background:#0f172a; color:#fff; display:grid; place-items:center; min-height:100vh; margin:0;">
    <div style="width:min(440px, 92vw); background:#111827; padding:24px; border-radius:16px; box-shadow:0 12px 30px rgba(0,0,0,0.35);">
        <h2 style="margin-top:0;">User Login</h2>
        <p style="color:#cbd5e1;">Use your user account to sign in.</p>

        @if($errors->any())
            <div style="background:#7f1d1d; color:#fecaca; padding:10px; border-radius:10px; margin-bottom:12px;">{{ $errors->first() }}</div>
        @endif

        <form method="POST" action="{{ url('/login') }}">
            @csrf
            <label style="display:block; margin-bottom:8px;">Email</label>
            <input type="email" name="email" required style="width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #374151; margin-bottom:12px;">

            <label style="display:block; margin-bottom:8px;">Password</label>
            <input type="password" name="password" required style="width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #374151; margin-bottom:12px;">

            <button type="submit" style="width:100%; padding:10px; border-radius:8px; border:none; background:#2563eb; color:#fff; font-weight:700; cursor:pointer;">Login</button>
        </form>

        <p style="margin-top:14px; color:#cbd5e1;">Need an admin login? <a href="{{ url('/admin') }}" style="color:#93c5fd;">Admin login</a></p>
        <p style="margin-top:8px;"><a href="{{ url('/forgot-password') }}" style="color:#93c5fd;">Forgot password?</a></p>
    </div>
</body>
</html>
