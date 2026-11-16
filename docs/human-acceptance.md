# راهنمای پذیرش انسانی ChangeFlow

**وضعیت: اجرا نشده؛ نتیجه را فقط پذیرش‌کننده پس از اجرای دستی ثبت می‌کند.** آزمون خودکار جای تأیید انسانی نیست.

**سناریوی ۱:** آزمون فنی موفق؛ پذیرش انسانی در انتظار بررسی پذیرش‌کننده است.

## آماده‌سازی

1. طبق `specs/001-change-request-management/quickstart.md`، کلید محلی، DB، Origin و server را آماده کنید.
2. با CLI دو حساب بسازید: `requester-dual` با نقش‌های `Requester,Reviewer` و `reviewer-independent` با نقش `Reviewer`.
3. در PowerShell، نمونهٔ ورود در `docs/api-examples.md` را اجرا کنید. نشست PowerShell و CSRF token را فقط در متغیرهای حافظه نگه دارید و چاپ نکنید؛ برای دو حساب session/CSRF جدا بسازید.
4. برای هر درخواست، `id`، پاسخ HTTP، `ETag`، `status`, `version` و محتوای مشاهده‌شده از `GET` مجاز را یادداشت کنید. دادهٔ پیش از عملیات ردشونده را برای مقایسه نگه دارید.

## سناریوهای پذیرش

| # | اقدام دستی | انتظار HTTP | انتظار دادهٔ ذخیره‌شده |
|---|---|---|---|
| ۱. ایجاد Draft | با `requester-dual`، `POST /change-requests` با title/description/reason معتبر بفرستید. | `201`; پاسخ شامل شناسه و ETag است. | GET مالک نشان می‌دهد `Draft`, version `1`, و requesterId همان هویت واردشده است؛ سه متن trim شده‌اند. |
| ۲. Submit معتبر | با ETag ایجاد، `POST /change-requests/{id}/submit` بفرستید. | `200` و ETag جدید. | GET نشان می‌دهد `PendingReview` و version افزایش یافته؛ محتوا ثابت است. |
| ۳. منع Self-Approval | همان حساب دو‌نقشی با ETag جاری `POST /change-requests/{id}/approve` بفرستد. پیش و پس از تلاش GET مجاز بگیرید. | `403`. | snapshot پیش/پس دقیقاً برابر؛ وضعیت همچنان `PendingReview` و version و محتوا ثابت‌اند. |
| ۴. تأیید مستقل | حساب `reviewer-independent` با نشست و CSRF خودش، همان درخواست را با ETag جاری تأیید کند. | `200`. | GET مجاز نشان می‌دهد `Approved` و version افزایش یافته است. |
| ۵. رد ویرایش Approved | مالک با ETag نسخهٔ Approved، `PATCH /change-requests/{id}` با محتوای متفاوت بفرستد. | `409`. | GET قبل/بعد یکسان؛ title/description/reason، status، version و توضیح Reviewer تغییر نکرده‌اند. |
| ۶. جلوگیری از overwrite قدیمی | Draft دیگری بسازید؛ ETag نسخهٔ ۱ را نگه دارید. یک PATCH با آن بفرستید تا نسخهٔ جدید با محتوای «برنده» ثبت شود؛ سپس PATCH دوم را با همان ETag قدیمی و محتوای متفاوت بفرستید. | PATCH اول `200`; PATCH دوم `412`. | GET نشان می‌دهد فقط محتوای PATCH اول، status و version جاری باقی مانده؛ درخواست دوم چیزی بازنویسی نکرده است. |

برای جزئیات headerها و نمونهٔ فرمان‌ها به `docs/api-examples.md` و برای کدهای HTTP به `specs/001-change-request-management/contracts/http-api.md` مراجعه کنید. موارد ناقص/ناموفق و هویت پذیرش‌کننده را جداگانه ثبت کنید؛ این فایل پیش‌فرض هیچ سناریویی را پاس علامت نمی‌زند.
