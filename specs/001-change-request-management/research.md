# Research: گزینه‌های فنی ChangeFlow

**تاریخ**: 2026-11-16  
**وضعیت**: تصمیم‌های محصولی Spec تغییر نمی‌کنند؛ انتخاب‌های اصلی فنی این Research توسط مالک تأیید شده‌اند. جزئیات زیر تصمیم طراحی برای Implement هستند، جز gate سازگاری واقعی که باید پیش از کار وابسته بگذرد.

## 1. Backend و زبان

### تصمیم پیشنهادی

Node.js 26 LTS + TypeScript برای HTTP API تأیید شده است. Node `26.13.1` baseline فعلی این طرح است؛ Task آغازین باید patch جاری را دوباره از منبع رسمی بررسی و تمام packageهای دقیق را pin/lock کند. [Node.js Releases](https://nodejs.org/en/about/previous-releases)

### گزینه‌ها و Trade-off

| گزینه | مزیت | هزینه/ریسک | نتیجه |
|---|---|---|---|
| Node.js + TypeScript + Express 5 | با انتخاب تأییدشده هم‌راستا؛ یک زبان برای API و UI؛ Express 5 HTTP layer کوچک و شناخته‌شده‌ای می‌دهد. | اعتبارسنجی و مرزهای Application باید آگاهانه طراحی شوند؛ Express به‌تنهایی معماری یا مجوز امن را تضمین نمی‌کند. Express 5 نسبت به 4 تغییرات ناسازگار دارد و نسخهٔ 5 به Node 18 یا جدیدتر نیاز دارد؛ از آغاز روی 5 کار شود. [راهنمای Express 5](https://expressjs.com/en/guide/migrating-5/) | **انتخاب تأییدشده** |
| ASP.NET Core Minimal APIs + C# | مسیر رسمی کم‌تشریفات برای API و گزینهٔ قوی برای اجرای محلی Windows؛ امکانات میزبان و API در چارچوب فراهم‌اند. [راهنمای Microsoft](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/apis?view=aspnetcore-10.0) | زبان متفاوت از UI React/TypeScript؛ یادگیری/نگهداری دو زبان در نسخهٔ دارای UI. | رد در پیشنهاد فعلی به‌علت اولویت هم‌زبانی، نه نقص فنی. |
| Node.js + Fastify | چارچوب جایگزین API با قرارداد schema پررنگ‌تر. | تفاوت ارزش عملی برای این API کوچک هنوز اثبات نشده و چارچوب دیگری باید آموخته/نگهداری شود. | رد؛ Express انتخاب تأییدشده است. |

### نتیجه

پیشنهاد می‌شود Express فقط در مرز HTTP باشد. Route نباید وضعیت، مالکیت، اعتبارسنجی دامنه یا قواعد موازی را خودش اعمال کند؛ به Use Caseهای Application واگذار کند.

## 2. React و محدودهٔ UI

React + TypeScript + Vite تأیید شده است. راهنمای رسمی React مسیر Vite با قالب `react-ts` را معرفی می‌کند. UI کوچک است و نیاز SSR یا routing گسترده در Spec نیست؛ Framework بزرگ‌تر هزینهٔ غیرلازم می‌آورد. [React: Build from Scratch](https://react.dev/learn/build-a-react-app-from-scratch), [React + TypeScript](https://react.dev/learn/typescript)

**تصمیم محصولی تأییدشده**: React + TypeScript + Vite UI ساده در نسخهٔ اول است و ترتیب تحویل API و آزمون‌های Backend، سپس UI خواهد بود. UI فقط جریان‌های ثبت‌شده در FR-027 تا FR-031 را ارائه می‌کند و Backend مرجع مستقل مجوز است. نیازمندی‌ها و پذیرش UI در Spec افزوده شده‌اند.

**راهبرد آزمون پیشنهادی**: آزمون‌های DOM محور برای فرم‌ها، پیام خطا و وضعیت رابط؛ سپس E2E مرورگر با API و SQLite واقعی برای ورود/خروج، مشاهدهٔ محدودشده، عملیات نقش‌ها و تعارض نسخه. Mock تنها برای آزمون component است؛ آزمون‌های Backend و بررسی DB سناریوهای حساس لازم می‌مانند. پیشنهاد ابزار: React Testing Library با Vitest و Playwright برای E2E؛ این ترکیب با Node LTS پیشنهادی سازگار به نظر می‌رسد، اما نسخه‌های دقیق در مرحلهٔ پیاده‌سازی/lockfile دوباره pin و بررسی شوند.

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

**انتخاب طراحی**: `better-sqlite3@13.1.1` برای نسخهٔ محلی. دلیل: API تراکنشی sync و مستقیم با `BEGIN IMMEDIATE`، وابستگی خارجیِ فعال به‌جای `node-sqlite3` منسوخ، و ساده‌بودن rollback/serialization در یک فرایند محلی. محدودیت آن مسدودکردن event loop هنگام SQL و busy wait است؛ بنابراین Query/transactionها کوتاه می‌مانند و عملیات async مانند scrypt بیرون transaction انجام می‌شوند. `timeout=5000ms`، `journal_mode=WAL` و `foreign_keys=ON` انتخاب می‌شوند. پس از SQLITE_BUSY، rollback و پاسخ `503 Service Unavailable` با `Retry-After: 5` داده می‌شود، نه replay خودکار mutation. این تنظیمات تا گذر gate واقعی T001 روی Windows/Node هدف پیشنهاد تثبیت‌شدهٔ طراحی‌اند. [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md), [better-sqlite3 Releases](https://github.com/WiseLibs/better-sqlite3/releases)

**گزینهٔ ردشده برای این نسخه**: `node:sqlite` داخلیِ Node 26 dependency native جدا نمی‌خواهد، اما مستند رسمی Node در حال حاضر آن را Stability 1.2 / Release Candidate می‌نامد؛ برای الزام نسخهٔ اول، package فعال با تثبیت بالاتر ترجیح دارد. [Node.js SQLite](https://nodejs.org/api/sqlite.html)

مستندات پروژهٔ driver، `node >=22` و prebuilt برای پلتفرم‌های اصلی را نشان می‌دهند؛ CI جاری آن Node 26 و Windows را آزمایش می‌کند. این شواهد upstream جای نصب/بازکردن native binary روی Windows/Node دقیق محیط اجرا را نمی‌گیرند. افزون بر این، انتشار `13.1.0` اخطار Windows ARM64 داشت و `13.1.1` بعدی منتشر شده است؛ بنابراین T001 باید package دقیق/معماری را تثبیت کند و نصب واقعی، open/close، migration، transaction, rollback و SQLITE_BUSY را gate کند. در شکست، هیچ Task وابسته‌ای شروع نمی‌شود و انتخاب جایگزین نیازمند بازبینی است. [Manifest](https://github.com/WiseLibs/better-sqlite3/blob/master/package.json), [Build matrix](https://github.com/WiseLibs/better-sqlite3/blob/master/.github/workflows/build.yml), [Release notes](https://github.com/WiseLibs/better-sqlite3/releases)

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
| نقش/شناسه انتخاب‌شده در UI یا header دلخواه | پیاده‌سازی ظاهری ساده. | هویت جعلی و ناامن؛ **رد**. فقط fixture تست مجاز است. |

**انتخاب اجرا:** Backend هویت را از credential تأییدشده استخراج می‌کند و هرگز به `userId` یا role ارسالی مرورگر اعتماد نمی‌کند. کاربر اولیه فقط با CLI محلی تحت مجوز OS ساخته می‌شود؛ ثبت‌نام عمومی/API مدیریت کاربر وجود ندارد. CLI گذرواژه را به‌صورت تعاملی/ورودی امن می‌گیرد، در آرگومان خط فرمان یا log نمی‌نویسد، و hash/metadata را ذخیره می‌کند.

**محدودسازی تلاش ورود (تصمیم اجرایی طراحی)**: تلاش‌های آغازشده در یک rolling window پانزده‌دقیقه‌ای در SQLite ثبت می‌شوند. برای هر IP قابل اعتماد حداکثر ۶۰ تلاش و برای هر جفت `(loginName خام، IP)` حداکثر ۱۰ تلاش مجاز است؛ شمارنده‌ها هر تلاش ورود را پیش از KDF به‌طور اتمی رزرو می‌کنند تا رقابت درخواست‌ها از سقف عبور نکند. تلاش بالاتر از سقف با `429 Too Many Requests` و `Retry-After` تا خروج قدیمی‌ترین تلاش از پنجره رد می‌شود؛ تلاش ردشده پنجره را تمدید نمی‌کند. پاسخ پس از ۱۵ دقیقه به‌طور خودکار بازیابی می‌شود؛ داده‌های قدیمی‌تر از ۲۴ ساعت پاک می‌شوند. موفقیت ورود، رکوردهای همان جفت login/IP را پاک می‌کند، نه شمارندهٔ IP را. هیچ حسابی قفل دائمی یا سراسری نمی‌شود؛ حمله از همان IP می‌تواند جفت login/IP را موقتاً محدود کند و IP مشترک (از جمله loopback در اجرای localhost) ممکن است کاربران همان مبدأ را تحت تأثیر قرار دهد. شمارندهٔ IP این اثر را محدود اما حذف نمی‌کند؛ محدودیت IPمحور در برابر حملهٔ توزیع‌شده نیز تضمین کامل نیست.

کلیدهای شمارنده HMAC-SHA-256 از IP و login خام ساخته و با کلید ۳۲‌بایتی محلی خارج از مخزن محافظت می‌شوند؛ متن login/IP خام در جدول محدودسازی ثبت نمی‌شود. Backend فقط `socket.remoteAddress` را می‌پذیرد؛ پشت proxy فقط hop/CIDR صریحاً مورداعتماد در تنظیمات استفاده می‌شود و `X-Forwarded-For` دلخواه نادیده گرفته می‌شود. چرخش کلید، شمارنده‌های قبلی را غیرقابل‌استفاده می‌کند و باید به‌عنوان reset محدودسازی مستند شود.

برای loginName ناموجود، Backend از یک salt/hash ساختگی معتبر با همان پارامترهای scrypt استفاده و همان مسیر KDF و مقایسه را اجرا می‌کند. loginName ناموجود و گذرواژهٔ نادرست پاسخ عمومی یکسان دارند؛ برابری کامل زمان پاسخ ادعا نمی‌شود. گذرواژه، session ID، CSRF token و headerهای حاوی آن‌ها نباید log شوند؛ رویداد محدودسازی فقط با نتیجه و کلیدهای غیرقابل‌بازگشت/شناسهٔ رویداد ثبت می‌شود.

**پارامتر scrypt:** `crypto.scrypt` asynchronous، `N=2^17`, `r=8`, `p=1`, `keylen=64`, `maxmem=256*1024*1024`; salt تصادفی با `randomBytes(16)` و پارامترها در رکورد ذخیره می‌شوند. OWASP این پارامترهای N/r/p را حداقل پیشنهادی scrypt می‌داند؛ Node می‌گوید KDF memory/CPU costly است و salt تصادفی حداقل 16 byte باشد؛ `maxmem` از برآورد `128*N*r` بیشتر تعیین می‌شود. مقایسهٔ hash با برابری زمان‌ثابت انجام می‌شود. آزمون‌ها پوشش hash/verify، salt متفاوت، و startup/خطای حافظه روی Windows می‌دهند. هر کاهش پارامتر در آینده نیازمند بازبینی امنیتی است. [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [Node.js crypto.scrypt](https://nodejs.org/api/crypto.html)

پس از ورود، شناسهٔ نشست با 32 بایت تصادفی ساخته، بعد از احراز credential rotate و فقط hash شناسه در SQLite ذخیره می‌شود؛ نقش در cookie/session کپی نمی‌شود. نشست idle پس از 30 دقیقه و مطلق پس از 12 ساعت expire می‌شود؛ هر درخواست احرازشده `lastSeenAt` را در همان عملیات DB به‌روزرسانی می‌کند. نشست نامعتبر/منقضی رد می‌شود، logout ردیف نشست را حذف می‌کند، ورود پاک‌سازی ردیف‌های منقضی را انجام می‌دهد و CLI زیر‌فرمان `sessions prune` پاک‌سازی دستی می‌دهد. Cookie فقط شناسه را دارد و `HttpOnly`, `SameSite=Lax`; `Secure` در HTTPS. `MemoryStore` استفاده نمی‌شود. (مستندات Express تأیید می‌کنند دادهٔ express-session سمت سرور می‌ماند و MemoryStore برای production مناسب نیست.) [Express session](https://expressjs.com/en/resources/middleware/session/)

**CSRF/Origin نهایی:** هر Session دارای token تصادفی 32-byte CSRF است که server-side ذخیره می‌شود؛ `/auth/session` آن را به client همان origin می‌دهد؛ تغییرهای POST/PATCH/PUT/DELETE و logout باید آن را در `X-CSRF-Token` بفرستند. Backend با مقایسهٔ زمان‌ثابت token و بررسی exact Origin نسبت به allowlist تنظیم‌شده هر تغییر را رد می‌کند؛ Origin مفقود/نامنطبق رد می‌شود. Login نیز Origin exact را بررسی می‌کند. CORS cross-origin باز نمی‌شود و `SameSite=Lax` فقط دفاع تکمیلی است. در توسعه Vite مسیر هم‌مبدأ `/api` proxy می‌کند؛ cookie Secure فقط برای HTTP localhost خاموش است. در استقرار واقعی TLS، `Secure`, secret بیرون مخزن، proxy مورد اعتماد دقیق و ACL DB/backup لازم است. (رفتار cookie بر پایهٔ مستندات رسمی Express.)

**تأمین و لغو RoleGrant (تأییدشده):** CLI محلی مجزا از API محصول، با فرمان account-create / role-grant / role-revoke / sessions-prune، توسط Windows account محدود مجاز اجرا می‌شود؛ CLI هیچ port/network listener ندارد و DB ACL اجرای آن را محدود می‌کند. CLI و API از یک `BEGIN IMMEDIATE` و transaction boundary استفاده می‌کنند. عملیات حساس داخل همان تراکنش Session جاری، RoleGrant جاری، مالکیت، state، expected version را می‌خواند و mutation می‌کند. commit mutation نقطهٔ تکمیل است؛ commit role revoke نقطهٔ مؤثرشدن لغو. اگر revoke commit شود اول، mutation بعدی نقش را نمی‌بیند و rollback می‌شود؛ اگر mutation commit شود اول، معتبر می‌ماند. Revoke نقش دیگر را تحت تأثیر نمی‌گذارد.

**زمان‌بندی SQLite:** تراکنش حساس کوتاه و sync با `BEGIN IMMEDIATE`؛ `better-sqlite3` timeout 5000ms، `journal_mode=WAL` و `foreign_keys=ON`. KDF/network/CLI prompt بیرون transaction است. SQLITE_BUSY پس از timeout: rollback، هیچ mutation جزئی، پاسخ `503` با `Retry-After: 5`، بدون replay؛ UI باید پس از هشدار read refresh کند و فرمان را با version قبلی نفرستد. Errorهای دیگر transaction نیز rollback کامل و بررسی `inTransaction` قبل از هر ادامه دارند. تست با connection/process دوم وضعیت rowها را بعد از busy/rollback مقایسه می‌کند. [better-sqlite3 API](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)

### اعتبارسنجی رسمی سازگاری نسخه‌ها (2026-11-16)

- Node.js 26 در اکتبر 2026 وارد LTS شده است؛ `26.13.1` در 11 نوامبر 2026 به‌عنوان LTS security release منتشر شده و baseline فعلی این طرح است. Node 26 LTS انتخاب تأییدشده است؛ T001 patch جاری را دوباره کنترل و pin می‌کند. Node 24 و 22 نیز در صفحهٔ رسمی Releases LTS هستند.
- Vite 8 نیازمند Node 20.19+ یا 22.12+ است؛ پس Node 26 نسخهٔ اعلام‌شده را برآورده می‌کند. راهنمای رسمی Vite قالب `react-ts` را ارائه می‌کند.
- Vitest راهنمای جاری حداقل Vite 6.4 و Node 22.12 را می‌خواهد؛ با Node 26 و Vite 8 سازگار از نظر حداقل‌های اعلامی است.
- مستندات مهاجرت Express 5 حداقل Node 18 را اعلام می‌کند؛ Node 26 این حداقل را پوشش می‌دهد.
- Playwright مستندات رسمی آن را برای Windows و TypeScript معرفی می‌کند؛ در صفحهٔ نصب بازشده حداقل Node دقیق ثبت نشده بود، بنابراین حداقل نسخهٔ Playwright در این بررسی تأیید نشده و باید قبل از pin مجدداً وارسی شود.
- این بررسی سازگاری اعلام‌شدهٔ حداقل‌ها را تأیید می‌کند، نه نصب، build موفق، یا سازگاری کامل نسخه‌های دقیق React/Express/SQLite. نسخه‌های دقیق و native SQLite روی Windows باید قبل از پیاده‌سازی با منابع رسمی همان نسخه و lockfile بازبینی شوند.

## 5. کنترل نسخه و فرمان‌های تکراری

### گزینهٔ پیشنهادی

هر درخواست عدد Version افزایشی دارد. همهٔ ویرایش‌ها، Submit، Approve و RequestChanges نسخهٔ مورد مشاهده را الزام می‌کنند و نسخه فقط اگر هنوز جاری باشد پذیرفته می‌شود. در SQLite، خواندن نسخه/وضعیت، بررسی مجوز و تغییر شرطی در یک تراکنش است. commit موفق دقیقاً یک نسخه می‌افزاید؛ تلاش هم‌زمان دوم با نسخهٔ قدیمی رد می‌شود. این کار هم retry ناسازگار و هم فرمان قدیمی پس از بازگشت state به حالت مشابه را رد می‌کند، بدون الزام به حفظ/بازگرداندن پاسخ قبلی.

### گزینه‌های دیگر

- **ETag/If-Match در HTTP**: گزینهٔ مناسب برای انتقال Version از طریق قرارداد استاندارد conditional request؛ همچنان به update شرطی/transaction در DB نیاز دارد و به‌تنهایی جلوی race را نمی‌گیرد.
- **قفل pessimistic یا SQLite write transaction**: مناسب برای serialize کردن عملیات در یک DB؛ ساده‌تر در یک میزبان، اما نویسنده‌ها منتظر می‌مانند و contention باید مدیریت شود.
- **قفل optimistic**: شرط `version = expected` در update و بررسی یک ردیف تغییرکرده؛ برای stale detection ساده، ولی اگر مجوز در همان ترتیب تراکنشی خوانده نشود، race مجوز حل نمی‌شود.

**پیشنهاد قرارداد**: `ETag`/`If-Match` برای API و تراکنش + شرط Version در SQLite برای قطعیت. این انتخاب پیشنهادی است؛ کدهای HTTP نهایی در `contracts/http-api.md` به‌صورت proposal ثبت شده‌اند.

## 6. شمارش نویسه

**انتخاب تأییدشده:** شمارش Unicode grapheme cluster در Backend با `Intl.Segmenter('fa', { granularity: 'grapheme' })`; trim قبل از count؛ نه byte و نه UTF-16 code unit. Node patch در lock/config pin و helper Backend با فارسی/اعراب ترکیبی/emoji/ZWJ آزمون می‌شود. UI سقف را client-side enforce نمی‌کند؛ نتیجهٔ validation Backend مرجع است تا تفاوت ICU مرورگر و Node نتایج ناسازگار ندهد. [ECMA-402 Segmenter Objects](https://tc39.es/ecma402/#segmenter-objects)

UI خطای اعتبارسنجی و سقف را از پاسخ Backend نشان می‌دهد؛ خودش تصمیم طول مستقل تولید نمی‌کند. اگر Node target از Segmenter منتخب پشتیبانی نکند، T001 compatibility gate مانع Implement می‌ماند.

## 7. آزمون و شواهد

- آزمون واحد: قواعد transition، مالکیت، Self-Approval، normalization، سقف‌ها و تعریف شمارش.
- آزمون یکپارچه با DB واقعی موقت: عملیات موفق/ردشده، مقدار ذخیره‌شده، version و atomicity توضیح + `ChangesRequested`.
- آزمون HTTP: احراز subject، role scope در فهرست/جزئیات، نگاشت conflict و عدم افشای جزئیات.
- آزمون race: دو تغییر روی یک Version؛ لغو نقش قبل/بعد از commit؛ اطمینان از حداکثر یک تغییر و حفظ داده پس از rollback.
- Assignment AC-001 تا AC-006 و Spec AC-001 تا AC-036 باید به آزمون‌های مشخص ردیابی شوند. برای شکست‌های امنیتی، علاوه بر پاسخ HTTP، دادهٔ پایگاه داده خوانده و مقایسه شود.
- پذیرش UI طبق AC-037 تا AC-045 به آزمون‌های component و E2E ردیابی شود. این آزمون‌ها کنترل دسترسی Backend را اثبات نمی‌کنند و جای آزمون مستقیم HTTP/داده را نمی‌گیرند.
- Build/Test/Validation فقط پس از اجرای واقعی گزارش شوند. این مرحله هیچ آزمونی اجرا نکرده است.

## منابع رسمی

- [Node.js Release Schedule](https://nodejs.org/en/about/previous-releases)
- [Node.js v26.13.0 LTS](https://nodejs.org/en/blog/release/v26.13.0)
- [Node.js v26.13.1 LTS security release](https://nodejs.org/en/blog/release/v26.13.1)
- [Vite 8 Node.js requirements](https://vite.dev/guide/)
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8)
- [Vitest requirements](https://vitest.dev/guide/)
- [Playwright installation](https://playwright.dev/docs/intro)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
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
- [React: Build a React App from Scratch](https://react.dev/learn/build-a-react-app-from-scratch)
- [React: TypeScript](https://react.dev/learn/typescript)
- [ASP.NET Core API overview](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/apis?view=aspnetcore-10.0)
- [SQLite Isolation](https://www.sqlite.org/isolation.html)
- [SQLite Transactions](https://sqlite.org/lang_transaction.html)
- [IETF RFC 7519 — JWT](https://datatracker.ietf.org/doc/html/rfc7519)
- [IETF RFC 9068 — JWT Profile for OAuth 2.0 Access Tokens](https://www.rfc-editor.org/rfc/rfc9068.html)
- [ECMA-402 — Intl.Segmenter](https://tc39.es/ecma402/#segmenter-objects)
