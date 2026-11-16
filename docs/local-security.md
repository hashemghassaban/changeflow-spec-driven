# امنیت اجرای محلی

- حساب‌های فردی و RoleGrant فقط با CLI محلی provisioning می‌شوند؛ API ثبت‌نام یا مدیریت نقش ندارد.
- فایل `LOGIN_HMAC_KEY_FILE` باید دقیقاً ۳۲ بایت تصادفی باشد و بیرون مخزن، فقط برای حساب سرویس و اپراتور قابل دسترسی باشد. نمونهٔ زیر در Windows PowerShell 5 کلید می‌سازد؛ مسیر پوشه را پیش از اجرا بررسی کنید. این نمونه فرض می‌کند همان حساب جاری اپراتور و اجرای محلی سرویس است:

  ```powershell
  $secretDir = Join-Path $env:LOCALAPPDATA 'ChangeFlow\secrets'
  if (Test-Path -LiteralPath $secretDir) { throw 'Secret directory already exists; inspect it and choose a dedicated empty directory.' }
  New-Item -ItemType Directory -Path $secretDir | Out-Null
  $keyPath = Join-Path $secretDir 'login-hmac.key'
  if (Test-Path -LiteralPath $keyPath) { throw 'Key already exists; do not overwrite it.' }
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  & .\scripts\Set-ChangeFlowAcl.ps1 -DatabaseDirectory $secretDir -ServiceAccount $identity -OperatorAccount $identity
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $bytes = New-Object byte[] 32
  try { $rng.GetBytes($bytes); [IO.File]::WriteAllBytes($keyPath, $bytes) }
  finally { $rng.Dispose(); [Array]::Clear($bytes, 0, $bytes.Length) }
  ```

  برای حساب سرویس جدا، همان نام حساب را به `-ServiceAccount` بدهید. key را در آرگومان process یا log قرار ندهید.
- پوشهٔ DB، فایل SQLite، نسخه‌های WAL و backupها هم فقط برای حساب سرویس و اپراتور محدود ACL شوند. پیش از اجرای برنامه، پوشهٔ DB را بسازید و ACL را با همان اسکریپت و حساب‌های مجاز تنظیم کنید؛ اسکریپت ACLهای قبلی را جایگزین می‌کند.
- `ALLOWED_ORIGINS` فهرست دقیق originهاست؛ wildcard و CORS عمومی مجاز نیست. `TRUSTED_PROXY_ADDRESSES` فقط آدرس‌های دقیق proxy تحت کنترل اپراتور را بپذیرد. در نبود proxy مورداعتماد، IP از socket مستقیم خوانده شود.
- توسعهٔ localhost می‌تواند cookie غیر Secure داشته باشد؛ استقرار HTTPS باید TLS و cookie `Secure` را فعال کند.
- `.env.example` فقط نام متغیرها و مقادیر غیرمحرمانه دارد. secret واقعی، password، session id و CSRF token در مخزن/log قرار نگیرد.
- HMAC key را در محیط اجرای process از مسیر فایل خارج مخزن بخوانید؛ ACL فایل را به کاربر سرویس محدود کنید. تغییر کلید شمارنده‌های login را از دسترس خارج می‌کند و باید عملیات کنترل‌شدهٔ اپراتور باشد.
