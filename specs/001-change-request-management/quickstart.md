# راهنمای اجرای محلی ChangeFlow Backend

این نسخه فقط Backend و HTTP API دارد؛ Frontend/React در تحویل نیست. T001 روی Windows 11 Enterprise x64 با Node `26.13.1` و `better-sqlite3@13.1.1` گذشت. شواهد نصب/driver در `docs/dependency-compatibility.md` ثبت شده‌اند و به سیستم‌های دیگر تعمیم داده نمی‌شوند.

## پیش‌نیاز و نصب

- Node `26.13.1` از runtime محلی مورد تأیید T001.
- npm `12.2.2` به‌صورت محلی در `.tools/npm-12.2.2`؛ نصب سراسری لازم نیست.
- آماده‌سازی یک‌بارهٔ این دو ابزار در `docs/local-toolchain.md` است؛ اگر مقصد از قبل هست، آن را بازنویسی نکنید.
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

متغیرهای پیکربندی از environment همان process خوانده می‌شوند و برنامه فایل `.env` را خودکار بارگذاری نمی‌کند. برای اجرای محلی، مقدارهای نمونهٔ زیر را در **هر دو** پنجرهٔ PowerShell اپراتور و server تنظیم کنید؛ مسیر key را با مسیری که در `docs/local-security.md` ساخته‌اید جایگزین کنید:

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '3000'
$env:DATABASE_PATH = Join-Path $PWD 'data\changeflow.sqlite'
$env:ALLOWED_ORIGINS = 'http://localhost:3000'
$env:TRUSTED_PROXY_ADDRESSES = ''
$env:COOKIE_SECURE = 'false' # فقط localhost روی HTTP؛ برای HTTPS برابر true
$env:LOGIN_HMAC_KEY_FILE = "$env:LOCALAPPDATA\ChangeFlow\secrets\login-hmac.key"
```

پیش از اولین اجرا، پوشهٔ تازهٔ DB را بسازید و ACL را محدود کنید. این نمونه فرض می‌کند حساب جاری هم اپراتور و هم حساب اجرای محلی سرویس است؛ اگر `data` از قبل وجود دارد، قبل از ادامه ACL آن و فایل‌های DB/WAL را بازبینی کنید و این تنظیم را کورکورانه تکرار نکنید:

```powershell
$databaseDir = Join-Path $PWD 'data'
if (-not (Test-Path -LiteralPath $databaseDir)) {
  New-Item -ItemType Directory -Path $databaseDir | Out-Null
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
  & .\scripts\Set-ChangeFlowAcl.ps1 -DatabaseDirectory $databaseDir -ServiceAccount $identity -OperatorAccount $identity
  if (-not $?) { throw 'Could not restrict database directory ACL.' }
}
```

نام و کاربرد همهٔ متغیرها و حفاظت key/DB در `docs/local-security.md` آمده است. فایل کلید و مسیر DB/WAL را با ACL فقط به حساب سرویس و اپراتور مجاز محدود کنید. Origin دقیق و proxyهای مورداعتماد را صریح تعریف کنید. HTTPS واقعی باید cookie `Secure` داشته باشد.

حساب کاربری و RoleGrant فقط با CLI محلی ساخته می‌شوند؛ ثبت‌نام عمومی یا API مدیریت کاربر وجود ندارد. دستورها و ACL در `docs/cli-provisioning.md` آمده‌اند. گذرواژه را در آرگومان process یا log قرار ندهید.

## ایجاد حساب اولیه

پس از تنظیم environment بالا در پنجرهٔ اپراتور، حساب‌ها را با CLI بسازید. گذرواژه فقط در prompt تعاملی وارد می‌شود:

```powershell
& .tools\npm-12.2.2\npm.cmd run cli -- account-create
```

برای پذیرش دستی، یک حساب مالک با نقش‌های `Requester,Reviewer` و یک حساب بررسی‌کنندهٔ مستقل با نقش `Reviewer` بسازید. ثبت‌نام عمومی یا endpoint مدیریت نقش وجود ندارد؛ توضیح grant/revoke در `docs/cli-provisioning.md` است.

## اجرای API و آزمون‌ها

```powershell
$nodeDir = "$env:LOCALAPPDATA\ChangeFlow\toolchains\node-v26.13.1-win-x64\node-v26.13.1-win-x64"
$env:PATH = "$nodeDir;$env:PATH"
& .tools\npm-12.2.2\npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "build failed: $LASTEXITCODE" }
& .tools\npm-12.2.2\npm.cmd start
```

فرمان آخر server را روی `http://127.0.0.1:3000` اجرا می‌کند؛ این پنجره را باز نگه دارید. برای آزمون‌ها در پنجرهٔ جداگانه اجرا کنید:

```powershell
$nodeDir = "$env:LOCALAPPDATA\ChangeFlow\toolchains\node-v26.13.1-win-x64\node-v26.13.1-win-x64"
$env:PATH = "$nodeDir;$env:PATH"
& .tools\npm-12.2.2\npm.cmd test
```

قرارداد API در `specs/001-change-request-management/contracts/http-api.md` و نمونه‌های قابل اجرا در `docs/api-examples.md` هستند. API از `/change-requests` و `/auth` استفاده می‌کند. همهٔ mutationها session، CSRF، Origin و مجوز جاری را بررسی می‌کنند؛ mutation درخواست role، مالکیت، وضعیت و If-Match را داخل همان transaction می‌خواند. بعد از 503/Retry-After هیچ mutation خودکار replay نمی‌شود.

## معیارهای پذیرش

شش سناریوی Assignment در `tests/acceptance/assignment/required-scenarios.test.ts` اجرا می‌شوند و پاسخ HTTP و snapshot DB را بررسی می‌کنند. تست‌های دیگر برای read scope، RequestChanges اتمی، اعتبارسنجی grapheme، نشست، CSRF، محدودسازی login، CLI، contention و role revoke در `tests/` هستند.

## نتایج واقعی تا این بازبینی

- T001 نصب clean و probe SQLite را روی محیط ثبت‌شده گذراند؛ این تست محصول نیست.
- Typecheck، Build و suite کامل پس از آخرین تغییر کد واقعاً اجرا شدند؛ جزئیات فرمان/نسخه در `docs/validation-report.md` ثبت است.
- شش سناریوی Assignment: 6/6 پاس؛ کل suite: 35/35 پاس. آزمون ACL ویندوز نیز جداگانه پاس شد.
- این نتایج مربوط به اجرای محلی ثبت‌شده‌اند و به‌معنای پذیرش انسانی یا تأیید مستقل معماری نیستند.
- راهنمای پذیرش انسانی در `docs/human-acceptance.md` است؛ هنوز پذیرش انسانی انجام نشده است.
