# راهنمای اجرای محلی و اعتبارسنجی (برای Implement آینده)

این راهنما برای Implement آینده است؛ در T001 نصب clean و probe سازگاری محلی انجام شده‌اند؛ هیچ Build/Test محصولی اجرا نشده است. انتخاب baseline Node 26.13.x و driver `better-sqlite3@13.1.1` است؛ T001 روی Windows 11 Enterprise x64/Node 26.13.1 پاس شده است؛ شواهد و محدودیت محیط در `docs/dependency-compatibility.md` ثبت‌اند.

## پیش‌نیازهای پیشنهادی

- Windows و PowerShell.
- Node.js `26.13.1` و npm محلی `12.2.2`؛ Node از مسیر `.node-version` و npm از `.tools/npm-12.2.2` اجرا می‌شود.
- وابستگی‌های exact pin شده و lockfile؛ clean install با npm `12.2.2` و lockfile؛ lifecycleهای تأییدنشده مسدود می‌مانند و binding آمادهٔ better-sqlite3 استفاده می‌شود.


## فرمان‌های پیشنهادی پس از ساخت سورس

```powershell
& ".\.tools\npm-12.2.2\npm.cmd" ci
& ".\.tools\npm-12.2.2\npm.cmd" run dev
```

برای اجرای محلی API، ابتدا CLI محلی account-create و role-grant اجرا شود؛ ابزار، گذرواژه را محرمانه دریافت و RoleGrant را در SQLite تنظیم می‌کند. هویت و نقش از درخواست client پذیرفته نمی‌شوند.

CLI پیشنهادی به فایل DB از راه Windows ACL محدود است و listener شبکه ندارد. فرمان‌های اجرایی نهایی از جمله ایجاد حساب، اعطای/لغو نقش و پاک‌سازی نشست منقضی باید بعد از Implement مستند شوند؛ گذرواژه نباید در آرگومان فرمان یا log قرار گیرد.

تنظیمات امنیتی مصوب: scrypt `N=2^17,r=8,p=1,keylen=64,maxmem=256 MiB` با salt امن ۱۶ بایتی؛ session idle ۳۰ دقیقه / مطلق ۱۲ ساعت؛ cookie HttpOnly + SameSite=Lax و Secure در HTTPS؛ CSRF token ۳۲ بایتی در header و exact Origin check. این موارد انتخاب طراحی‌اند، اما شواهد اجرای واقعی فقط پس از اجرای آزمون ثبت می‌شوند.

SQLite driver طراحی `better-sqlite3@13.1.1` و timeout برابر ۵۰۰۰ ms است. پیش از ادامهٔ کار وابسته، T001 روی محیط ثبت‌شده clean install، native binding open/close، commit/rollback و contention/SQLITE_BUSY را گذرانده است؛ migration محصول در Taskهای بعدی آزموده می‌شود. مستند CI upstream یا `engines.node` به‌تنهایی اثبات این نصب نیست.

در نشست PowerShell جداگانه، فرمان آزمون پیشنهادی:

```powershell
& ".\.tools\npm-12.2.2\npm.cmd" test
```

فرمان‌ها نمونه‌اند و تا شکل‌گیری `package.json` نهایی/Taskها نباید به‌عنوان runnable تلقی شوند.

## معیارهای مشاهده‌پذیر اعتبارسنجی

1. Draft معتبر ایجاد و دادهٔ پنج‌گانه و status در SQLite بررسی شود.
2. Submit معتبر به PendingReview برسد.
3. Self-Approval دو‌نقشی رد شود و ردیف DB عیناً حفظ شود.
4. Reviewer مستقل درخواست را Approved کند.
5. ویرایش Approved رد شود و تمام داده ثابت بماند.
6. نسخهٔ stale روی دادهٔ جدیدتر conflict دهد و داده/version ثابت بمانند.
7. فهرست و جزئیات Requester/Reviewer از همهٔ وضعیت‌ها مطابق FR-016 بررسی شوند.
8. revoke role پیش از apply عملیات را رد کند؛ revoke پس از تکمیل داده را برنگرداند؛ role دیگر کار کند.
9. دو درخواست هم‌زمان روی یک Version حداکثر یکی را اعمال کنند.
10. ورودی خالی، صرفاً فاصله، حد دقیق و یک نویسه بیش از سقف برای هر سه فیلد و توضیح Reviewer بررسی شود؛ ویرایش نامعتبر هیچ تغییر جزئی نگذارد.
11. توضیح Reviewer همراه ChangesRequested اتمی باشد، دیده‌شدن آن مطابق نقش‌ها باشد، با edit/submit حفظ و با RequestChanges بعدی جایگزین شود.
12. Submit محتوای یکسان، وقتی سایر شرایط جاری معتبرند، صرفاً به دلیل یکسانی رد نشود.
15. آزمون CSRF برای درخواست تغییردهنده، نشست نامعتبر/خروج و role revocation در عملیات واقعی؛ ردها باید هم از پاسخ HTTP و هم از snapshot DB سنجیده شوند.
16. بررسی انقضای idle و absolute session، rotation هنگام login، logout و پاک‌سازی sessionهای منقضی؛ نشست منقضی نباید عملیات انجام دهد.
17. آزمون‌های scrypt با salt یکتا و parameter metadata؛ KDF async خارج transaction و hash comparison زمان‌ثابت.
18. T001 compatibility evidence برای exact Node/SQLite package/Windows architecture؛ اگر نصب یا native binding fails، بقیهٔ کار متوقف و driver بازبینی شود.
19. محدودسازی login: سقف‌های ۶۰ تلاش/IP و ۱۰ تلاش/(login/IP) در ۱۵ دقیقه، پاسخ 429/Retry-After، عدم تمدید پنجره با درخواست ردشده، بازیابی با گذشت زمان، پاک‌سازی ۲۴ساعته و ماندگاری SQLite بررسی شوند؛ login ناموجود و گذرواژهٔ نادرست پاسخ عمومی یکسان و مسیر scrypt مشابه داشته باشند، بدون ادعای زمان پاسخ یکسان.
20. برای رقابت نسخه، دو process با دو connection به یک DB موقت پشت IPC barrier بیرون transaction هم‌زمان آزاد شوند؛ برای لغو نقش ترتیب revoke-first و mutation-first جداگانه اجرا شود. deadlineهای harness: startup هر process حداکثر ۱۵ ثانیه، هر انتظار IPC/barrier حداکثر ۱۰ ثانیه، هر عملیات HTTP آزمون حداکثر ۱۵ ثانیه و هر سناریو با cleanup حداکثر ۶۰ ثانیه. timeout باید خطای تشخیصی باشد، نه موفقیت/skip. در `finally` connectionها بسته، فرزندان با انتظار حداکثر ۵ ثانیه برای خاتمهٔ graceful و سپس terminate اجباری با انتظار حداکثر ۵ ثانیه پاک‌سازی، و DB موقت پس از آزادشدن منابع حذف شود؛ انتظار نامحدود و sleep تصادفی ممنوع است. این deadlineها timeoutهای harness هستند و `busy_timeout=5000` یا قرارداد HTTP را تغییر نمی‌دهند. نتیجهٔ هر عملیات و snapshot نهایی DB بررسی شود؛ در contention HTTP پاسخ 503/Retry-After: 5، rollback و بسته‌بودن transaction سنجیده و هیچ mutation replay نشود.

22. logهای login، logout، session، و درخواست‌های CSRF را بررسی کنید تا password، Cookie/session ID، CSRF token یا header حامل آن‌ها ثبت نشوند.

برای سناریوهای حساس، پاسخ HTTP و snapshot دادهٔ ذخیره‌شده (محتوا، status، version و توضیح آخر) هر دو بررسی شوند. خروجی Build/Test/Validation فقط پس از اجرای واقعی ثبت شود.

## تنظیمات توسعه و استقرار طراحی‌شده

- توسعهٔ محلی: API روی localhost؛ `Secure=false` فقط برای HTTP localhost؛ `HttpOnly` و `SameSite=Lax` همچنان فعال؛ حساب‌ها و RoleGrant فقط با CLI محلی و ACL فایل محدود.
- استقرار واقعی: HTTPS/TLS، cookie `Secure`، راز نشست بیرون از مخزن، CSRF token و بررسی Origin، proxy مورداعتماد دقیق، ACL محدود فایل DB و backup. استقرار چندنمونه‌ای با SQLite تک‌فایل پوشش داده نشده و نیازمند بازبینی معماری است.
- Build/Test محصول و پذیرش انسانی هنوز اجرا نشده‌اند؛ T001 فقط probe سازگاری ابزار را گزارش می‌کند.
