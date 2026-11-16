# راهنمای اجرای محلی ChangeFlow Backend

این نسخه فقط Backend و HTTP API دارد؛ Frontend/React در تحویل نیست. T001 روی Windows 11 Enterprise x64 با Node `26.13.1` و `better-sqlite3@13.1.1` گذشت. شواهد نصب/driver در `docs/dependency-compatibility.md` ثبت شده‌اند و به سیستم‌های دیگر تعمیم داده نمی‌شوند.

## پیش‌نیاز و نصب

- Node `26.13.1` از runtime محلی مورد تأیید T001.
- npm `12.2.2` به‌صورت محلی در `.tools/npm-12.2.2`؛ نصب سراسری لازم نیست.
- از PowerShell در ریشهٔ مخزن:

```powershell
$nodeDir = "$env:LOCALAPPDATA\ChangeFlow\toolchains\node-v26.13.1-win-x64\node-v26.13.1-win-x64"
$oldPath = $env:PATH
$oldPrefix = $env:NPM_CONFIG_PREFIX
$oldCache = $env:NPM_CONFIG_CACHE
try {
  $env:PATH = "$nodeDir;$oldPath"
  $env:NPM_CONFIG_PREFIX = (Resolve-Path .tools\npm-12.2.2).Path
  $env:NPM_CONFIG_CACHE = (Join-Path $PWD '.tools\npm-cache')
  & .tools\npm-12.2.2\npm.cmd ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw "npm ci failed: $LASTEXITCODE" }
  & .tools\npm-12.2.2\npm.cmd run typecheck
  if ($LASTEXITCODE -ne 0) { throw "typecheck failed: $LASTEXITCODE" }
  & .tools\npm-12.2.2\npm.cmd test
  if ($LASTEXITCODE -ne 0) { throw "tests failed: $LASTEXITCODE" }
} finally {
  $env:PATH = $oldPath
  $env:NPM_CONFIG_PREFIX = $oldPrefix
  $env:NPM_CONFIG_CACHE = $oldCache
}
```

npm 12 با `allowScripts: {}` lifecycle وابستگی‌های تأییدنشده را مسدود می‌کند؛ `better-sqlite3` از prebuild خودش بارگذاری شده است. در Node/npm متفاوت، قبل از استفاده lockfile و native binding را دوباره بررسی کنید.

## پیکربندی امن

متغیر `LOGIN_HMAC_KEY_FILE` باید به فایل دقیقاً ۳۲ بایتی تصادفی در مسیری خارج مخزن اشاره کند. فایل کلید و مسیر DB/WAL را با ACL فقط به حساب سرویس و اپراتور مجاز محدود کنید (`docs/local-security.md`). تنظیمات را به environment همان process بدهید؛ برنامه فایل `.env` را خودکار بارگذاری نمی‌کند. Origin دقیق و proxyهای مورداعتماد را صریح تعریف کنید. HTTPS واقعی باید cookie `Secure` داشته باشد.

حساب کاربری و RoleGrant فقط با CLI محلی ساخته می‌شوند؛ ثبت‌نام عمومی یا API مدیریت کاربر وجود ندارد. دستورها و ACL در `docs/cli-provisioning.md` آمده‌اند. گذرواژه را در آرگومان process یا log قرار ندهید.

## اجرای API و آزمون‌ها

```powershell
& .tools\npm-12.2.2\npm.cmd run build
& .tools\npm-12.2.2\npm.cmd test
& .tools\npm-12.2.2\npm.cmd run cli -- account-create
```

API از مسیر resource-oriented `/change-requests` و `/auth` ارائه می‌شود. همهٔ mutationها session، CSRF، Origin و مجوز جاری را بررسی می‌کنند؛ تغییر درخواست role، مالکیت، وضعیت و If-Match را داخل همان transaction می‌خواند. بعد از 503/Retry-After هیچ mutation خودکار replay نمی‌شود.

## معیارهای پذیرش

شش سناریوی Assignment در `tests/acceptance/assignment/required-scenarios.test.ts` اجرا می‌شوند و پاسخ HTTP و snapshot DB را بررسی می‌کنند. تست‌های دیگر برای read scope، RequestChanges اتمی، اعتبارسنجی grapheme، نشست، CSRF، محدودسازی login، CLI، contention و role revoke در `tests/` هستند.

## نتایج واقعی تا این بازبینی

- T001 نصب clean و probe SQLite را روی محیط ثبت‌شده گذراند؛ این تست محصول نیست.
- Typecheck، Build و suite کامل پس از آخرین تغییر کد واقعاً اجرا شدند؛ جزئیات فرمان/نسخه در `docs/validation-report.md` ثبت است.
- شش سناریوی Assignment: 6/6 پاس؛ کل suite: 35/35 پاس. آزمون ACL ویندوز نیز جداگانه پاس شد.
- این نتایج مربوط به اجرای محلی ثبت‌شده‌اند و به‌معنای پذیرش انسانی یا تأیید مستقل معماری نیستند.
- Build/Test به معنی پذیرش انسانی یا تأیید معماری نیست.
