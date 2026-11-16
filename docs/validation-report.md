# گزارش اجرای واقعی اعتبارسنجی

تاریخ اجرا: 2026-11-16 (Windows local)

## وضعیت تحویل

پیاده‌سازی و آزمون‌های فنی طبق نتایج اجرای ثبت‌شده تکمیل‌اند؛ پذیرش انسانی باز است و نصب آنلاین هنوز تأیید نشده است. اجرای clean موفق در کپی جداگانه با cache محلی و حالت offline بود؛ تلاش آنلاین به `ECONNRESET` رسید.

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

## بازبینی مستقل در کپی تمیز

- در کپی موقت اول، `npm ci --no-audit --no-fund --foreground-scripts` با `ECONNRESET` از `registry.npmjs.org` و exit code `1` شکست خورد؛ npm هنگام پاک‌سازی `node_modules` موقت نیز warningهای `EPERM` داد. این فایل‌ها فقط در کپی موقت بودند و منبع کاری تغییر نکرد.
- در کپی موقت تازه و بدون `node_modules`، با cache محلی موجود، فرمان `.tools/npm-12.2.2/npm.cmd ci --offline --no-audit --no-fund` از مسیر اجرایی مطلق `C:\Users\Dotin\Desktop\change-flow\.tools\npm-12.2.2\npm.cmd` اجرا شد؛ working directory کپی موقت بود. ۱۰۸ بسته نصب شدند و exit code `0` بود. npm گزارش کرد install script مربوط به `better-sqlite3@13.1.1` به‌دلیل `allowScripts: {}` اجرا نشد؛ آزمون‌های API عمومی driver را در همین نصب بارگذاری و استفاده کردند.
- در همان کپی موقت: `npm run typecheck`, `npm run build` و `npm test` هر سه exit code `0`؛ suite برابر ۳۵ پاس، صفر شکست و صفر skip بود.
- فایل‌های کاری اصلی برای این نصب استفاده یا تغییر داده نشدند. کپی‌ها زیر `%TEMP%\changeflow-final-review-*` ساخته شدند.
- پذیرش انسانی اجرا نشده است؛ راهنمای آن در `docs/human-acceptance.md` قرار دارد.

### بازاجرای نهایی پس از اصلاح مرز Controller/Application

- کپی تازه: `%TEMP%\changeflow-review-final-9f77129ae5fc4560bf0ebd7846b505d4`؛ `.git`, `.tools`, `node_modules`, `dist` و `coverage` از کپی خارج بودند. نصب از lockfile در کپی با cache محلی از قبل موجود انجام شد.
- Node `v26.13.1`, npm `12.2.2`; `npm ci --offline --no-audit --no-fund`: exit `0`, ۱۰۸ بسته؛ lifecycle نصب `better-sqlite3@13.1.1` طبق `allowScripts: {}` مسدود ماند.
- `npm run typecheck`: exit `0`; `npm run build`: exit `0`; `npm test`: exit `0`, ۳۵ پاس، ۰ شکست، ۰ skip.
- آزمون رگرسیون دسترسی GET پس از لغو Reviewer: list دیگران خالی، detail غیرمجاز `404` و snapshot درخواست ثابت ماند. خواندن RoleGrant جاری به Application منتقل شد تا Controller فقط درخواست/پاسخ HTTP را نگاشت کند.
- `powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/windows/acl-provisioning.ps1`: exit `0`; ACL idempotent و دسترسی principal عمومی رد شد.
- یک تلاش آنلاین پیش‌تر به `ECONNRESET` در registry خورد؛ اجرای موفق مستقل با cache offline بود. بنابراین دسترسی شبکه از این محیط تأیید نشد.
- `docs/api-examples.md` فقط نمونهٔ مستند است و درخواست دستی ارسال نشد. `docs/human-acceptance.md` آماده است و هیچ‌یک از شش مورد به‌عنوان پذیرش انسانی تکمیل نشده‌اند.
