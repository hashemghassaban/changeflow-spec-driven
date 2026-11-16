# نمونه درخواست‌های ChangeFlow API

این نمونه‌ها برای Windows PowerShell و API محلی `http://127.0.0.1:3000` هستند. آدرس اتصال و Origin مجاز جدا هستند: `$Api` به loopback متصل می‌شود و `$Origin` با allowlist سرور تطبیق دارد. گذرواژه را با prompt وارد کنید؛ مقدار واقعی را در فرمان یا history ننویسید. نشست و CSRF را فقط در متغیرهای حافظه نگه دارید و چاپ نکنید.

## ورود و ایجاد Draft

```powershell
$Api = 'http://127.0.0.1:3000'
$Origin = 'http://localhost:3000'
$Password = Read-Host -Prompt 'Password for requester-dual'
$LoginResponse = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$Api/auth/login" `
  -Headers @{ Origin = $Origin } `
  -ContentType 'application/json' `
  -Body (@{ loginName = 'requester-dual'; password = $Password } | ConvertTo-Json) `
  -SessionVariable RequesterSession
$Login = $LoginResponse.Content | ConvertFrom-Json
$Csrf = $Login.csrfToken
Remove-Variable Password

$Create = Invoke-WebRequest -UseBasicParsing -Method Post `
  -Uri "$Api/change-requests" -WebSession $RequesterSession `
  -Headers @{ Origin = $Origin; 'X-CSRF-Token' = $Csrf } `
  -ContentType 'application/json' `
  -Body (@{ title = 'API change'; description = 'Add a field'; reason = 'Required by users' } | ConvertTo-Json)
$Draft = $Create.Content | ConvertFrom-Json
$DraftEtag = $Create.Headers['ETag']
```

پاسخ ایجاد `201 Created` است. پاسخ شامل `id`, `requesterId`, `status=Draft` و `version=1` است. ETag را برای فرمان بعد نگه دارید.

## Submit و خواندن نسخهٔ جاری

```powershell
$Submit = Invoke-WebRequest -UseBasicParsing -Method Post `
  -Uri "$Api/change-requests/$($Draft.id)/submit" -WebSession $RequesterSession `
  -Headers @{ Origin = $Origin; 'X-CSRF-Token' = $Csrf; 'If-Match' = $DraftEtag }
$Pending = $Submit.Content | ConvertFrom-Json
$PendingEtag = $Submit.Headers['ETag']

$Detail = Invoke-WebRequest -UseBasicParsing -Method Get `
  -Uri "$Api/change-requests/$($Draft.id)" -WebSession $RequesterSession
$Detail.Content | ConvertFrom-Json
$Detail.Headers['ETag']
```

Submit موفق `200 OK` و `status=PendingReview` می‌دهد. درخواست‌های تغییردهنده به `Origin`, `X-CSRF-Token` و ETag جاری در `If-Match` نیاز دارند.

## Login بررسی‌کننده و Approve

در پنجرهٔ جداگانه، با حساب Reviewer مستقل وارد شوید و نشست/CSRF جدا داشته باشید:

```powershell
$ReviewerPassword = Read-Host -Prompt 'Password for reviewer-independent'
$ReviewerLoginResponse = Invoke-WebRequest -UseBasicParsing -Method Post -Uri "$Api/auth/login" `
  -Headers @{ Origin = $Origin } `
  -ContentType 'application/json' `
  -Body (@{ loginName = 'reviewer-independent'; password = $ReviewerPassword } | ConvertTo-Json) `
  -SessionVariable ReviewerSession
$ReviewerLogin = $ReviewerLoginResponse.Content | ConvertFrom-Json
$ReviewerCsrf = $ReviewerLogin.csrfToken
Remove-Variable ReviewerPassword

$Approval = Invoke-WebRequest -UseBasicParsing -Method Post `
  -Uri "$Api/change-requests/$($Draft.id)/approve" `
  -WebSession $ReviewerSession `
  -Headers @{ Origin = $Origin; 'X-CSRF-Token' = $ReviewerCsrf; 'If-Match' = $PendingEtag }
$Approval.StatusCode # 200
```

## RequestChanges

از نشست Reviewer و ETag نسخهٔ `PendingReview` استفاده کنید:

```powershell
$Return = Invoke-WebRequest -UseBasicParsing -Method Post `
  -Uri "$Api/change-requests/$($Draft.id)/request-changes" `
  -WebSession $ReviewerSession `
  -Headers @{ Origin = $Origin; 'X-CSRF-Token' = $ReviewerCsrf; 'If-Match' = $PendingEtag } `
  -ContentType 'application/json' -Body (@{ explanation = 'Please add a rollback note.' } | ConvertTo-Json)
```

توضیح trim‌شده و `ChangesRequested` باید با هم ذخیره شوند. برای خطاهای مورد انتظار، پاسخ HTTP را ثبت کنید و جزئیات را با `GET` مجاز قبل/بعد مقایسه کنید؛ برای `403`, `409`, `412`, `422` یا `428`، دادهٔ درخواست نباید تغییر کند. قرارداد کامل وضعیت‌ها و خطاها در `specs/001-change-request-management/contracts/http-api.md` است.
