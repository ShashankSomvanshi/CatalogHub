<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin Forgot Password</title>
</head>
<body style="font-family: Arial, sans-serif; background:#111827; color:#fff; display:grid; place-items:center; min-height:100vh; margin:0;">
    <div style="width:min(440px, 92vw); background:#1f2937; padding:24px; border-radius:16px; box-shadow:0 12px 30px rgba(0,0,0,0.35);">
        <h2 style="margin-top:0;">Admin Forgot Password</h2>
        <p style="color:#cbd5e1;">Enter your admin email and we will send the reset link.</p>
        <form method="POST" action="{{ route('admin.password.email') }}">
            @csrf
            <label style="display:block; margin-bottom:8px;">Email</label>
            <input type="email" name="email" required style="width:100%; box-sizing:border-box; padding:10px; border-radius:8px; border:1px solid #374151; margin-bottom:12px;">
            <button type="submit" style="width:100%; padding:10px; border-radius:8px; border:none; background:#10b981; color:#fff; font-weight:700; cursor:pointer;">Send Reset Link</button>
        </form>
    </div>
</body>
</html>
