# تأمین حساب و نقش با CLI

CLI با `npm run cli -- <command>` اجرا می‌شود و هیچ listener شبکه ندارد. ابتدا اپراتور کلید HMAC محلی ۳۲ بایتی و ACL آن را طبق `docs/local-security.md` آماده می‌کند.

- `account-create` گذرواژه را در prompt می‌گیرد و آن را در آرگومان process یا log نمی‌نویسد؛ نقش‌های اولیه اختیاری‌اند.
- `role-grant <userId> <Requester|Reviewer>` و `role-revoke ...` فقط از اپراتور محلی اجرا می‌شوند. revoke و عملیات API از SQLite write transaction یکسان استفاده می‌کنند؛ commit هرکدام نقطهٔ ترتیب/مؤثرشدن است.
- `sessions-prune` نشست‌های منقضی را حذف می‌کند.
- پوشهٔ DB و WAL را با اسکریپت `scripts/Set-ChangeFlowAcl.ps1` فقط برای حساب اجرای سرویس و اپراتور تعیین‌شده محدود کنید. اسکریپت ACL را جایگزین می‌کند؛ مسیر را آگاهانه و دقیق ارائه کنید.
- فایل DB و key file را در مسیر محلی محافظت‌شده نگه دارید؛ حساب دیگری نباید فایل‌ها را بخواند یا تغییر دهد.