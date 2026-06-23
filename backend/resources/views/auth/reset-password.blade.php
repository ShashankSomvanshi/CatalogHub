<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reset Password</title>
</head>
<body style="font-family: Arial, sans-serif; background:#0f172a; color:#fff; display:grid; place-items:center; min-height:100vh; margin:0;">
    <div style="width:min(440px, 92vw); background:#111827; padding:24px; border-radius:16px; box-shadow:0 12px 30px rgba(0,0,0,0.35);">
        <h2 style="margin-top:0;">Reset Password</h2>
        <form method="POST" action="{{ route('password.update') }}">
            @csrf
            <input type="hidden" name="token" value="{{ $token }}">
            <label style="display:block; margin-bottom:8px;">Email</label>
            <input type="email" name="email" required style="width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #374151; margin-bottom:12px;">
            <label style="display:block; margin-bottom:8px;">New Password</label>
            <input type="password" name="password" required style="width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #374151; margin-bottom:12px;">
            <label style="display:block; margin-bottom:8px;">Confirm Password</label>
            <input type="password" name="password_confirmation" required style="width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #374151; margin-bottom:12px;">
            <button type="submit" style="width:100%; padding:10px; border-radius:8px; border:none; background:#2563eb; color:#fff; font-weight:700; cursor:pointer;">Reset Password</button>
        </form>
    </div>
</body>
</html>
