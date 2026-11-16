# گزارش اجرای واقعی اعتبارسنجی

تاریخ اجرا: 2026-11-16 (Windows local)

## محیط

- Windows 11 Enterprise x64
- Node.js `v26.13.1` از runtime محلی T001
- npm `12.2.2` محلی؛ driver SQLite `better-sqlite3@13.1.1`
- Node از مسیر صریح toolchain محلی اجرا شد؛ نصب سراسری یا تغییر تنظیمات سیستم انجام نشد.

## فرمان‌ها و نتایج

فرمان‌های npm با `npm.cmd` محلی و PATH محدود به process اجرا شدند:

| فرمان | نتیجه |
|---|---|
| `.tools/npm-12.2.2/npm.cmd --version` | خروجی `12.2.2`، exit code `0` |
| `.tools/npm-12.2.2/npm.cmd run typecheck` | موفق، exit code `0` |
| `.tools/npm-12.2.2/npm.cmd run build` | موفق، exit code `0` |
| `.tools/npm-12.2.2/npm.cmd test` | موفق، exit code `0`; build و 35 آزمون، 35 پاس، 0 شکست، 0 skip |
| `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/windows/acl-provisioning.ps1` | موفق، exit code `0`; ACL idempotent، inheritance محافظت‌شده و principal عمومی فاقد دسترسی بود |

Suite شامل شش سناریوی Assignment، آزمون‌های HTTP و ذخیره‌سازی، رقابت دو process/connection، ترتیب لغو RoleGrant، contention و `SQLITE_BUSY`، نشست/CSRF، محدودسازی login، CLI و آزمون‌های واحد است.

## مرز شواهد

- T001 و شواهد سازگاری محلی جداگانه در `docs/dependency-compatibility.md` ثبت شده‌اند؛ این‌ها تضمین سازگاری همهٔ سیستم‌ها نیستند.
- این گزارش نتیجهٔ اجرای محلی typecheck/build/test است؛ پذیرش انسانی، Analyze مستقل یا تأیید معماری را ادعا نمی‌کند.
- تست‌های frontend وجود ندارند چون تصمیم محصولی جاری نسخهٔ Backend-only است.
