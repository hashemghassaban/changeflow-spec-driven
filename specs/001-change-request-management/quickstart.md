# راهنمای اجرای محلی و اعتبارسنجی (برای Implement آینده)

این راهنما برای Implement آینده است؛ در مرحلهٔ Tasks هیچ runtime یا dependency نصب و هیچ فرمان Build/Test اجرا نمی‌شود. انتخاب baseline Node 26.13.x و driver `better-sqlite3@13.1.1` است؛ نصب واقعی روی Windows/Node محیط هدف gate اولیهٔ T001 است و تا موفقیت آن Task وابسته‌ای نباید شروع شود.

## پیش‌نیازهای پیشنهادی

- Windows و PowerShell.
- Node.js 26 LTS patch دقیق pin‌شده در T001 و npm سازگار.
- وابستگی‌های exact pin شده و lockfile؛ نصب clean با `npm ci` فقط پس از گذر T001.
- مرورگر پشتیبانی‌شده برای اجرای UI و E2E؛ نصب browser binary مربوط به Playwright در مرحلهٔ پیاده‌سازی.

## فرمان‌های پیشنهادی پس از ساخت سورس

```powershell
npm ci
npm run dev
```

فرمان جداگانهٔ پیشنهادی برای رابط React/Vite:

```powershell
npm run dev:web
```

در جریان توسعه، Vite باید `/api` را به Backend proxy کند تا UI و cookie نشست هم‌مبدأ بمانند. برای اجرای مستقل بعد از ساخت، ابتدا CLI محلی account-create و role-grant اجرا شود؛ ابزار، گذرواژه را محرمانه دریافت و RoleGrant را در SQLite تنظیم می‌کند. کاربر نباید از UI شناسه یا نقش انتخاب کند.

CLI پیشنهادی به فایل DB از راه Windows ACL محدود است و listener شبکه ندارد. فرمان‌های اجرایی نهایی از جمله ایجاد حساب، اعطای/لغو نقش و پاک‌سازی نشست منقضی باید بعد از Implement مستند شوند؛ گذرواژه نباید در آرگومان فرمان یا log قرار گیرد.

تنظیمات امنیتی مصوب: scrypt `N=2^17,r=8,p=1,keylen=64,maxmem=256 MiB` با salt امن ۱۶ بایتی؛ session idle ۳۰ دقیقه / مطلق ۱۲ ساعت؛ cookie HttpOnly + SameSite=Lax و Secure در HTTPS؛ CSRF token ۳۲ بایتی در header و exact Origin check. این موارد انتخاب طراحی‌اند، اما شواهد اجرای واقعی فقط پس از اجرای آزمون ثبت می‌شوند.

SQLite driver طراحی `better-sqlite3@13.1.1` و timeout برابر ۵۰۰۰ ms است. پیش از ادامهٔ کار وابسته، T001 باید روی Windows و Node دقیق lockfile clean install، native binding open/close، schema migration، transaction/rollback و contention/SQLITE_BUSY را بررسی کند. مستند CI upstream یا `engines.node` به‌تنهایی اثبات این نصب نیست.

در نشست PowerShell جداگانه، فرمان آزمون پیشنهادی:

```powershell
npm test
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
13. آزمون component رابط برای فرم‌های ایجاد/ویرایش، وضعیت، توضیح Reviewer و پیام‌های validation/permission/conflict؛ با تمرکز بر تعامل کاربر، نه جزئیات داخلی.
14. آزمون E2E روی Backend/SQLite واقعی برای ورود/خروج، scope نقش‌ها، ایجاد/Submit، approve مستقل، RequestChanges با توضیح و تعارض نسخهٔ stale. mock API فقط برای تست component است و کنترل Backend را ثابت نمی‌کند.
15. آزمون CSRF برای درخواست تغییردهنده، نشست نامعتبر/خروج و role revocation در عملیات واقعی؛ ردها باید هم از پاسخ HTTP و هم از snapshot DB سنجیده شوند.
16. بررسی انقضای idle و absolute session، rotation هنگام login، logout و پاک‌سازی sessionهای منقضی؛ نشست منقضی نباید عملیات انجام دهد.
17. آزمون‌های scrypt با salt یکتا و parameter metadata؛ KDF async خارج transaction و hash comparison زمان‌ثابت.
18. T001 compatibility evidence برای exact Node/SQLite package/Windows architecture؛ اگر نصب یا native binding fails، بقیهٔ کار متوقف و driver بازبینی شود.
19. محدودسازی login: سقف‌های ۶۰ تلاش/IP و ۱۰ تلاش/(login/IP) در ۱۵ دقیقه، پاسخ 429/Retry-After، عدم تمدید پنجره با درخواست ردشده، بازیابی با گذشت زمان، پاک‌سازی ۲۴ساعته و ماندگاری SQLite بررسی شوند؛ login ناموجود و گذرواژهٔ نادرست پاسخ عمومی یکسان و مسیر scrypt مشابه داشته باشند، بدون ادعای زمان پاسخ یکسان.
20. برای رقابت نسخه، دو process با دو connection به یک DB موقت پشت IPC barrier بیرون transaction هم‌زمان آزاد شوند؛ برای لغو نقش ترتیب revoke-first و mutation-first جداگانه اجرا شود. deadlineهای harness: startup هر process حداکثر ۱۵ ثانیه، هر انتظار IPC/barrier حداکثر ۱۰ ثانیه، هر عملیات HTTP آزمون حداکثر ۱۵ ثانیه و هر سناریو با cleanup حداکثر ۶۰ ثانیه. timeout باید خطای تشخیصی باشد، نه موفقیت/skip. در `finally` connectionها بسته، فرزندان با انتظار حداکثر ۵ ثانیه برای خاتمهٔ graceful و سپس terminate اجباری با انتظار حداکثر ۵ ثانیه پاک‌سازی، و DB موقت پس از آزادشدن منابع حذف شود؛ انتظار نامحدود و sleep تصادفی ممنوع است. این deadlineها timeoutهای harness هستند و `busy_timeout=5000` یا قرارداد HTTP را تغییر نمی‌دهند. نتیجهٔ هر عملیات و snapshot نهایی DB بررسی شود؛ در contention HTTP پاسخ 503/Retry-After: 5، rollback و بسته‌بودن transaction سنجیده و هیچ mutation replay نشود.
21. برای UI، Draft ذخیره‌شده را از فرم دارای تغییرات ذخیره‌نشده جدا بررسی کنید؛ تازه‌سازی داده درون برنامه بدون reload کامل صفحه و پاسخ conflict نباید ورودی فرم را با دادهٔ دریافتی بی‌هشدار بازنویسی کند؛ دورریختن/جایگزینی نیازمند انتخاب صریح کاربر است. حفظ یا بازیابی پس از reload کامل مرورگر، بستن تب یا crash و هشدار خروج مرورگر جزو تعهد نیست؛ localStorage یا رفتار offline در این نسخه آزموده/الزام نشده است.
22. logهای login، logout، session، و درخواست‌های CSRF را بررسی کنید تا password، Cookie/session ID، CSRF token یا header حامل آن‌ها ثبت نشوند.

برای سناریوهای حساس، پاسخ HTTP و snapshot دادهٔ ذخیره‌شده (محتوا، status، version و توضیح آخر) هر دو بررسی شوند. خروجی Build/Test/Validation فقط پس از اجرای واقعی ثبت شود.

## تنظیمات توسعه و استقرار طراحی‌شده

- توسعهٔ محلی: API و Vite روی localhost؛ Vite proxy برای `/api`؛ `Secure=false` فقط برای HTTP localhost؛ `HttpOnly` و `SameSite=Lax` همچنان فعال؛ حساب‌ها و RoleGrant فقط با CLI محلی و ACL فایل محدود.
- استقرار واقعی: HTTPS/TLS، cookie `Secure`، راز نشست بیرون از مخزن، CSRF token و بررسی Origin، proxy مورداعتماد دقیق، ACL محدود فایل DB و backup. استقرار چندنمونه‌ای با SQLite تک‌فایل پوشش داده نشده و نیازمند بازبینی معماری است.
- هیچ‌یک از دستورها هنوز اجرا نشده‌اند و این مستند، موفقیت build/test یا پذیرش انسانی را گزارش نمی‌کند.
