# Tasks: مدیریت درخواست تغییر ChangeFlow

**ورودی**: [Spec](spec.md)، [Plan](plan.md)، [Research](research.md)، [مدل داده](data-model.md)، [قرارداد HTTP](contracts/http-api.md)، [Quickstart](quickstart.md)

**قالب**: `.specify/templates/tasks-template.md`؛ همهٔ Taskها شناسه، خروجی/مسیر و وابستگی دارند. آزمون‌ها به‌علت قانون‌نامه و Assignment اجباری‌اند و optional نیستند.

**قواعد اجرا**:

- هر Task تا اجرای واقعی unchecked می‌ماند. در مرحلهٔ فعلی هیچ Taskی اجرا نشده است.
- **T001 gate مسدودکننده** است؛ هیچ Task دیگری پیش از گذر آن آغاز نشود. در صورت شکست نصب یا آزمون driver، کار وابسته متوقف و انتخاب driver بازبینی شود.
- API و آزمون‌های Backend باید پیش از UI تمام شوند.
- هر mutation حساس نشست جاری، RoleGrant، مالکیت، وضعیت و expected version را در همان SQLite transaction بررسی می‌کند. CLI لغو نقش همان مرز را می‌گیرد و commit نقطهٔ مؤثرشدن لغو است.
- اگر پاسخ عملیات به علت اعتبارسنجی/مجوز/وضعیت/نسخه/SQLITE_BUSY رد شود، rollback کامل و snapshot ذخیره‌شده بدون تغییر نامعتبر می‌ماند.

## Phase 1: آماده‌سازی و سازگاری ابزارها

**Purpose**: تثبیت نسخه‌ها، ابزارهای پایه و gate سازگاری واقعی Windows/Node/SQLite.

- [ ] **T001** [Setup] نسخهٔ دقیق Node LTS، npm و نسخه‌های پایدار TypeScript، Express 5، React، Vite، ابزارهای آزمون و `better-sqlite3` را از release/manifest رسمی بازبینی و pin کن؛ baseline پیشنهادی Node `26.13.1` و `better-sqlite3@13.1.1` است. npm workspace واحد و lockfile مشترک ریشه را تثبیت کن. روی Windows و معماری واقعی هدف clean install انجام بده؛ native binding را load کن؛ فایل DB بساز/ببند، transaction و rollback را اجرا کن، و `SQLITE_BUSY` را با اتصال دوم بررسی کن. مستند سازگاری و lockfile را ثبت کن. **خروجی**: ماتریس نسخه/شواهد، `.node-version`, `package.json`, `package-lock.json`, `web/package.json`, `docs/dependency-compatibility.md`. **وابستگی**: ندارد. **Gate**: تا ثبت نتیجهٔ موفق همهٔ بررسی‌های محلی، T002–T053 مسدودند.
- [ ] **T002** [Setup] ساختار root، `src/`, `tests/`, `web/` و scriptهای پایهٔ PowerShell/ npm را مطابق Plan بساز؛ API و UI scriptها نباید مرزهای کد کسب‌وکار را جابه‌جا کنند. **خروجی**: `package.json`, `src/`, `tests/`, `web/`, `.gitignore`. **وابستگی**: T001.
- [ ] **T003** [P] [Setup] تنظیمات TypeScript Backend، strict mode و emit مسیر build را ثبت کن. **خروجی**: `tsconfig.json`, `tsconfig.build.json`. **وابستگی**: T002.
- [ ] **T004** [P] [Setup] تنظیمات TypeScript/Vite برای React، build و proxy هم‌مبدأ `/api` به Backend را ثبت کن. **خروجی**: `web/tsconfig*.json`, `web/vite.config.ts`. **وابستگی**: T002.
- [ ] **T005** [P] [Setup] متغیرهای محیطی مجاز، محل DB محلی، allowlist Origin و حفاظت secretها را مستند کن؛ secret/password در مخزن یا default ناامن نباشد. **خروجی**: `config/environment.ts`, `.env.example`, `docs/local-security.md`. **وابستگی**: T002.

## Phase 2: مدل داده، Persistence و مرز تراکنش

**Purpose**: ساخت schema و یک ترتیب اتمی مشترک پیش از Use Caseها.

- [ ] **T006** [Foundation] Migrationهای SQLite برای `IndividualAccount`, `ServerSession`, `CurrentRoleGrant`, `ChangeRequest` و index/unique/FK لازم را بساز؛ گذرواژهٔ خام ذخیره نشود، Session id خام ذخیره نشود، version و چهار status محدود باشند. **خروجی**: `src/persistence/migrations/`, `src/persistence/schema.ts`. **وابستگی**: T001, T002.
- [ ] **T007** [Foundation] اتصال `better-sqlite3@13.1.1` را با مسیر DB محلی، `journal_mode=WAL`، `foreign_keys=ON` و timeout پنج ثانیه پیاده کن؛ helper transaction کوتاه `BEGIN IMMEDIATE` و rollback کامل داشته باشد؛ هیچ async/KDF/network داخل transaction مجاز نباشد. **خروجی**: `src/persistence/database.ts`, `src/persistence/transaction.ts`. **وابستگی**: T006.
- [ ] **T008** [Foundation] آزمون Persistence برای migration، commit/rollback، رقابت دو connection/process و SQLITE_BUSY پس از timeout بنویس؛ خطا نباید ردیف نیمه‌کاره بگذارد و بعد از خطای transaction وضعیت connection کنترل شود. **خروجی**: `tests/integration/persistence/transaction.test.ts`, `tests/integration/persistence/busy.test.ts`. **وابستگی**: T007.

## Phase 3: احراز هویت، نشست و CSRF

**Purpose**: identity server-derived و نشست پایدار، پیش از API کسب‌وکار.

- [ ] **T009** [Foundation] سرویس async `crypto.scrypt` با `N=2^17,r=8,p=1,keylen=64,maxmem=256 MiB`, salt تصادفی امن 16 بایتی و ذخیرهٔ metadata پیاده کن؛ مقایسهٔ hash زمان‌ثابت باشد. **خروجی**: `src/application/auth/password-hasher.ts`, `src/domain/account.ts`. **وابستگی**: T006, T007.
- [ ] **T010** [Foundation] آزمون hash/verify، salt یکتای حساب‌ها، پارامترهای ذخیره‌شده، گذرواژهٔ نادرست و ورودی‌های مرزی را اضافه کن؛ KDF در DB transaction اجرا نشود. **خروجی**: `tests/unit/auth/password-hasher.test.ts`. **وابستگی**: T009.
- [ ] **T011** [Foundation] Session opaque با token تصادفی 32 بایتی، نگهداری SHA-256 شناسه و CSRF token 32 بایتی در SQLite، rotate پس از login، idle timeout 30 دقیقه، absolute timeout 12 ساعت، lastSeen و logout/delete را پیاده کن. نشست منقضی رد شود؛ cleanup هنگام login و زیر‌فرمان `sessions prune` فراهم باشد؛ از MemoryStore استفاده نشود. **خروجی**: `src/persistence/session-store.ts`, `src/application/auth/session-service.ts`. **وابستگی**: T006–T010.
- [ ] **T012** [Foundation] آزمون rotation، انقضای idle/absolute، logout، نشست ناشناخته/منقضی و cleanup را با خواندن مستقیم SQLite بنویس. **خروجی**: `tests/integration/auth/session-lifecycle.test.ts`. **وابستگی**: T011.
- [ ] **T013** [Foundation] middleware CSRF/Origin را بساز: exact Origin allowlist، CSRF token روی همهٔ تغییرها و logout، Origin check روی login، cookie `HttpOnly; SameSite=Lax`, `Secure` در HTTPS؛ CORS cross-origin باز نشود. **خروجی**: `src/http/middleware/csrf.ts`, `src/http/middleware/origin.ts`, `src/http/cookies.ts`. **وابستگی**: T005, T011.
- [ ] **T014** [Foundation] آزمون‌های CSRF/Origin برای token غایب/نامعتبر، Origin اشتباه/غایب، login/logout و روش‌های تغییردهنده اضافه کن؛ هیچ mutation رخ‌ندهد. **خروجی**: `tests/http/security/csrf-origin.test.ts`. **وابستگی**: T013.
- [ ] **T015** [Foundation] مسیرهای login/session/logout و middleware هویت را پیاده کن؛ subject فقط از credential/session معتبر استخراج شود، role/userId دلخواه client رد شود، خطای login اطلاعات حساس لو ندهد. **خروجی**: `src/http/routes/auth.ts`, `src/application/auth/authenticate.ts`. **وابستگی**: T011–T014.
- [ ] **T016** [Foundation] آزمون قرارداد و یکپارچهٔ auth، cookie options، CSRF، 401، logout و رد استفادهٔ session منقضی را بنویس؛ پاسخ HTTP و ردیف Session/Business DB سنجیده شوند. **خروجی**: `tests/http/auth/auth-contract.test.ts`, `tests/integration/auth/auth-flow.test.ts`. **وابستگی**: T015.

## Phase 4: CLI محلی حساب و نقش

**Purpose**: provisioning خارج از API محصول، با دسترسی OS محدود و transaction مشترک.

- [ ] **T017** [Foundation] CLI بدون listener شبکه برای ایجاد حساب فردی، grant/revoke نقش و prune نشست بساز؛ گذرواژه را به‌شکل امن تعاملی بگیرد، در آرگومان/log ننویسد، عملیات DB را با همان transaction helper انجام دهد و اسکریپت ACL Windows را برای حساب‌های مجاز بساز. **خروجی**: `src/cli/index.ts`, `src/cli/accounts.ts`, `src/cli/roles.ts`, `scripts/Set-ChangeFlowAcl.ps1`, `docs/cli-provisioning.md`. **وابستگی**: T006–T015.
- [ ] **T018** [Foundation] آزمون CLI برای account create و نقش‌ها، ورودی نامعتبر، atomic grant/revoke و sessions prune اضافه کن؛ خروجی/exit code و snapshot DB بررسی شود. Factoryهای identity/session/roles صرفاً در `tests/fixtures` بساز؛ مسیر fixture در runtime قابل دسترس نباشد. **خروجی**: `tests/integration/cli/provisioning.test.ts`, `tests/fixtures/authenticated-user.ts`. **وابستگی**: T017.

## Phase 5: قواعد کسب‌وکار و HTTP API، همراه آزمون Backend

**Purpose**: اجرای FRهای Change Request؛ هر سناریوی حساس علاوه بر HTTP، DB را بررسی می‌کند.

- [ ] **T019** [Foundation] Application transaction boundary برای mutationهای Change Request بساز: درون یک transaction کوتاه و پس از `BEGIN IMMEDIATE` نشست جاری، RoleGrant جاری، مالکیت، status و expected version را بخوان؛ Self-Approval را با userId پایدار رد کن؛ تصمیم/تغییر محتوا و status/version را اتمی commit کن. **خروجی**: `src/application/change-requests/authorized-transaction.ts`, `src/domain/authorization.ts`. **وابستگی**: T007, T011, T015, T017.
- [ ] **T020** [Foundation] آزمون یکپارچهٔ مرز مشترک بنویس که session/role/state/version بررسی‌شده واقعاً با write در همان transaction باشند؛ رد مجوز/مالکیت/state دادهٔ ذخیره‌شده را ثابت نگه دارد. **خروجی**: `tests/integration/change-requests/authorized-transaction.test.ts`. **وابستگی**: T019.
- [ ] **T021** [Foundation] validator واحد متن را با trim و `Intl.Segmenter('fa',{granularity:'grapheme'})` برای عنوان/شرح/دلیل/توضیح پیاده کن؛ طول بایت و UTF-16 count استفاده نشود. **خروجی**: `src/domain/text-validation.ts`, `src/domain/change-request.ts`. **وابستگی**: T001, T019.
- [ ] **T022** [Foundation] آزمون واحد transitionها و Unicode grapheme فارسی، اعراب ترکیبی، emoji/ZWJ، حد دقیق و یک cluster بیش از حد را اضافه کن؛ همین helper باید در تمام مسیرهای Backend استفاده شود. **خروجی**: `tests/unit/domain/change-request.test.ts`, `tests/unit/domain/text-validation.test.ts`. **وابستگی**: T021.
- [ ] **T023** [P1] [US1] آزمون پذیرش **Assignment سناریو ۱ / AC-001** را قبل از endpoint بنویس: ایجاد موفق Draft، پاسخ HTTP و snapshot شامل پنج دادهٔ لازم، requesterId معتبر و status=`Draft`. **خروجی**: `tests/acceptance/assignment/AC-001-create-draft.test.ts`. **وابستگی**: T016, T018–T022.
- [ ] **T024** [P1] [US1] Use Case و `POST /change-requests` را پیاده کن؛ Requester جاری، فیلدهای trim/validate، requesterId از Session و status اولیهٔ Draft از server باشند. **خروجی**: `src/application/change-requests/create.ts`, `src/http/routes/change-requests.ts`. **وابستگی**: T023.
- [ ] **T025** [P1] [US1] آزمون پذیرش **Assignment سناریو ۲ / AC-003** را برای Submit معتبر Draft بنویس؛ پاسخ و DB باید PendingReview و version جدید را نشان دهند. **خروجی**: `tests/acceptance/assignment/AC-003-submit-draft.test.ts`. **وابستگی**: T024.
- [ ] **T026** [P1] [US1] Use Case و `POST /change-requests/{id}/submit` را برای Draft و ChangesRequested پیاده کن؛ owner/requester و version جاری الزامی است. **خروجی**: `src/application/change-requests/submit.ts`, `src/http/routes/change-requests.ts`. **وابستگی**: T025.
- [ ] **T027** [P1] [US2] آزمون پذیرش **Assignment سناریو ۳ / AC-007** را جداگانه بنویس: کاربر دارای هر دو نقش، درخواست خودش را Approve می‌کند؛ HTTP رد شود و تمام محتوای DB/status/version ثابت بماند. **خروجی**: `tests/acceptance/assignment/AC-007-self-approval.test.ts`. **وابستگی**: T026.
- [ ] **T028** [P1] [US2] آزمون پذیرش **Assignment سناریو ۴ / AC-005** را جداگانه بنویس: Reviewer مجاز مستقل موفق به Approve شود؛ HTTP موفق و status ذخیره‌شده Approved باشد. **خروجی**: `tests/acceptance/assignment/AC-005-independent-reviewer-approval.test.ts`. **وابستگی**: T027.
- [ ] **T029** [P1] [US2] `POST /approve` و Use Case بازبینی را پیاده کن؛ Reviewer جاری و مستقل از owner، PendingReview و version جاری را داخل transaction بررسی کن؛ self-approval رد شود. **خروجی**: `src/application/change-requests/approve.ts`, `src/http/routes/change-requests.ts`. **وابستگی**: T028.
- [ ] **T030** [P1] [US4] آزمون پذیرش **Assignment سناریو ۵ / AC-012** را بنویس: ویرایش Approved رد شود و تمام ستون‌های درخواست بدون تغییر بمانند. **خروجی**: `tests/acceptance/assignment/AC-012-approved-immutable.test.ts`. **وابستگی**: T029.
- [ ] **T031** [P1] [US3, US4] `PATCH /change-requests/{id}` را برای owner در Draft/ChangesRequested پیاده کن؛ وضعیت Approved رد شود؛ validation کامل پیش از commit باشد و version افزایش یابد. **خروجی**: `src/application/change-requests/edit.ts`, `src/http/routes/change-requests.ts`. **وابستگی**: T030.
- [ ] **T032** [P1] [US4] آزمون پذیرش **Assignment سناریو ۶ / AC-013** را بنویس: تغییر اول نسخهٔ جدید ذخیره کند؛ mutation مبتنی بر نسخهٔ قبلی conflict دهد و آخرین content/status/version را دست‌نخورده بگذارد. **خروجی**: `tests/acceptance/assignment/AC-013-stale-version-no-overwrite.test.ts`. **وابستگی**: T031.
- [ ] **T033** [P1] [US4] ETag و `If-Match` را برای edit/submit/approve/request-changes پیاده کن؛ نسخهٔ کهنه یا مفقود طبق قرارداد پاسخ داده شود و update شرطی داخل transaction انجام گیرد. **خروجی**: `src/http/versioning.ts`, `src/application/change-requests/version-check.ts`, `src/http/routes/change-requests.ts`. **وابستگی**: T032.
- [ ] **T034** [P1] [US2] آزمون RequestChanges معتبر/نامعتبر بنویس: explanation trim/nonempty/سقف؛ status و آخرین توضیح با هم commit شوند؛ ورودی نامعتبر هیچ ستون/نسخه‌ای را تغییر ندهد. **خروجی**: `tests/integration/change-requests/request-changes-atomic.test.ts`, `tests/http/change-requests/request-changes.test.ts`. **وابستگی**: T033.
- [ ] **T035** [P1] [US2] Use Case و `POST /request-changes` را پیاده کن؛ توضیح Reviewer الزامی، validated، و فقط همراه ChangesRequested ذخیره شود؛ توضیح در edit/submit حفظ و با بعدی جایگزین شود. **خروجی**: `src/application/change-requests/request-changes.ts`, `src/http/routes/change-requests.ts`. **وابستگی**: T034.
- [ ] **T036** [P1] [US5] آزمون فهرست/جزئیات و explanation بنویس: Requester فقط own، Reviewer همهٔ وضعیت‌ها از جمله Draft، کاربر دو‌نقشی scope Reviewer؛ جزئیات غیرمجاز افشا نشود؛ status و آخرین توضیح برای مجازها قابل دیدن باشد. **خروجی**: `tests/http/change-requests/read-access.test.ts`, `tests/integration/change-requests/read-access.test.ts`. **وابستگی**: T035.
- [ ] **T037** [P1] [US5] `GET /change-requests` و `GET /change-requests/{id}` را با scope مجوز مشخص‌شده در query/use case پیاده کن؛ read access مجوز write ندهد. **خروجی**: `src/application/change-requests/read.ts`, `src/http/routes/change-requests.ts`. **وابستگی**: T036.
- [ ] **T038** [P1] [US4] آزمون فرمان‌های تکراری/قدیمی و هم‌زمان را بنویس: Submit/Approve/RequestChanges فقط با status/version جاری؛ حداکثر یک mutation روی version مشترک؛ فرمان قدیمی بعد از بازگشت به status مشابه رد شود. **خروجی**: `tests/integration/change-requests/replay-and-concurrency.test.ts`. **وابستگی**: T033, T035, T037.
- [ ] **T039** [P1] [US4] نگاشت خطاهای validation، 401/403/404، state conflict، stale version و SQLite busy را در HTTP مرکزی پیاده کن؛ همهٔ شکست‌های transaction rollback شوند؛ busy exhaustion پاسخ `503` با `Retry-After: 5` دهد و mutation خودکار replay نشود. **خروجی**: `src/http/errors.ts`, `src/application/change-requests/error-mapping.ts`. **وابستگی**: T033–T038.
- [ ] **T040** [P1] [US4] آزمون integration با writer دوم برای SQLITE_BUSY و rollback کامل mutation اضافه کن؛ HTTP موقت/خطای مستند و snapshot درخواست، version و RoleGrant را پس از رد بررسی کن. **خروجی**: `tests/integration/change-requests/busy-rollback.test.ts`. **وابستگی**: T039.
- [ ] **T041** [P1] [US2, US4] آزمون لغو نقش قبل/بعد از commit و حفظ نقش دیگر بنویس؛ revoke زودتر باعث رد mutation بدون تغییر DB شود، mutation commitشده با revoke بعدی برنگردد، نقش دیگر همچنان مجاز بماند. **خروجی**: `tests/integration/authorization/role-revocation-order.test.ts`. **وابستگی**: T039, T040.
- [ ] **T042** [Foundation] [US2] اسکریپت ACL ساخته‌شده در T017 را روی پوشهٔ آزمایشی Windows اجرا و idempotency، دسترسی حساب مجاز و رد حساب غیرمجاز را بررسی کن؛ روش restore را مستند کن. **خروجی**: `tests/windows/acl-provisioning.ps1`, `docs/cli-provisioning.md`. **وابستگی**: T017, T041.
- [ ] **T043** [P1] [US1, US2, US3, US4, US5] آزمون‌های Regression برای AC-002,004,006,008–011,014–031,032–036 و FR-001–FR-026 را تکمیل کن؛ AC-023 باید حذف‌نشدن/نبود route حذف و ثبات DB را نیز پوشش دهد. برای خطای حساس پاسخ HTTP و snapshot محتوای کامل/status/version/explanation بررسی شود. **خروجی**: `tests/acceptance/change-requests/`, `tests/http/change-requests/`, `tests/integration/change-requests/`. **وابستگی**: T022–T042.

## Phase 6: UI پس از Backend

**Purpose**: client ساده‌ای که به API متکی است؛ حفظ تغییرات ذخیره‌نشده هنگام refresh/conflict.

- [ ] **T044** [P2] [US6] shell React/Vite را با routing حداقلی و API client هم‌مبدأ بساز؛ auth state از `/auth/session` بیاید و هرگز userId/role از UI انتخاب یا به‌عنوان اختیار ارسال نشود. **خروجی**: `web/src/main.tsx`, `web/src/App.tsx`, `web/src/api/client.ts`. **وابستگی**: T043.
- [ ] **T045** [P2] [US6] آزمون UI auth shell برای logged-out/login/logout/session-expired و CSRF header بنویس؛ وضعیت role فقط از API جاری نمایش داده شود. **خروجی**: `web/tests/auth/session.test.tsx`. **وابستگی**: T044.
- [ ] **T046** [P2] [US6] فرم ورود و خروج UI را به endpointها وصل کن؛ پیام خطای غیرحساس، cookie session و CSRF token مطابق قرارداد. **خروجی**: `web/src/features/auth/`. **وابستگی**: T045.
- [ ] **T047** [P2] [US6] view فهرست/جزئیات و نمایش status و latest reviewer explanation را بساز؛ نمایش هر ردیف/جزئیات تابع پاسخ API باشد. **خروجی**: `web/src/features/change-requests/list/`, `web/src/features/change-requests/detail/`. **وابستگی**: T046.
- [ ] **T048** [P2] [US6] آزمون UI scope خواندن Requester/Reviewer و explanation بنویس؛ Reviewer همهٔ statusها از جمله Draft، Requester فقط own؛ کاربر غیرمجاز هیچ جزئیات یا توضیحی نبیند. **خروجی**: `web/tests/change-requests/read-scope.test.tsx`. **وابستگی**: T047.
- [ ] **T049** [P2] [US6] فرم ایجاد، edit و Submit را بساز؛ UI محدودیت‌ها و خطاهای validation را از Backend نشان دهد و الگوریتم طول مستقل نسازد. Dirty state را track کن؛ refresh خودکار نباید دادهٔ ذخیره‌نشده را overwrite کند و پیش از discard/reload انتخاب صریح لازم باشد. **خروجی**: `web/src/features/change-requests/request-form/`, `web/src/features/change-requests/dirty-state.ts`. **وابستگی**: T048.
- [ ] **T050** [P2] [US6] آزمون تعامل فرم برای create/edit/submit، normalization، خطاهای validation، و refresh هنگام dirty state اضافه کن؛ محتوای تایپ‌شده بدون هشدار از دست نرود. **خروجی**: `web/tests/change-requests/request-form.test.tsx`, `web/tests/change-requests/dirty-state.test.tsx`. **وابستگی**: T049.
- [ ] **T051** [P2] [US6] کنترل‌های Reviewer برای Approve و RequestChanges با explanation الزامی بساز؛ خطاهای مجوز، validation و stale-version را نشان بده. در conflict، draft محلی را حفظ و snapshot سرور را کنار آن نشان بده؛ submit را تا بازبینی/تطبیق صریح متوقف کن و mutation را خودکار retry نکن. **خروجی**: `web/src/features/change-requests/review-actions/`, `web/src/features/change-requests/conflict-view.tsx`. **وابستگی**: T050.
- [ ] **T052** [P2] [US6] آزمون component و Playwright E2E با API/SQLite/auth واقعی بنویس: login، Requester/Reviewer visibility، create/edit/submit، independent approve، RequestChanges، CSRF، permission/conflict، حفظ dirty draft و نبود ثبت‌نام عمومی/مدیریت کاربر/حذف در UI. Mock API فقط برای component؛ E2E و Backend access checks واقعی باشند. **خروجی**: `web/tests/change-requests/review-actions.test.tsx`, `tests/e2e/change-flow.spec.ts`, `playwright.config.ts`. **وابستگی**: T051.

## Phase 7: اعتبارسنجی و مستندسازی نهایی

- [ ] **T053** [Polish] تمام تست‌های Backend، شش سناریوی Assignment، آزمون‌های SQLite contention، auth/session/CSRF و UI/E2E را روی Windows/PowerShell واقعاً اجرا کن؛ Build، Test و Validation را جداگانه با فرمان/خروجی/محدودیت ثبت کن؛ بعد از تغییر اسناد، traceability و quickstart را بازبینی کن. **خروجی**: `README.md`, `specs/001-change-request-management/quickstart.md`, `specs/001-change-request-management/research.md`, `docs/validation-report.md`. **وابستگی**: T001–T052.

## ردیابی Requirement و Acceptance به Task

### شش سناریوی اجباری Assignment

| Assignment | Spec AC | آزمون الزامی | پیاده‌سازی |
|---|---|---|---|
| ۱. ایجاد Draft | AC-001 | T023: HTTP + پنج دادهٔ DB | T024 |
| ۲. Submit معتبر | AC-003 | T025: HTTP + PendingReview/version در DB | T026 |
| ۳. رد Self-Approval دو‌نقشی | AC-007 | T027: HTTP رد + DB بدون تغییر | T029 |
| ۴. Approve مستقل | AC-005 | T028: HTTP موفق + Approved در DB | T029 |
| ۵. رد edit روی Approved | AC-012 | T030: HTTP رد + همهٔ فیلدهای DB ثابت | T031 |
| ۶. stale version بدون overwrite | AC-013 | T032: conflict + دادهٔ جدید DB ثابت | T033 |

### Functional Requirements

| نیازمندی | Taskهای اصلی و آزمون |
|---|---|
| FR-001–FR-003, FR-018 | T001–T008, T019, T023–T024, T043 |
| FR-004–FR-005, FR-009–FR-010, FR-012–FR-013 | T021–T026, T030–T031, T043 |
| FR-006–FR-008, FR-011 | T019–T020, T027–T029, T041–T043 |
| FR-014–FR-015, FR-021 | T032–T040, T043 |
| FR-016–FR-017, FR-025 | T034–T037, T043 |
| FR-019–FR-020 | T006–T008, T017–T018, T041–T043 |
| FR-022–FR-023 | T021–T022, T043 |
| FR-024–FR-026 | T025–T026, T034–T035, T038, T043 |
| FR-027–FR-031 | T044–T052 |

### Acceptance Scenarios

- AC-001–AC-013: T023–T033 و Regression T043؛ شش سناریوی الزامی جدا در جدول بالا آمده‌اند.
- AC-014–AC-019 و AC-034–AC-035: T036–T037، T048 و T043.
- AC-020–AC-022 و AC-024–AC-026 و AC-036: T038–T043.
- AC-023 و AC-027–AC-033: T021–T022 و T034–T035 و T043.
- AC-037–AC-045: T044–T052؛ AC-043/044 نیز از Backend T039–T040 پیروی می‌کنند.

## ترتیب و موازی‌سازی

- ترتیب سخت: T001 gate → setup/schema/transaction → auth/session/CSRF → CLI → Application/API + آزمون‌های Backend → contention و role revoke → UI + آزمون‌ها → validation/docs.
- فقط T003، T004 و T005 با `[P]` علامت‌گذاری شده‌اند: پس از scaffold هرکدام فایل‌ها/پیکربندی جدا دارند و یکدیگر را تغییر نمی‌دهند. سایر Taskها وابستگی کد/قرارداد یا آزمون قبلی دارند و عمداً موازی نیستند.
- تست‌های T023/T025/T027/T028/T030/T032 قبل از پیاده‌سازی مسیر متناظر مشخص شده‌اند تا آزمون پذیرش مستقل و قابل ردیابی باشد.

## Notes

- T001 شامل اجرای نصب/compatibility در Implement آینده است؛ این اجرای Tasks فعلی نیست. تا گذر واقعی آن، هیچ build/test/install موفقی ادعا نمی‌شود.
- مسیر HTTP خطا برای Version مطابق قرارداد (`409/412`) و برای contention (`503`) است؛ UI هیچ mutation کهنه را خودکار بازپخش نمی‌کند.
- Analyze و پذیرش انسانی در این artifact انجام‌شده فرض نشده‌اند؛ آن‌ها شواهد جداگانهٔ مراحل بعد هستند.
