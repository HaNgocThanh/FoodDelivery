# Account redesign verification

Date: 2026-11-03. Scope: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account/profile`.

## Implementation and capability

Shared labeled authentication form, concise Vietnamese, white/Inter/emerald styling, password visibility, field errors and recoverable server errors. Profile has keyboard-operable information/address/password tabs, actual membership tier/points, loading/error/retry and logout states. Existing routes, role redirects and backend contracts remain.

Owner API supports GET profile only; user PUT/reset-by-ID is Admin-only. Profile information/address are read-only. Password panel links the existing email/OTP recovery flow. This change does not implement profile saving or a new password API.

Submission locks prevent duplicate requests. Exact password characters are preserved. Async replies are ignored after unmount or session/account changes; profile responses must match the owner. Existing auth-store cache cleanup is exercised on login/logout.

## Automated checks

- Final `npm run build`: passed (TypeScript + Vite production).
- `npm test`: 19 tests passed, including 3 account utility tests; existing order/payment/cart regressions retained.
- `npm run lint`: no errors; two existing unrelated warnings in ReviewModal and CustomerLiveChat.
- Impeccable detector ran once: only Inter saturation warning; Inter is the explicitly approved incumbent font.

## Browser evidence

CUA browser tests used localhost:5173 with API on 5156. Actual public forms, missing-email recovery and guest profile redirect were checked. No real account was registered, mail sent or password changed.

The isolated `tests/fixtures/account.html` harness intercepts every Axios request. Its auth/cart persistence and localStorage surrogate are memory-only. It uses actual auth-store actions and query client so cache cleanup is observed without changing persisted user state. Synthetic data is visibly labeled; toolbar/state output is test-only. Output contains booleans for password preservation and Customer role, never password or OTP values.

Verified with fixtures:

- Local field validation and error focus; password show/hide and unchanged whitespace; invalid OTP/confirmation produce no request.
- Login/register/forgot/reset pending locks (double-click sends one request), rejection retains drafts, retry succeeds.
- Customer/Admin login destinations, Customer-only registration, profile-fetch failure after login still permits authentication.
- Forgot-to-reset email navigation; missing email recovery; reset failure/expired response and success clear form fields.
- Leaving login before reply or switching account while profile sync is pending prevents stale navigation/session updates.
- Profile loading/error/retry; late previous-owner reply ignored, logout clears private cache, guest fallback.
- Tabs support arrows/Home/End and selected ARIA state; long/empty profile values and zero actual points render honestly.

Canonical captures are in `.impeccable/review/account/captures/` (local ignored evidence). Live login/register/forgot-password/reset-password and profile information/address/password fixture states were captured at 1440, 1280, 768, 390 and 320px. Edge-state captures cover validation/pending/error/success, missing email, profile loading/error/long/empty/guest. Required image widths were verified after capture; no horizontal content overflow observed.

The tropical circular badge in live development captures is the React Query Devtools trigger from `src/main.tsx`, excluded from production product design. It is absent from the production Devtools implementation. `live-login-focus-320.jpg` is auxiliary scrolled focus evidence, not canonical full-page 320px evidence.

No new shipping raster was introduced. Existing homepage asset provenance remains unchanged. Independent finish verdict: see `account-finish-review.md`.
