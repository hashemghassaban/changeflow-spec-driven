# آماده‌سازی toolchain محلی Windows

این راهنما برای محیطی است که Node یا npm محلی ChangeFlow را هنوز ندارد. نصب سراسری لازم نیست. مسیرهای موجود را بازنویسی نکنید؛ اگر هر مقصد از قبل وجود دارد، آن را بررسی و مسیر اختصاصی دیگری انتخاب کنید. hash Node همان مقدار ثبت‌شده در `docs/dependency-compatibility.md` است.

## دریافت Node دقیق

```powershell
$toolRoot = Join-Path $env:LOCALAPPDATA 'ChangeFlow\toolchains'
New-Item -ItemType Directory -Force -Path $toolRoot | Out-Null
$archive = Join-Path $toolRoot 'node-v26.13.1-win-x64.zip'
$extractRoot = Join-Path $toolRoot 'node-v26.13.1-win-x64'
if ((Test-Path -LiteralPath $archive) -or (Test-Path -LiteralPath $extractRoot)) { throw 'Node destination already exists; inspect it and choose a fresh path.' }
Invoke-WebRequest -Uri 'https://nodejs.org/dist/v26.13.1/node-v26.13.1-win-x64.zip' -OutFile $archive
$actual = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant()
$expected = 'e2edda75bfb089654705cf65a13b58933bfd5f57148e8ebda916f58a2474f1f7'
if ($actual -ne $expected) { throw "Node archive SHA-256 mismatch: $actual" }
Expand-Archive -LiteralPath $archive -DestinationPath $extractRoot
$nodeDir = Join-Path $extractRoot 'node-v26.13.1-win-x64'
& (Join-Path $nodeDir 'node.exe') --version
```

خروجی نسخه باید `v26.13.1` باشد. hash فقط برای همین ZIP رسمی Windows x64 معتبر است.

## آماده‌سازی npm محلی

Node ZIP یک npm bootstrap دارد. آن را فقط برای دریافت tarball رسمی npm استفاده کنید؛ سپس خود npm `12.2.2` را زیر `.tools` مخزن قرار دهید:

```powershell
$env:PATH = "$nodeDir;$env:PATH"
$npmRoot = Join-Path $PWD '.tools\npm-12.2.2'
$stage = Join-Path $env:TEMP ('changeflow-npm-bootstrap-' + [guid]::NewGuid().ToString('N'))
if (Test-Path -LiteralPath $npmRoot) { throw 'Local npm destination exists; inspect it and do not overwrite it.' }
New-Item -ItemType Directory -Path $stage | Out-Null
& (Join-Path $nodeDir 'npm.cmd') pack npm@12.2.2 --registry=https://registry.npmjs.org --pack-destination $stage
if ($LASTEXITCODE -ne 0) { throw "npm pack failed: $LASTEXITCODE" }
$tarball = Join-Path $stage 'npm-12.2.2.tgz'
tar.exe -xzf $tarball -C $stage
New-Item -ItemType Directory -Path (Join-Path $npmRoot 'node_modules') -Force | Out-Null
Move-Item -LiteralPath (Join-Path $stage 'package') -Destination (Join-Path $npmRoot 'node_modules\npm')
Copy-Item -LiteralPath (Join-Path $nodeDir 'npm.cmd') -Destination (Join-Path $npmRoot 'npm.cmd')
& (Join-Path $npmRoot 'npm.cmd') --version
```

نسخهٔ خروجی باید `12.2.2` باشد. `npm pack` tarball نسخه‌دار را از registry رسمی با integrity همان registry دریافت می‌کند؛ bootstrap در مسیر محلی انجام می‌شود و npm سراسری نصب نمی‌کند. اگر دریافت شبکه شکست خورد، تنظیم proxy/شبکه را بررسی کنید؛ به نسخهٔ دیگری تغییر ندهید.

بعد از آماده‌سازی toolchain، نصب پروژه را طبق `specs/001-change-request-management/quickstart.md` با `npm ci` و lockfile اجرا کنید. نسخه‌های دیگر، معماری‌های دیگر و محیط استقرار باید جداگانه بررسی شوند.
