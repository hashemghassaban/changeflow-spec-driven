# قرارداد پیشنهادی HTTP API

Stack و روش ورود/مجوز این قرارداد تأیید شده‌اند؛ مسیرها و کدهای HTTP جزئیات طراحی‌اند و در Implement باید با نیازمندی‌ها سازگار بمانند. دامنهٔ نسخه Backend-only است و هیچ قرارداد UI تعریف نمی‌شود.

## نمایهٔ عملیات

| عملیات پیشنهادی | دسترسی و اثر |
|---|---|
| `POST /change-requests` | Requester؛ دریافت `title`, `description`, `reason`؛ ایجاد با `Draft` و `requesterId` از identity معتبر. |
| `GET /change-requests` | Requester: فقط درخواست‌های خودش. Reviewer: همهٔ درخواست‌ها در همهٔ وضعیت‌ها. کاربر دو‌نقشی محدودهٔ Reviewer دارد. |
| `GET /change-requests/{id}` | Requester فقط مالک؛ Reviewer هر درخواست. برای درخواست غیرقابل‌مشاهده هیچ جزئیاتی افشا نشود. |
| `PATCH /change-requests/{id}` | مالک Requester فقط در `Draft` یا `ChangesRequested`; patch محتوای مجاز، trim/validate، Version شرطی. در `Approved` رد شود. |
| `POST /change-requests/{id}/submit` | مالک Requester؛ فقط `Draft` یا `ChangesRequested`; انتقال به `PendingReview`; Version شرطی. محتوای یکسان فقط به‌علت یکسانی رد نشود. |
| `POST /change-requests/{id}/approve` | Reviewer جاری و مستقل از مالک؛ فقط `PendingReview`; انتقال به `Approved`; Version شرطی. |
| `POST /change-requests/{id}/request-changes` | Reviewer جاری و مستقل از مالک؛ فقط `PendingReview`; بدنه شامل توضیح الزامی و معتبر؛ توضیح و انتقال به `ChangesRequested` اتمی؛ Version شرطی. |

هیچ مسیر DELETE، cancel، archive، soft-delete یا مدیریت کاربر/نقش وجود ندارد؛ درخواست به route/method تعریف‌نشده (از جمله `DELETE /change-requests/{id}`) با `404 Not Found` پاسخ می‌گیرد و داده تغییر نمی‌کند.

## Version و هم‌زمانی

- پاسخ جزئیات/ایجاد/تغییر یک `ETag` پیشنهادی متناسب با `version` برمی‌گرداند.
- تمام `PATCH`ها و فرمان‌های تغییردهنده `If-Match` نسخهٔ مشاهده‌شده را الزامی می‌کنند.
- پاسخ بدون شرط نسخه، stale version، state conflict و ترتیب role revocation در Design نهایی باید یکدست بماند.
- کد پاسخ طراحی: `428 Precondition Required` برای If-Match مفقود؛ `412 Precondition Failed` برای Version ناهماهنگ؛ `409 Conflict` برای انتقال وضعیت نامعتبر؛ `422 Unprocessable Content` برای validation؛ `401` بدون identity؛ `403` برای نقش/CSRF/Origin نامعتبر؛ `404` برای مورد خارج از محدودهٔ مشاهده؛ `429 Too Many Requests` برای عبور از محدودیت تلاش ورود؛ `503 Service Unavailable` با `Retry-After: 5` برای SQLITE_BUSY تمام‌شده؛ `200/201` برای موفقیت. این نگاشت تکنیکی است و نباید رفتار محصول را تضعیف کند.
- retry الزاماً همان بدنهٔ پاسخ موفق قبلی را دریافت نمی‌کند. فرمان قدیمی با version قدیمی حتی اگر state مشابه شود نباید اجرا شود.

## قالب‌های بدنهٔ منطقی

ایجاد و ویرایش فقط فیلدهای متنی قابل‌ویرایش را می‌پذیرند. `requesterId`, `status`, `version` و توضیح Reviewer نباید توسط بدنهٔ عمومی ایجاد/ویرایش قابل جعل باشند.

فرمان RequestChanges تنها مسیر ثبت `latestReviewerExplanation` است. فیلد توضیح باید پس از trim غیرخالی و حداکثر ۱۰۰۰ نویسه باشد؛ تعریف نویسه طبق تصمیم Plan. پاسخ Detail برای مالک و Reviewer می‌تواند آخرین توضیح را نمایش دهد و به دیگران افشا نکند.

## نگاشت خطا و اتمی‌بودن

هر خطای validation، مجوز، state یا Version باید بدون تغییر دادهٔ درخواست خاتمه یابد. RequestChanges ناموفق نباید فقط توضیح یا فقط وضعیت را ثبت کند. پاسخ خطا نباید محتوای درخواست غیرقابل‌مشاهده را بازتاب دهد.

## ورود، نشست و CSRF (تصمیم فنی تأییدشده)

| عملیات پیشنهادی | رفتار |
|---|---|
| `POST /auth/login` | Origin دقیق را بررسی می‌کند؛ loginName/password می‌گیرد؛ پیش از KDF محدودیت تلاش جاری را اتمی بررسی/ثبت می‌کند؛ برای حساب ناموجود از hash ساختگی معتبر با همان پارامترهای scrypt استفاده می‌کند؛ خطای گذرواژهٔ نادرست و loginName ناموجود پاسخ عمومی یکسان دارند؛ نشست opaque ۳۲ بایتی rotate و در SQLite ایجاد می‌شود؛ نقش از ورودی پذیرفته نمی‌شود. عبور از سقف پاسخ 429 و Retry-After می‌دهد. |
| `GET /auth/session` | وضعیت ورود، اطلاعات حداقلی حساب جاری، اطلاعات حداقلی هویت جاری و CSRF token همان نشست را می‌دهد؛ مجوز هر mutation فقط از Backend/DB جاری به‌دست می‌آید و userId/role از client پذیرفته نمی‌شود. |
| `POST /auth/logout` | Origin و CSRF را بررسی، ردیف نشست را حذف و cookie را پاک می‌کند. |

Cookie `HttpOnly`, `SameSite=Lax` و در HTTPS `Secure` است. درخواست‌های POST/PATCH/PUT/DELETE و logout باید `X-CSRF-Token` داشته و Origin دقیقشان در allowlist باشد؛ login نیز Origin را بررسی می‌کند. توکن ۳۲ بایتی در Session server-side نگهداری می‌شود. نشست idle=30 دقیقه و absolute=12 ساعت؛ Session expired رد می‌شود، ورود expired rowها را پاک می‌کند و CLI `sessions prune` پاک‌سازی دستی دارد. در توسعهٔ localhost، CORS عمومی باز نمی‌شود. نقش‌ها در session نگهداری نمی‌شوند و برای mutation داخل مرز transaction از RoleGrant جاری خوانده می‌شوند.

محدودسازی ورود: rolling window پانزده‌دقیقه‌ای، سقف ۶۰ تلاش به‌ازای IP و ۱۰ تلاش به‌ازای جفت login/IP، پاسخ 429 با Retry-After تا خروج قدیمی‌ترین تلاش از پنجره، بدون تمدید با درخواست ردشده؛ پاک‌سازی پس از ۲۴ ساعت و بازیابی خودکار پس از پنجره. موفقیت، bucket همان جفت را پاک می‌کند. IP فقط از اتصال مستقیم یا proxy صریحاً مورداعتماد استخراج می‌شود؛ در اجرای localhost، همهٔ کاربران می‌توانند یک IP loopback مشترک داشته باشند. قفل حساب دائمی یا سراسری نیست. پاسخ نام کاربری ناموجود و گذرواژهٔ نادرست عمومی یکسان است و مسیر KDF مشابه دارد؛ زمان پاسخ کاملاً یکسان تضمین نمی‌شود.

Logها نباید password، session ID، CSRF token، Cookie یا header حامل آن‌ها را ثبت کنند. کلید HMAC محدودسازی login از secret محلی خارج از مخزن می‌آید؛ raw login/IP در جدول محدودسازی ذخیره نمی‌شود.

## رفتار HTTP خطا و کلاینت‌ها

خطاهای validation و مجوز از قرارداد HTTP تبعیت می‌کنند و هیچ پاسخ خطا نباید دادهٔ غیرمجاز افشا کند. پس از conflict یا پاسخ `503`، این قرارداد دریافت خودکار داده یا replay فرمان تغییردهنده را الزامی نمی‌کند؛ هر client باید از ارسال مجدد کورکورانه اجتناب کند.

## تراکنش و driver منتخب

Driver منتخب طراحی `better-sqlite3@13.1.1` است، مشروط به gate نصب و آزمون محیطی T001. `journal_mode=WAL` حالت DB است و یک‌بار در آماده‌سازی تنظیم و تأیید می‌شود؛ `foreign_keys=ON` و `busy_timeout=5000` به هر اتصال اعمال و تأیید می‌شوند. برای write حساس `BEGIN IMMEDIATE`؛ انتظار قفل حداکثر ۵۰۰۰ ms. پس از SQLITE_BUSY، کامل rollback و پاسخ موقت 503 با `Retry-After: 5`؛ این header مجوز replay کورکورانه نیست: client ابتدا دادهٔ جاری را می‌خواند و فرمان تغییردهنده را فقط با نسخهٔ تازه و پس از تصمیم صریح کاربر می‌سازد. در transaction همان connection، session زنده، RoleGrant، مالکیت، status و expected version خوانده و mutation اعمال شود. commit عملیات و commit لغو نقش نقاط ترتیب‌دهی‌اند. Session revoke/logout و role revoke نیز با همان DB write lock ترتیبی می‌شوند.
