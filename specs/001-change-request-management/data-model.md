# مدل دادهٔ پیشنهادی

این مدل از FR-003 تا FR-031، Clarifications و انتخاب‌های فنی تأییدشده استخراج شده است. جزئیات اجرایی در این سند طراحی‌اند؛ Schema/Migration تا Implement تولید نمی‌شود.

## ChangeRequest

| فیلد پیشنهادی | نوع منطقی | الزام/قید | دلیل |
|---|---|---|---|
| `id` | شناسهٔ یکتا | پایدار و غیرقابل‌تغییر | ارجاع جزئیات و عملیات به یک درخواست |
| `title` | متن | trim؛ غیرخالی؛ حداکثر ۱۲۰ grapheme cluster | FR-022 |
| `description` | متن | trim؛ غیرخالی؛ حداکثر ۵۰۰۰ grapheme cluster | FR-022 |
| `reason` | متن | trim؛ غیرخالی؛ حداکثر ۱۰۰۰ grapheme cluster | FR-022 |
| `requesterId` | شناسهٔ پایدار فرد | لازم؛ مالکیت و Self-Approval فقط با این شناسه مقایسه می‌شوند | FR-003, FR-018 |
| `status` | مقدار محدود | Draft, PendingReview, Approved, ChangesRequested | FR-012 |
| `version` | عدد صحیح افزایشی | هر mutation پذیرفته‌شده آن را افزایش دهد؛ expected version کهنه رد شود | FR-014, FR-021 |
| `latestReviewerExplanation` | متن یا تهی | پس از trim غیرخالی و حداکثر ۱۰۰۰ نویسه هنگام RequestChanges؛ با همان عملیات وضعیت ذخیره شود؛ با ویرایش/Submit حفظ و با RequestChanges بعدی جایگزین شود | FR-024–FR-025 |

`latestReviewerExplanation` تاریخچهٔ کامل نیست؛ فقط آخرین توضیح معتبر نگهداری می‌شود. متن فارسی و زبان‌های دیگر پذیرفته‌اند. شمارش Backend همهٔ فیلدها با grapheme cluster و helper یکسان انجام می‌شود.

## CurrentRoleGrant (مرجع تأییدشدهٔ نقش جاری)

| فیلد پیشنهادی | نوع منطقی | قید |
|---|---|---|
| `userId` | شناسهٔ پایدار فرد | شناسهٔ subject احراز‌شده؛ نه ایمیل یا نام نمایشی |
| `role` | Requester یا Reviewer | یکتایی ترکیب `(userId, role)` |
| `active` | مقدار منطقی/وضعیت جاری | لغو، مجوزهای همان نقش را از دسترس خارج کند |

RoleGrant در همان SQLite محل ChangeRequest و منبع نهایی نقش جاری است. افزودن/لغو فقط با CLI محدود خارج از API محصول انجام می‌شود؛ commit نقش revoke نقطهٔ مؤثر است و همان transaction boundary را با تغییرات درخواست دارد.

## IndividualAccount (احراز هویت تأییدشده)

| فیلد پیشنهادی | نوع منطقی | قید |
|---|---|---|
| `userId` | شناسهٔ پایدار فرد | یکتا؛ منبع مالکیت ChangeRequest و subject نشست |
| `loginName` | شناسهٔ ورود | یکتا و غیرعمومی؛ نمایش‌نام/ایمیل مبنای مالکیت نیست |
| `passwordHash` | خروجی scrypt | فقط derived key؛ گذرواژهٔ خام هرگز ذخیره نشود |
| `passwordSalt` | ۱۶ بایت تصادفی رمزنگاری‌امن | برای هر حساب یکتا |
| `scryptN`, `scryptR`, `scryptP`, `keyLength` | عدد صحیح | `2^17`, `8`, `1`, `64`; پارامتر هر رکورد versionable |

پیاده‌سازی با `crypto.scrypt` ناهمگام انجام می‌شود؛ `maxmem=256 MiB`. حساب مشترک، service identity و ثبت‌نام عمومی وجود ندارد.

## ServerSession (نشست تأییدشده)

| فیلد پیشنهادی | نوع منطقی | قید |
|---|---|---|
| `sessionIdHash` | hash شناسهٔ تصادفی | شناسهٔ خام فقط در cookie مرورگر؛ در صورت امکان hash آن در مخزن نشست |
| `userId` | شناسهٔ پایدار فرد | از حساب احرازشده؛ نقش جاری به نشست الصاق نمی‌شود |
| `createdAt`, `lastSeenAt`, `absoluteExpiresAt` | زمان | idle TTL=30 دقیقه؛ سقف مطلق=12 ساعت |
| `csrfToken` | ۳۲ بایت تصادفی | server-side نگهداری؛ در `/auth/session` فقط به همان origin برگردد |

فقط SHA-256 شناسهٔ نشست در SQLite نگهداری می‌شود؛ شناسهٔ خام cookie پس از ورود rotate می‌شود. Logout ردیف را حذف می‌کند؛ درخواست احرازشده زمان idle را تازه می‌کند؛ ورود پاک‌سازی زمان‌گذشته انجام می‌دهد و CLI `sessions prune` پاک‌سازی دستی دارد. Session فقط هویت احرازشده را متصل می‌کند؛ RoleGrant جاری پیش از اعمال mutation در همان transaction خوانده می‌شود.

## LoginAttempt (محدودسازی تلاش ورود)

| فیلد پیشنهادی | نوع منطقی | قید |
|---|---|---|
| `ipKey`, `loginIpKey` | HMAC-SHA-256 کلید مبدأ و جفت login/IP | متن IP و login خام در جدول ثبت نمی‌شود؛ کلید HMAC محلی خارج از مخزن است |
| `attemptedAt` | زمان UTC | برای شمارش rolling window پانزده‌دقیقه‌ای و پاک‌سازی پس از ۲۴ ساعت |

هر تلاش پیش از KDF به‌طور اتمی ثبت می‌شود. سقف‌ها ۶۰ تلاش برای IP و ۱۰ تلاش برای جفت login/IP در ۱۵ دقیقه‌اند؛ تلاش بالاتر از سقف با 429 و Retry-After تا انقضای قدیمی‌ترین رکورد رد می‌شود و شمارنده را تمدید نمی‌کند. موفقیت فقط رکوردهای همان جفت را پاک می‌کند. این سازوکار قفل حساب سراسری/دائمی ایجاد نمی‌کند؛ مبدأهای مشترک، به‌خصوص loopback در localhost، می‌توانند محدودیت موقت مشترک داشته باشند.

## روابط و قواعد

- هر ChangeRequest دقیقاً یک `requesterId` دارد؛ User profile یا ثبت‌نام در ChangeFlow مدل نمی‌شود.
- یک `userId` ممکن است هر دو RoleGrant فعال را داشته باشد؛ نقش‌ها هویت جداگانه ایجاد نمی‌کنند.
- دسترسی خواندن از RoleGrant جاری می‌آید: Requester فقط `requesterId` خودش؛ Reviewer همهٔ درخواست‌ها و وضعیت‌ها.
- تغییر محتوا، Status، Version و توضیح مربوطه یک تغییر اتمی است. RequestChanges معتبر `status=ChangesRequested` و `latestReviewerExplanation` را با هم جایگزین می‌کند.
- `journal_mode=WAL` حالت پایگاه داده است: هنگام آماده‌سازی DB فعال و مقدار مؤثر آن بررسی می‌شود. `foreign_keys=ON` و `busy_timeout=5000` تنظیمات هر اتصال‌اند و هنگام ساخت هر اتصال تنظیم و خوانده/تأیید می‌شوند. پیش از mutation حساس یک `BEGIN IMMEDIATE`، نشست معتبر، RoleGrant جاری، مالکیت، state و expected version بررسی می‌شوند؛ بررسی نهایی و write در همان transaction است. CLI revoke نیز همان قفل را می‌گیرد و commit آن نقطهٔ مؤثرشدن لغو است.
- `SQLITE_BUSY` پس از timeout پنج ثانیه موجب rollback و پاسخ `503 Service Unavailable` با `Retry-After: 5` می‌شود؛ mutation خودکار replay نمی‌شود. تشخیص موفقیت فقط با read نسخهٔ جاری و فرمان نو با version تازه ممکن است.
- هیچ فیلد soft-delete/archive/cancel و هیچ status اضافی تعریف نمی‌شود.
- اطلاعات نمایشی کاربر، تاریخچهٔ کامل بازبینی، یا approver history افزوده نمی‌شود؛ Spec آن‌ها را الزام نکرده است.
- UI هیچ منبع اختیار جداگانه‌ای نیست؛ نقش‌ها و دسترسی‌های نمایشی از پاسخ Backend می‌آیند.

## اعتبارسنجی متنی

تعریف منتخب: grapheme cluster در Backend با `Intl.Segmenter('fa', { granularity: 'grapheme' })` و Node/ICU pin‌شده. trim پیش از non-empty/length و مقدار trim‌شده ذخیره شود. UI سقف را مستقلاً محاسبه یا enforce نمی‌کند و خطای Backend را نشان می‌دهد. آزمون‌های فارسی، اعراب ترکیبی، emoji و ZWJ مرز شمارش را تثبیت می‌کنند.
