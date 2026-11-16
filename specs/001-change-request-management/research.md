# Research: گزینه‌های فنی ChangeFlow

**تاریخ**: 2026-11-16  
**وضعیت**: تصمیم‌های محصولی Spec تغییر نمی‌کنند؛ انتخاب‌های اصلی فنی این Research توسط مالک تأیید شده‌اند. جزئیات زیر تصمیم طراحی برای Implement هستند، جز gate سازگاری واقعی که باید پیش از کار وابسته بگذرد.

## 1. Backend و زبان

### تصمیم پیشنهادی

Node.js 26 LTS + TypeScript برای HTTP API تأیید شده است. Node `26.13.1` از release رسمی و `.node-version` pin شده است؛ نسخه‌های دقیق packageها در lockfile ثبت‌اند و شواهد محیطی T001 در `docs/dependency-compatibility.md` آمده است. [Node.js Releases](https://nodejs.org/en/about/previous-releases)

### گزینه‌ها و Trade-off

| گزینه | مزیت | هزینه/ریسک | نتیجه |
|---|---|---|---|
| Node.js + TypeScript + Express 5 | با انتخاب تأییدشده هم‌راستا؛ یک زبان برای پیاده‌سازی Backend؛ Express 5 HTTP layer کوچک و شناخته‌شده‌ای می‌دهد. | اعتبارسنجی و مرزهای Application باید آگاهانه طراحی شوند؛ Express به‌تنهایی معماری یا مجوز امن را تضمین نمی‌کند. Express 5 نسبت به 4 تغییرات ناسازگار دارد و نسخهٔ 5 به Node 18 یا جدیدتر نیاز دارد؛ از آغاز روی 5 کار شود. [راهنمای Express 5](https://expressjs.com/en/guide/migrating-5/) | **انتخاب تأییدشده** |
| ASP.NET Core Minimal APIs + C# | مسیر رسمی کم‌تشریفات برای API و گزینهٔ قوی برای اجرای محلی Windows؛ امکانات میزبان و API در چارچوب فراهم‌اند. [راهنمای Microsoft](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/apis?view=aspnetcore-10.0) | زبان جایگزین و runtime متفاوت از Node/TypeScript؛ | رد در پیشنهاد فعلی به‌علت اولویت هم‌زبانی، نه نقص فنی. |
| Node.js + Fastify | چارچوب جایگزین API با قرارداد schema پررنگ‌تر. | تفاوت ارزش عملی برای این API کوچک هنوز اثبات نشده و چارچوب دیگری باید آموخته/نگهداری شود. | رد؛ Express انتخاب تأییدشده است. |

### نتیجه

پیشنهاد می‌شود Express فقط در مرز HTTP باشد. Route نباید وضعیت، مالکیت، اعتبارسنجی دامنه یا قواعد موازی را خودش اعمال کند؛ به Use Caseهای Application واگذار کند.

## 2. دامنهٔ Backend-only

تصمیم محصولی فعلی، نسخهٔ اول را به Backend و HTTP API محدود می‌کند؛ React، Frontend و آزمون مرورگر بخشی از تحویل نیستند. بخش تصمیم UI قبلی و پیشنهادهای آن superseded شده‌اند و شناسه‌های سابق در Spec صرفاً برای ردیابی بازنشستگی باقی می‌مانند.

## 3. Persistence و هم‌زمانی

### تصمیم پیشنهادی

SQLite محلی برای نسخهٔ اول تک‌سرویسی و Windows، مشروط به اینکه بار نوشتن کم/متوسط باشد و فایل DB روی دیسک محلی قرار گیرد. SQLite در isolation رسمی خود می‌گوید تراکنش‌ها serializable می‌شوند و نویسنده‌ها پشت سر هم نوبت می‌گیرند؛ تضمین مناسب برای حل مسابقهٔ update و role revoke در یک DB است، با این هزینه که فقط یک نویسنده در هر لحظه فعال است. [SQLite Isolation](https://www.sqlite.org/isolation.html)

### مقایسه

| گزینه | مزیت | Trade-off |
|---|---|---|
| SQLite | نصب سرویس جدا لازم نیست؛ یک فایل محلی؛ تراکنش اتمی و نویسندهٔ واحد، مناسب اجرای Windows محلی و حجم پایین. | نوشتن‌ها سریالی‌اند؛ رقابت زیاد یا چند replica باعث انتظار و `SQLITE_BUSY` می‌شود. `BEGIN IMMEDIATE` می‌تواند نوشتن را از آغاز رزرو کند اما در صورت فعال‌بودن نویسندهٔ دیگر ممکن است `SQLITE_BUSY` بدهد. [SQLite Transactions](https://sqlite.org/lang_transaction.html) |
| PostgreSQL | سرویس چندکاربرهٔ مرکزی و ظرفیت هم‌زمانی/استقرار گسترده‌تر. | راه‌اندازی و نگهداری سرویس و credential محلی اضافه می‌شود؛ برای تحویل API محلی فعلی پیچیدگی زودهنگام است. |

**پیشنهاد**: SQLite برای v1 محلی. اگر استقرار چندنمونه‌ای یا نرخ نویسندگی بالا هدف شود، PostgreSQL باید در Plan بعدی دوباره بررسی شود. SQLite روی فایل شبکه‌ای انتخاب نشود.

### SQLite driver انتخاب‌شده

**انتخاب طراحی**: `better-sqlite3@13.1.1` برای نسخهٔ محلی. دلیل: API تراکنشی sync و مستقیم با `BEGIN IMMEDIATE`، وابستگی خارجیِ فعال به‌جای `node-sqlite3` منسوخ، و ساده‌بودن rollback/serialization در یک فرایند محلی. محدودیت آن مسدودکردن event loop هنگام SQL و busy wait است؛ بنابراین Query/transactionها کوتاه می‌مانند و عملیات async مانند scrypt بیرون transaction انجام می‌شوند. `timeout=5000ms`، `journal_mode=WAL` و `foreign_keys=ON` انتخاب می‌شوند. پس از SQLITE_BUSY، rollback و پاسخ `503 Service Unavailable` با `Retry-After: 5` داده می‌شود، نه replay خودکار mutation. تنظیمات در T001 روی Windows 11 Enterprise x64/Node 26.13.1 probe شدند؛ شواهد فقط به همان محیط مربوط‌اند. [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md), [better-sqlite3 Releases](https://github.com/WiseLibs/better-sqlite3/releases)

**گزینهٔ ردشده برای این نسخه**: `node:sqlite` داخلیِ Node 26 dependency native جدا نمی‌خواهد، اما مستند رسمی Node در حال حاضر آن را Stability 1.2 / Release Candidate می‌نامد؛ برای الزام نسخهٔ اول، package فعال با تثبیت بالاتر ترجیح دارد. [Node.js SQLite](https://nodejs.org/api/sqlite.html)

مستندات پروژهٔ driver، `node >=22` و prebuilt برای پلتفرم‌های اصلی را نشان می‌دهند؛ CI جاری آن Node 26 و Windows را آزمایش می‌کند. این شواهد upstream جای نصب/بازکردن native binary روی Windows/Node دقیق محیط اجرا را نمی‌گیرند. افزون بر این، انتشار `13.1.0` اخطار Windows ARM64 داشت و `13.1.1` بعدی منتشر شده است؛ بنابراین package دقیق و معماری در manifest تثبیت شد؛ T001 clean install، بارگذاری native، transaction/rollback و SQLITE_BUSY را روی محیط محلی پاس کرد. این شواهد سازگاری عمومی را تضمین نمی‌کند. [Manifest](https://github.com/WiseLibs/better-sqlite3/blob/master/package.json), [Build matrix](https://github.com/WiseLibs/better-sqlite3/blob/master/.github/workflows/build.yml), [Release notes](https://github.com/WiseLibs/better-sqlite3/releases)

## 3.5 نصب امن npm

برای Windows x64 و Node 26.13.1، npm 12.2.2 به‌عنوان نسخهٔ دقیق ابزار محلی انتخاب شده است. npm 12 به‌طور پیش‌فرض اسکریپت نصب وابستگی‌هایی را که در `allowScripts` تأیید نشده‌اند مسدود می‌کند؛ در نصب clean ثبت‌شده، این رفتار اجازه داد binding داخل tarball (`prebuilds/win32-x64.node`) از API عمومی استفاده شود، بدون اجرای `node-gyp` یا نیاز به C++ Build Tools. clean install، عملیات کامل DB و contention در T001 روی محیط ثبت‌شده پاس شدند؛ این شواهد فقط همان نسخه/محیط را پوشش می‌دهد. برای وابستگی جدید، lifecycleها باید پیش از allow کردن بررسی شوند؛ اسکریپت‌های غیرضروری مجاز نشوند و `--ignore-scripts`/`--force` راهکار نیستند. منابع: [npm CLI 12.0.0 policy](https://github.com/npm/cli/blob/latest/CHANGELOG.md), [npm issue #9837](https://github.com/npm/cli/issues/9837), [better-sqlite3 issue #1516](https://github.com/WiseLibs/better-sqlite3/issues/1516).

## 4. هویت، مجوز و لغو نقش

### قاعدهٔ طراحی غیرقابل‌تضعیف

فقط شناسهٔ پایدار هویت از مرز احراز هویت گرفته شود؛ نقش داخل JWT قدیمی به‌تنهایی منبع مجوز نیست. JWT قالب ادعانامه است و اعتبارسنجی برخی ادعاها به context برنامه وابسته است؛ بنابراین از نظر طراحی، claim نقشِ توکن صادرشده پیش از لغو برای تصمیم جاری کافی نیست. این نتیجه استنباط معماری از نیاز «مجوز جاری» و مدل claimهاست، نه تضمین خود JWT. [RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519), [RFC 9068](https://www.rfc-editor.org/rfc/rfc9068.html)

### گزینه‌ها

| گزینه | لغو نقش | Trade-off/نتیجه |
|---|---|---|
| نقش در JWT/session بلندعمر، بدون بررسی مجدد | تا انقضا ممکن است نقش لغوشده پذیرفته شود. | **رد**؛ با FR-019 ناسازگار است. کوتاه‌کردن عمر توکن نیز پنجرهٔ ناسازگاری را حذف نمی‌کند. |
| JWT فقط برای subject پایدار + خواندن نقش جاری از مرجع بیرونی در هر عملیات | از claim نقش منسوخ اجتناب می‌کند. | خواندن از IdP و نوشتن SQLite تراکنش مشترک ندارند؛ بین آخرین بررسی IdP و اعمال DB هنوز race باقی می‌ماند. **به‌تنهایی کافی نیست** برای تضمین صریح FR-019. |
| هویت احراز‌شده با login محلی + RoleGrant جاری در همان SQLite؛ تغییر RoleGrant با CLI خارج از API محصول | خواندن مجوز، بررسی نسخه/وضعیت و اعمال تغییر در یک ترتیب تراکنشی مشترک قرار می‌گیرند. | **انتخاب تأییدشده**؛ account/login و grant در DB محلی‌اند و CLI به OS account محدود است. |
| مرجع مجوز بیرونی با تراکنش/قفل توزیع‌شده یا fencing token هماهنگ با DB | می‌تواند ترتیب مشترک فراهم کند. | پیچیدگی زیاد و وابسته به قابلیت IdP/زیرساختی که در مخزن معرفی نشده؛ برای v1 محلی پیشنهاد نمی‌شود، اما اگر role authority باید بیرونی و فوری باشد باید گزینهٔ جایگزین بررسی شود. |

### نقطهٔ مؤثر لغو و جلوگیری از TOCTOU

در گزینهٔ پیشنهادی، یک تراکنش نوشتن SQLite مسیر همهٔ عملیات حساس و تغییر RoleGrant را سریالی می‌کند. تراکنش تغییر درخواست ابتدا قفل نوشتن را می‌گیرد، هویت/RoleGrant جاری را می‌خواند، مالکیت و state/version را بررسی می‌کند، سپس داده و وضعیت (و توضیح Reviewer در صورت نیاز) را تغییر می‌دهد و commit می‌کند. لغو نقش نیز همان مرجع و تراکنش را به‌روزرسانی می‌کند:

- اگر تغییر درخواست اول commit شود، عملیات پیش از مؤثرشدن لغو کامل شده است و معتبر می‌ماند.
- اگر لغو اول commit شود، عملیات بعدی نقش را غیرفعال می‌بیند و پیش از تغییر رد می‌شود.
- بررسی مجوز بیرون از این تراکنش و اعمال بعدی ممنوع است؛ این همان فاصلهٔ ناامن check/use است.

SQLite تراکنش `IMMEDIATE` را گزینه‌ای برای گرفتن قفل نوشتن از ابتدای عملیات ارائه می‌کند؛ ممکن است در رقابت `SQLITE_BUSY` برگرداند. باید خطای contention کنترل‌شده، rollback کامل و پاسخ قابل retry/reject تعریف شود؛ نتیجهٔ commit مبهم نباید کورکورانه replay شود. مرجع رسمی می‌گوید همهٔ writeها در SQLite نوبتی اجرا می‌شوند و `BEGIN IMMEDIATE` ممکن است busy شود. [SQLite Isolation](https://www.sqlite.org/isolation.html), [SQLite Transactions](https://sqlite.org/lang_transaction.html)

**تصمیم تأییدشده و محدودیت گزینه‌ها**: برای نسخهٔ محلی، RoleGrant در همان SQLite مرجع نهایی نقش جاری است و commit تراکنش revoke نقطهٔ مؤثرشدن لغو است؛ نیازی به تأیید دوبارهٔ این تصمیم پیش از Implement نیست. IdP بیرونی هنوز انتخاب نشده است؛ هر طرح آینده‌ای که لغو را در IdP مؤثر بداند ولی آن را async به ChangeFlow منتقل کند، با تضمین FR-019 ناسازگار است، مگر آن‌که مرجع تراکنشی مشترک یا پروتکل اتمی/فنسینگ قابل اثبات فراهم کند. در غیر این صورت آن گزینه قابل اجرا نیست و نیازمندی نباید تضعیف شود.

### مقایسهٔ روش ورود و انتخاب اجرایی محلی

| گزینه | مزیت | محدودیت و نتیجه |
|---|---|---|
| ورود محلی با نام کاربری/گذرواژه، scrypt، نشست opaque سمت سرور | ساده و مناسب اجرای محلی؛ سرور subject را تعیین می‌کند؛ لغو نشست ممکن است؛ نقش‌ها در DB جاری خوانده می‌شوند. | برنامه مسئول نگهداری اعتبارنامه و دفاع در برابر brute force است؛ **انتخاب تأییدشده** با CLI provisioning و DB محافظت‌شده. |
| OIDC Authorization Code + PKCE با IdP | ورود و اعتبارنامه را به ارائه‌دهندهٔ هویت واگذار می‌کند؛ نیاز به نگهداری گذرواژهٔ محلی ندارد. | وابستگی به تنظیم IdP/شبکه دارد؛ JWT نقش‌دارِ قدیمی و بررسی جداگانهٔ IdP با SQLite فاصلهٔ TOCTOU را رفع نمی‌کنند. فقط اگر RoleGrant در DB محلی منبع نهایی مجوز بماند یا پروتکل مشترک اتمی ارائه شود قابل بررسی است؛ برای اجرای مستقل محلی ساده نیست. |
| userId/role دلخواه از client یا header | ساده به نظر می‌رسد. | هویت جعلی و ناامن؛ **رد**. فقط fixture تست مجاز است. |

**انتخاب اجرا:** Backend هویت را از credential تأییدشده استخراج می‌کند و هرگز به `userId` یا role ارسالی مرورگر اعتماد نمی‌کند. کاربر اولیه فقط با CLI محلی تحت مجوز OS ساخته می‌شود؛ ثبت‌نام عمومی/API مدیریت کاربر وجود ندارد. CLI گذرواژه را به‌صورت تعاملی/ورودی امن می‌گیرد، در آرگومان خط فرمان یا log نمی‌نویسد، و hash/metadata را ذخیره می‌کند.

**پارامتر scrypt:** `crypto.scrypt` asynchronous، `N=2^17`, `r=8`, `p=1`, `keylen=64`, `maxmem=256*1024*1024`; salt تصادفی با `randomBytes(16)` و پارامترها در رکورد ذخیره می‌شوند. OWASP این پارامترهای N/r/p را حداقل پیشنهادی scrypt می‌داند؛ Node می‌گوید KDF memory/CPU costly است و salt تصادفی حداقل 16 byte باشد؛ `maxmem` از برآورد `128*N*r` بیشتر تعیین می‌شود. مقایسهٔ hash با برابری زمان‌ثابت انجام می‌شود. آزمون‌ها پوشش hash/verify، salt متفاوت، و startup/خطای حافظه روی Windows می‌دهند. هر کاهش پارامتر در آینده نیازمند بازبینی امنیتی است. [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Node.js crypto.scrypt](https://nodejs.org/api/crypto.html)

پس از ورود، شناسهٔ نشست با 32 بایت تصادفی ساخته، بعد از احراز credential rotate و فقط hash شناسه در SQLite ذخیره می‌شود؛ نقش در cookie/session کپی نمی‌شود. نشست idle پس از 30 دقیقه و مطلق پس از 12 ساعت expire می‌شود؛ هر درخواست احرازشده `lastSeenAt` را در همان عملیات DB به‌روزرسانی می‌کند. نشست نامعتبر/منقضی رد می‌شود، logout ردیف نشست را حذف می‌کند، ورود پاک‌سازی ردیف‌های منقضی را انجام می‌دهد و CLI زیر‌فرمان `sessions prune` پاک‌سازی دستی می‌دهد. Cookie فقط شناسه را دارد و `HttpOnly`, `SameSite=Lax`; `Secure` در HTTPS. `MemoryStore` استفاده نمی‌شود. (مستندات Express تأیید می‌کنند دادهٔ express-session سمت سرور می‌ماند و MemoryStore برای production مناسب نیست.) [Express session](https://expressjs.com/en/resources/middleware/session/)

**CSRF/Origin نهایی:** هر Session دارای token تصادفی 32-byte CSRF است که server-side ذخیره می‌شود؛ `/auth/session` آن را به client همان origin می‌دهد؛ تغییرهای POST/PATCH/PUT/DELETE و logout باید آن را در `X-CSRF-Token` بفرستند. Backend با مقایسهٔ زمان‌ثابت token و بررسی exact Origin نسبت به allowlist تنظیم‌شده هر تغییر را رد می‌کند؛ Origin مفقود/نامنطبق رد می‌شود. Login نیز Origin exact را بررسی می‌کند. CORS cross-origin باز نمی‌شود و `SameSite=Lax` فقط دفاع تکمیلی است. در توسعه cookie Secure فقط برای HTTP localhost خاموش است. در استقرار واقعی TLS، `Secure`, secret بیرون مخزن، proxy مورد اعتماد دقیق و ACL DB/backup لازم است. (رفتار cookie بر پایهٔ مستندات رسمی Express.)

**محدودسازی ورود و عدم افشای حساب:** هر تلاش login پیش از scrypt در تراکنش کوتاه SQLite رزرو می‌شود تا درخواست‌های هم‌زمان از سقف عبور نکنند. Rolling window برابر ۱۵ دقیقه است: حداکثر ۶۰ تلاش از یک IP و ۱۰ تلاش برای جفت login/IP؛ تلاش بالاتر از حد با `429` و `Retry-After` تا انقضای قدیمی‌ترین تلاش رد می‌شود و خود ردشدن پنجره را تمدید نمی‌کند. رکوردهای قدیمی‌تر از ۲۴ ساعت در هر ورود پاک می‌شوند؛ پس از خروج رکوردهای قدیمی از پنجره امکان تلاش خودکار بازمی‌گردد. موفقیت ورود bucket همان جفت را پاک می‌کند، نه bucket IP را. محدودیت به حساب به‌تنهایی وابسته نیست و قفل دائمی/سراسری حساب ایجاد نمی‌کند؛ IP مشترک (در localhost معمولاً loopback) می‌تواند کاربران همان مبدأ را موقتاً محدود کند. حملهٔ توزیع‌شده را به‌طور کامل متوقف نمی‌کند. IP از `socket.remoteAddress` می‌آید؛ `X-Forwarded-For` فقط پشت proxy/hop صریحاً مورداعتماد پذیرفته می‌شود. شناسهٔ login محدودسازی، HMAC-SHA-256 از بایت‌های خام ورودی است تا سیاست نرمال‌سازی login جدیدی به محصول تحمیل نشود؛ بنابراین تغییر نگارش login ممکن است bucket جفتی دیگری بسازد، اما سقف IP همچنان اعمال می‌شود. کلید HMAC تصادفی ۳۲‌بایتی در تنظیم محلی خارج از مخزن/با ACL نگهداری می‌شود؛ چرخش آن reset شمارنده‌هاست. login ناموجود و گذرواژهٔ نادرست پاسخ عمومی یکسان و مسیر scrypt مشابه با dummy hash معتبر دارند؛ برابری کامل زمان پاسخ ادعا نمی‌شود. گذرواژه، session ID، CSRF token و headerهای حامل آن‌ها از log حذف می‌شوند.

**تأمین و لغو RoleGrant (تأییدشده):** CLI محلی مجزا از API محصول، با فرمان account-create / role-grant / role-revoke / sessions-prune، توسط Windows account محدود مجاز اجرا می‌شود؛ CLI هیچ port/network listener ندارد و DB ACL اجرای آن را محدود می‌کند. CLI و API از یک `BEGIN IMMEDIATE` و transaction boundary استفاده می‌کنند. عملیات حساس داخل همان تراکنش Session جاری، RoleGrant جاری، مالکیت، state، expected version را می‌خواند و mutation می‌کند. commit mutation نقطهٔ تکمیل است؛ commit role revoke نقطهٔ مؤثرشدن لغو. اگر revoke commit شود اول، mutation بعدی نقش را نمی‌بیند و rollback می‌شود؛ اگر mutation commit شود اول، معتبر می‌ماند. Revoke نقش دیگر را تحت تأثیر نمی‌گذارد.

**زمان‌بندی SQLite:** تراکنش حساس کوتاه و sync با `BEGIN IMMEDIATE`؛ `better-sqlite3` timeout 5000ms، `journal_mode=WAL` و `foreign_keys=ON`. KDF/network/CLI prompt بیرون transaction است. SQLITE_BUSY پس از timeout: rollback، هیچ mutation جزئی، پاسخ `503` با `Retry-After: 5`، بدون replay؛ client نباید پس از خطای contention فرمان تغییردهنده را خودکار با version قبلی replay کند. Errorهای دیگر transaction نیز rollback کامل و بررسی `inTransaction` قبل از هر ادامه دارند. تست با connection/process دوم وضعیت rowها را بعد از busy/rollback مقایسه می‌کند. [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)

`journal_mode=WAL` ویژگی پایگاه داده است: هنگام آماده‌سازی فایل DB اعمال و مقدار بازگشتی/مؤثر تأیید می‌شود؛ آن را به‌عنوان تنظیم مستقل هر اتصال معرفی نمی‌کنیم. `foreign_keys=ON` و `busy_timeout=5000` تنظیمات هر connection هستند و هر اتصال تازه باید آن‌ها را اعمال و با PRAGMA بخواند/تأیید کند. آزمون contention دو process/connection مستقل را با IPC barrier هماهنگ می‌کند: writer اول `BEGIN IMMEDIATE` را می‌گیرد و پیام آماده می‌دهد؛ writer دوم پس از آن درخواست واقعی/SQL را شروع می‌کند؛ پس از نتیجهٔ busy، writer اول rollback می‌کند. آزمون نباید writer را در انتظار پیام داخل transaction نگه دارد به‌گونه‌ای که release قفل ناممکن شود. هر دو DB connection باید پس از خطا `inTransaction=false` و snapshot ثابت داشته باشند؛ آزمون HTTP باید 503 و `Retry-After: 5` را بررسی کند و هیچ mutation خودکاری را دوباره نفرستد.

برای آزمون واقعی رقابت نسخه، worker/processهای مستقل و دو connection به همان فایل موقت پیش از `BEGIN IMMEDIATE` روی barrier منتظر می‌مانند و سپس هم‌زمان آزاد می‌شوند؛ barrier بیرون از transaction است و قفل مصنوعی نگه نمی‌دارد. هر درخواست با یک If-Match مشترک اجرا می‌شود؛ نتیجهٔ مورد انتظار یک موفقیت و یک conflict/نسخهٔ کهنه، یک افزایش نسخه و snapshot نهایی برابر تنها برنده است. برای لغو نقش دو ترتیب commit جداگانه آزموده می‌شود: (الف) CLI revoke commit می‌کند، پیام IPC می‌دهد و mutation بعد از آن مجوز جاری را می‌خواند و بدون تغییر رد می‌شود؛ (ب) mutation commit می‌کند و پیام می‌دهد، سپس CLI revoke commit می‌کند و snapshot تغییر تکمیل‌شده را برنمی‌گرداند. در هر دو، پاسخ عملیات، زمان/ترتیب commit و snapshot نهایی بررسی می‌شوند؛ هماهنگ‌سازی پیش از transaction یا پس از commit انجام می‌شود، نه در حالی‌که process دیگر برای گرفتن همان write lock نیازمند آزادشدن دستی است.

**Deadline و پاک‌سازی harness چندپردازه‌ای:** این حدود فقط برای harness آزمون‌اند و `busy_timeout=5000` یا قرارداد HTTP را تغییر نمی‌دهند. راه‌اندازی هر process حداکثر ۱۵ ثانیه، انتظار هر پیام IPC یا barrier حداکثر ۱۰ ثانیه، تکمیل هر عملیات HTTP آزمون حداکثر ۱۵ ثانیه و کل هر سناریوی چندپردازه‌ای (با احتساب پاک‌سازی) حداکثر ۶۰ ثانیه است. پایان هر فرزند نیز deadline محدود دارد: coordinator پیام shutdown بفرستد تا فرزند transaction را rollback و اتصال DB را ببندد؛ حداکثر ۵ ثانیه برای خاتمهٔ graceful منتظر بماند، سپس terminate اجباری کند و حداکثر ۵ ثانیه برای خروج منتظر بماند. انتظار نامحدود ممنوع است. در `finally` این پاک‌سازی برای همهٔ فرزندان و اتصال‌های harness انجام شود و DB موقت فقط پس از خروج فرزندان و آزادشدن همهٔ منابع حذف شود. عبور هر deadline باید با خطای تشخیصی شامل مرحله/فرایند/انتظار شکست بخورد، نه موفق تلقی شود یا بی‌توضیح skip شود؛ اگر cleanup تا سقف کل سناریو کامل نشود، آزمون باید شکست تشخیصی ثبت کند. هماهنگ‌سازی با پیام/barrier است و از sleep تصادفی استفاده نمی‌شود.

### اعتبارسنجی رسمی سازگاری نسخه‌ها (2026-11-16)

- Node.js 26 در اکتبر 2026 وارد LTS شده است؛ `26.13.1` در 11 نوامبر 2026 به‌عنوان LTS security release منتشر شده و baseline این طرح است. Node 26 LTS انتخاب تأییدشده و نسخهٔ دقیق T001 است. Node 24 و 22 نیز در صفحهٔ رسمی Releases LTS هستند.
- مستندات مهاجرت Express 5 حداقل Node 18 را اعلام می‌کند؛ Node 26 این حداقل را پوشش می‌دهد.
- T001 در محیط محلی ثبت‌شده، clean install و probe native SQLite را با نسخه‌های pin‌شده اجرا کرد؛ جزئیات در `docs/dependency-compatibility.md` است. این نتیجه، سازگاری عمومی سایر محیط‌ها را تضمین نمی‌کند.

## 5. کنترل نسخه و فرمان‌های تکراری

### گزینهٔ پیشنهادی

هر درخواست عدد Version افزایشی دارد. همهٔ ویرایش‌ها، Submit، Approve و RequestChanges نسخهٔ مورد مشاهده را الزام می‌کنند و نسخه فقط اگر هنوز جاری باشد پذیرفته می‌شود. در SQLite، خواندن نسخه/وضعیت، بررسی مجوز و تغییر شرطی در یک تراکنش است. commit موفق دقیقاً یک نسخه می‌افزاید؛ تلاش هم‌زمان دوم با نسخهٔ قدیمی رد می‌شود. این کار هم retry ناسازگار و هم فرمان قدیمی پس از بازگشت state به حالت مشابه را رد می‌کند، بدون الزام به حفظ/بازگرداندن پاسخ قبلی.

### گزینه‌های دیگر

- **ETag/If-Match در HTTP**: گزینهٔ مناسب برای انتقال Version از طریق قرارداد استاندارد conditional request؛ همچنان به update شرطی/transaction در DB نیاز دارد و به‌تنهایی جلوی race را نمی‌گیرد.
- **قفل pessimistic یا SQLite write transaction**: مناسب برای serialize کردن عملیات در یک DB؛ ساده‌تر در یک میزبان، اما نویسنده‌ها منتظر می‌مانند و contention باید مدیریت شود.
- **قفل optimistic**: شرط `version = expected` در update و بررسی یک ردیف تغییرکرده؛ برای stale detection ساده، ولی اگر مجوز در همان ترتیب تراکنشی خوانده نشود، race مجوز حل نمی‌شود.

**پیشنهاد قرارداد**: `ETag`/`If-Match` برای API و تراکنش + شرط Version در SQLite برای قطعیت. این انتخاب پیشنهادی است؛ کدهای HTTP نهایی در `contracts/http-api.md` به‌صورت proposal ثبت شده‌اند.

## 6. شمارش نویسه

**انتخاب تأییدشده:** شمارش Unicode grapheme cluster در Backend با `Intl.Segmenter('fa', { granularity: 'grapheme' })`; trim قبل از count؛ نه byte و نه UTF-16 code unit. Node patch در lock/config pin و helper Backend با فارسی/اعراب ترکیبی/emoji/ZWJ آزمون می‌شود. [ECMA-402 Segmenter Objects](https://tc39.es/ecma402/#segmenter-objects)

Node `26.13.1` و شمارش grapheme با `Intl.Segmenter` در T001 بررسی و در آزمون‌های Backend اجرا شدند؛ سایر runtimeها نیازمند اعتبارسنجی مستقل‌اند.

## 7. آزمون و شواهد

- آزمون واحد: قواعد transition، مالکیت، Self-Approval، normalization، سقف‌ها و تعریف شمارش.
- آزمون یکپارچه با DB واقعی موقت: عملیات موفق/ردشده، مقدار ذخیره‌شده، version و atomicity توضیح + `ChangesRequested`.
- آزمون HTTP: احراز subject، role scope در فهرست/جزئیات، نگاشت conflict و عدم افشای جزئیات.
- آزمون race: دو تغییر روی یک Version؛ لغو نقش قبل/بعد از commit؛ اطمینان از حداکثر یک تغییر و حفظ داده پس از rollback.
- Assignment AC-001 تا AC-006 و Spec AC-001 تا AC-036 به آزمون‌های Backend ردیابی شده‌اند. برای شکست‌های امنیتی، علاوه بر پاسخ HTTP، دادهٔ پایگاه داده خوانده و مقایسه می‌شود.
- آزمون و پذیرش نسخهٔ جاری Backend-only است؛ آزمون مستقیم HTTP و دادهٔ ماندگار لازم است.
- Build، typecheck و suite آزمون محصول در Windows/PowerShell واقعاً اجرا شدند؛ فرمان‌ها و نتایج در `docs/validation-report.md` ثبت شده‌اند. این نتایج پذیرش انسانی نیستند.

## منابع رسمی

- [Node.js Release Schedule](https://nodejs.org/en/about/previous-releases)
- [Node.js v26.13.0 LTS](https://nodejs.org/en/blog/release/v26.13.0)
- [Node.js v26.13.1 LTS security release](https://nodejs.org/en/blog/release/v26.13.1)
- [Express 5 Migration Guide](https://expressjs.com/en/guide/migrating-5/)
- [Express session middleware](https://expressjs.com/en/resources/middleware/session/)
- [Express security best practices](https://expressjs.com/en/advanced/best-practice-security/)
- [Node.js crypto.scrypt](https://nodejs.org/api/crypto.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Node.js SQLite](https://nodejs.org/api/sqlite.html)
- [better-sqlite3 README](https://github.com/WiseLibs/better-sqlite3)
- [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [better-sqlite3 release history](https://github.com/WiseLibs/better-sqlite3/releases)
- [better-sqlite3 CI build matrix](https://github.com/WiseLibs/better-sqlite3/blob/master/.github/workflows/build.yml)
- [ASP.NET Core API overview](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/apis?view=aspnetcore-10.0)
- [SQLite Isolation](https://www.sqlite.org/isolation.html)
- [SQLite Transactions](https://sqlite.org/lang_transaction.html)
- [IETF RFC 7519 — JWT](https://datatracker.ietf.org/doc/html/rfc7519)
- [IETF RFC 9068 — JWT Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068.html)
- [ECMA-402 — Intl.Segmenter](https://tc39.es/ecma402/#segmenter-objects)
