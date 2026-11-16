# ChangeFlow — مدیریت درخواست تغییر

ChangeFlow یک HTTP API برای ثبت، بازبینی و پیگیری درخواست‌های تغییر است. نسخهٔ تحویلی **Backend-only** است و رابط کاربری ندارد.

## مخزن و وضعیت تحویل

- مخزن: [changeflow-spec-driven](https://github.com/hashemghassaban/changeflow-spec-driven) (remote تنظیم‌شدهٔ Git؛ این ممیزی commit یا push نکرده است).
- وضعیت: پیاده‌سازی و آزمون‌های فنی طبق نتایج اجراشده تکمیل‌اند؛ پذیرش انسانی باز است و نصب آنلاین هنوز تأیید نشده است.
- گزارش اجرای واقعی: [docs/validation-report.md](docs/validation-report.md).

## Stack و پیش‌نیازها

- Windows x64 در محیط اعتبارسنجی ثبت‌شده؛ Node.js `26.13.1` و npm `12.2.2` محلی.
- TypeScript، Express `5.3.0` و SQLite با `better-sqlite3@13.1.1`؛ نسخه‌های دقیق در `package.json` و lockfile هستند.
- نصب clean آفلاین در کپی جداگانه با cache محلی موفق بوده است. نصب آنلاین در این محیط به `ECONNRESET` رسیده و تأیید نشده است. جزئیات و محدودیت سازگاری در [docs/dependency-compatibility.md](docs/dependency-compatibility.md) آمده است.
- برای آماده‌سازی Node و npm محلی و دستورهای نصب، [docs/local-toolchain.md](docs/local-toolchain.md) و بخش Quickstart را ببینید. نصب سراسری Node/npm لازم نیست.

## نصب، پیکربندی و اجرا

مراحل کامل آماده‌سازی ابزار، environment، ACL پایگاه داده، ساخت حساب و راه‌اندازی در [specs/001-change-request-management/quickstart.md](specs/001-change-request-management/quickstart.md) است. برنامه `.env` را خودکار بارگذاری نمی‌کند؛ متغیرهای محیطی را در process سرور تنظیم کنید. DB، فایل‌های WAL و کلید HMAC باید در مسیر محدودشده به حساب‌های مجاز باشند. نمونهٔ متغیرها در `.env.example` و توضیح امنیت محلی در [docs/local-security.md](docs/local-security.md) است.

از PowerShell در ریشهٔ مخزن، پس از آماده‌سازی ابزار محلی و متغیرهای محیطی طبق Quickstart:

```powershell
# در صورت موجودبودن cache لازم، نصب clean آفلاین؛ نصب آنلاین هنوز تأیید نشده است.
& .tools\npm-12.2.2\npm.cmd ci --offline --no-audit --no-fund
if ($LASTEXITCODE -ne 0) { throw "npm ci failed: $LASTEXITCODE" }

& .tools\npm-12.2.2\npm.cmd run typecheck
if ($LASTEXITCODE -ne 0) { throw "typecheck failed: $LASTEXITCODE" }

& .tools\npm-12.2.2\npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "build failed: $LASTEXITCODE" }

# اجرای API؛ این پنجره را باز نگه دارید.
& .tools\npm-12.2.2\npm.cmd start
```

سرور با تنظیمات نمونهٔ Quickstart فقط روی `http://127.0.0.1:3000` گوش می‌دهد. در پنجرهٔ جداگانه برای اجرای suite:

```powershell
& .tools\npm-12.2.2\npm.cmd test
```

`npm test` ابتدا Build و سپس آزمون‌ها را اجرا می‌کند. گزارش `docs/validation-report.md` فرمان‌ها و نتایج واقعی اجراشده را ثبت می‌کند؛ فرمان‌های بالا به‌خودی‌خود نتیجه‌ای را تضمین نمی‌کنند.

## معماری و تصمیم‌های اصلی

- منطق قواعد، مالکیت، مجوز و انتقال وضعیت در `src/domain/` و `src/application/` قرار دارد؛ Express در `src/http/` درخواست و پاسخ HTTP را نگاشت می‌کند.
- SQLite محلی، تراکنش‌های کوتاه و version شرطی (`ETag`/`If-Match`) برای جلوگیری از تغییر بی‌صدای دادهٔ جدیدتر به‌کار می‌روند. مجوز جاری، مالکیت، وضعیت، نسخه و mutation در مرز تراکنشی مشترک بررسی می‌شوند.
- ورود با نام کاربری و گذرواژه است؛ hash گذرواژه با scrypt و salt تصادفی، نشست opaque پایدار در SQLite و CSRF/Origin برای mutationها استفاده می‌شوند. RoleGrant جاری در SQLite مرجع نقش است و حساب/نقش از CLI محلی provision می‌شوند؛ ثبت‌نام عمومی یا API مدیریت کاربر وجود ندارد.
- جزئیات گزینه‌ها، Trade-offها، مدل داده و قراردادها در [Plan](specs/001-change-request-management/plan.md)، [Research](specs/001-change-request-management/research.md)، [مدل داده](specs/001-change-request-management/data-model.md) و [قرارداد HTTP](specs/001-change-request-management/contracts/http-api.md) ثبت شده‌اند.

## مستندات و شواهد

- Specification و Clarifications: [spec.md](specs/001-change-request-management/spec.md)
- Tasks و ردیابی: [tasks.md](specs/001-change-request-management/tasks.md)
- راهنمای API: [docs/api-examples.md](docs/api-examples.md)
- Analyze و Converge: [docs/analyze-report.md](docs/analyze-report.md)، [docs/converge-report.md](docs/converge-report.md)
- پذیرش دستی: [docs/human-acceptance.md](docs/human-acceptance.md)
- پاسخ‌های مفهومی: [docs/answers/session-01.md](docs/answers/session-01.md)

## محدودیت‌های شناخته‌شده

- نسخهٔ فعلی فقط HTTP API و اجرای محلی تک‌سرویسی را هدف می‌گیرد؛ Frontend، ثبت‌نام عمومی، مدیریت کاربران از API، حساب مشترک، هویت سرویس، حذف/لغو درخواست و استقرار چندنمونه‌ای در محدوده نیستند.
- سازگاری native driver فقط روی Windows 11 Enterprise x64 با Node `26.13.1` و driver ثبت‌شده بررسی شده است؛ به سیستم‌های دیگر تعمیم داده نمی‌شود.
- نصب آنلاین dependency در محیط اعتبارسنجی تأیید نشده است؛ نصب موفق clean ثبت‌شده آفلاین و متکی به cache محلی بوده است.
- شش سناریوی خودکار Assignment در گزارش آزمون پاس ثبت شده‌اند، اما پذیرش انسانی هنوز انجام نشده و هیچ‌یک از آن‌ها human-accepted علامت نخورده‌اند.

## نقش Coding Agent

Codex به‌عنوان Coding Agent برای تهیه و به‌روزرسانی Artifactهای SDD، پیاده‌سازی Backend و آزمون‌های خودکار، و کمک به بازبینی و ثبت شواهد استفاده شده است. تصمیم‌های محصولی و فنی با تأیید مالک پروژه ثبت شده‌اند؛ گزارش Agent جای بازبینی مالک یا پذیرش انسانی را نمی‌گیرد.
