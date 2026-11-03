---
version: 1
slug: "account"
primary_target: "Frontend_UI/src/components/account/AuthForm.tsx"
related_targets: ["Frontend_UI/src/pages/LoginPage.tsx", "Frontend_UI/src/pages/RegisterPage.tsx", "Frontend_UI/src/pages/ForgotPasswordPage.tsx", "Frontend_UI/src/pages/ResetPasswordPage.tsx", "Frontend_UI/src/pages/ProfilePage.tsx", "Frontend_UI/src/styles/account.css"]
---

# Account

Mode: Operate. Code-led extension of approved shopping system, no new comp/identity round.

## Direction contract

**THESIS:** Complete authentication with clear fields and truthful feedback, then read real account information without decorative membership promises.

**OWN-WORLD:** Inter, white, fine slate rules, emerald primary actions and headings, restrained spacing. No FoodMart rebrand, voucher/promotional claims, gradients or fake card/progress.

**STORY:** Login/register/forgot/reset keep existing endpoints and role routes. Optional profile refresh cannot overwrite a later account. Recovery keeps email +6-digit OTP; missing email has a recovery path. Profile exposes owned data, real tier/points and keyboard tabs. No own-profile update/current-password-change endpoint exists; replace disabled save forms with truthful read-only info and a link to existing OTP recovery, not a new backend feature.

**FIRST VIEWPORT:** One short h1 and focused form column; register two columns on desktop and one on phone. Profile uses compact tier/points and tabs, with readable owned fields. Footer links keep login/register/recovery connected.

**FORM:** Labeled native fields, autocomplete, visible password toggle, inline validation, pending lock and recoverable errors. Preserve exact password characters. Clear session cache through existing auth-store actions. Ignore unmounted/old-session responses. Reset form identity follows URL email; profiles keyed by account/token. All writes and synthetic password entry tested only in an isolated adapter/memory harness, never a real credential/account change.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
