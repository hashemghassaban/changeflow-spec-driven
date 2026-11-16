# شواهد سازگاری وابستگی‌ها — T001

## نسخه‌های pinned و منابع رسمی

| جزء | نسخه | شواهد |
|---|---:|---|
| Node.js | 26.13.1 x64 | [Release رسمی Node](https://nodejs.org/en/blog/release/v26.13.1/) و [Archive](https://nodejs.org/en/download/archive/v26.13.1). SHA-256 فایل رسمی Windows x64 با مقدار ثبت‌شده در release برابر بود: `e2edda75bfb089654705cf65a13b58933bfd5f57148e8ebda916f58a2474f1f7`. |
| npm | 12.2.2 | [Changelog رسمی](https://github.com/npm/cli/blob/latest/CHANGELOG.md) و [بستهٔ registry](https://registry.npmjs.org/npm/12.2.2). SRI tarball با metadata registry تطبیق داده شده بود؛ نسخه در فضای محلی مخزن قرار گرفت، نه به‌صورت global. Node 26 با شرط engine رسمی سازگار است. |
| better-sqlite3 | 13.1.1 | نسخهٔ driver تأییدشده در Design؛ [package registry](https://registry.npmjs.org/better-sqlite3/13.1.1). Prebuild Windows x64 داخل tarball و API عمومی بارگذاری شدند. |
| Express | 5.3.0 | [metadata رسمی](https://registry.npmjs.org/express/5.3.0)، engine اعلام‌شده `>=18`. |
| TypeScript | 7.0.2 | [نسخهٔ پایدار registry](https://registry.npmjs.org/typescript/7.0.2). |
| @types/express | 5.0.6 | [metadata registry](https://registry.npmjs.org/@types%2fexpress/5.0.6)، نوع Express 5. |
| @types/better-sqlite3 | 9.6.0 | [metadata registry](https://registry.npmjs.org/@types%2fbetter-sqlite3/9.6.0)، tag سازگار `ts7.0`. |
| @types/node | 26.6.6 | [metadata registry](https://registry.npmjs.org/@types%2fnode/26.6.6)، تعریف‌های Node 26. |

نسخه‌ها در `package.json` و lockfile v3 دقیق pin شده‌اند. SHA-256 فایل‌ها: `package.json` = `ECCBEB50D28992830ABB95A5E394A7DF1A8F0C62F4B4886AB3707577E0C6C1E5`; `package-lock.json` = `5DF6EFFC7C63596223D7564BAAEA5C1D9923738D74AE1D1C7D9FB54F0C14F2B9`; `.node-version` = `5C293036FC0A61AD76E15D85F454C3C7CEC157E181E035B69F95058A2C239144`.

## مسیر رسمی نصب npm و نتیجهٔ واقعی

npm 12 اسکریپت lifecycle وابستگی‌های تأییدنشده را به‌طور پیش‌فرض مسدود می‌کند؛ این سیاست در [تغییرات رسمی npm 12](https://github.com/npm/cli/blob/latest/CHANGELOG.md) مستند است. `allowScripts` در package ریشه خالی مانده تا هیچ lifecycle به‌صورت ضمنی مجاز نشود. npm در نصب زیر lifecycle `better-sqlite3@13.1.1` با فرمان `node-gyp rebuild` را مسدود کرد؛ API عمومی همچنان prebuild موجود در tarball را بارگذاری کرد. این نتیجه مربوط به همین نسخه/Windows x64 و اجرای مشاهده‌شده است؛ تضمین همهٔ معماری‌ها یا آینده نیست. `--ignore-scripts`, `--force`, allowlist گسترده و Build Tools استفاده نشدند.

فرمان واقعاً اجراشده (Node و npm از مسیر محلی دقیق؛ `NPM_CONFIG_PREFIX` و cache فقط برای process همین فرمان تنظیم شده بودند):

```powershell
& .tools\npm-12.2.2\npm.cmd ci --no-audit --no-fund --foreground-scripts --loglevel verbose
```

- محیط: Windows 11 Enterprise `10.0.26200`, AMD64/x64.
- Node: `v26.13.1`, `process.execPath=C:\Users\Dotin\AppData\Local\ChangeFlow\toolchains\node-v26.13.1-win-x64\node-v26.13.1-win-x64\node.exe`.
- npm: `12.2.2`, از `.tools\npm-12.2.2\npm.cmd`.
- Exit code: `0`; نصب clean، ۸۱ package در ۱۹ ثانیه.
- stderr: فقط lifecycle `better-sqlite3@13.1.1 (install: node-gyp rebuild)` به‌دلیل نبودن در allowScripts مسدود شد؛ node-gyp اجرا نشد.
- API عمومی: `require('better-sqlite3')`, ساخت Database، query، close در finally؛ binding بارشده: `node_modules\better-sqlite3\prebuilds\win32-x64.node`.
- تنظیم مؤثر DB/اتصال‌ها: `journal_mode=wal`, `foreign_keys=1`, `busy_timeout=5000`.
- commit: ردیف پایدار ماند؛ rollback: ردیف rollbackشده غایب بود.
- contention: دو process با دو اتصال مستقل به یک DB موقت؛ process اول `BEGIN IMMEDIATE` گرفت و با IPC rollback شد؛ دومی پس از `5352ms` `SQLITE_BUSY` گرفت. Runtime/`execPath` هر دو با Node هدف برابر بود؛ snapshot نهایی فقط `committed` بود.
- timeoutهای harness: startup تا ۱۵s، IPC تا ۱۰s، عملیات contention تا ۱۵s، کل تا ۶۰s؛ cleanup اتصال‌ها و processها با انتظار محدود انجام و DB موقت حذف شد.
- Probe exit code: `0`.

## محدودهٔ نتیجه

T001 در این محیط تکمیل شد. این شواهد موفقیت نصب و probe compatibility محلی را نشان می‌دهد، نه Build/Test محصول، API، یا UI. هیچ تست محصول یا پذیرش انسانی در T001 اجرا/ادعا نشده است.