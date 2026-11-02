# Payment result verification — 2026-11-02

Scope: `/payment-result`, its confirmation hook and return/result validation. Approved Inter/white/emerald/amber shopping system. No backend, cart-store or checkout changes; no new shipping rasters. Previous checkout commit:44d96bc.

## Behavior

- Missing, malformed or non-success return is unconfirmed, not proof of failure. Authentication and valid positive int ID, nonblank payment ticket and return code00 are required before POST `/api/payments/mock-confirm`.
- Only matching backend order ID and finite nonnegative numeric amount yield success. Zero displays0₫. URL amount/bank/date/transaction strings are not receipt facts and no longer appear.
- StrictMode reattaches the same pending promise. Retry confirms the same order/ticket, with no new order or checkout navigation. Old route/account callbacks cannot mutate current UI/cart/cache.
- Success refreshes only the owner's order-cache prefix and clears the cart only if its items reference is unchanged since that attempt started. This preserves edits during verification. It retains the existing successful-confirmation cart flow; there is no new cross-order cart reconciliation/API.
- Native links/buttons, status/alert text, visible global focus and reduced-motion spinner handling. No unsupported restaurant-preparation/bank-balance claims.

## Checks

- Production build passed;13 frontend tests passed (10 existing plus3 return-validation/confirmed-payload/error-copy tests). Lint has3 pre-existing warnings only: ReviewModal dependencies, ProfilePage FastRefresh export and CustomerLiveChat unusedWifi.
- Live app missing-result and auth-gate states with public shell inspected; responsive captures1440/1280/768/390/320px at scrollY0, document scrollWidth never above clientWidth. Final fullpage capture uses a discarded warmup to avoid the browser's scrollbar reflow/clipping artifact; saved widths match the named viewport. Focus capture also retained.
- All real test-cart items were already removed after checkout; this step does not change the real cart. No actual payment or order confirmation was submitted.

## Isolated flow fixture

Vite-only entry `/tests/fixtures/payment-result.html?case=success&orderId=999997&paymentToken=fixture&vnp_ResponseCode=00`. Every Axios request is intercepted; stores persist only in memory; StrictMode enabled. `Cho phép phản hồi` releases the next pending adapter reply. Toolbar stats expose request count, cart quantity/account and owner/other cache invalidation. These explicit synthetic controls are not product UI or production build inputs.

- StrictMode request count1. Confirmed290k ignores URL fake amount999999999/bankFAKE/date. Success clears unchanged cart and invalidates owner only (otherfalse).
- `retry`: first error preserves cart; second deliberate confirmation succeeds, requests2, same order/token. `expired`: backend ticket rejection shown without inventing success/failure. No new order request exists.
- `mismatch` and `negative`: rejected payload leaves cart/cache intact. `zero`: verified0₫ displayed successfully.
- `guest`:0 confirmation requests. Non00/cancelled and missing returns:0 requests and unconfirmed state.
- Change-link during pending:old reply leaves new resultloading, cart1, cachefalse; new reply confirms newID. Change-account:old reply leaves new accountloading, cart1, cachesfalse. Navigate to invalid/missing route then release pending reply:unconfirmed remains, no cart/cache mutation.
- Change cart while pending:success preserves quantity2 rather than clearing it.
- Test-only captures cover success at all5 widths; auth/loading/error at desktop/320, plus expired/zero/mismatch/stale route/stale account/changed-cart supplements. Evidence lives in ignored `.impeccable/review/payment-result/`.

## Limits

Adapters verify client behavior and server response-contract handling, not a new live bank transaction or Oracle status mutation. The existing protected ticket, expiry, ownership and conditional/idempotent approval still execute in backend unchanged. An actual receipt must come from that backend. Account/admin interiors and subsequent order-tracking redesign are separate stages.

- Impeccable detector ran once: only pinned Inter overused-font warning. Fresh finish reviewer returned ship across the full requested surface/state evidence with no material fixes; DESIGN/sidecar updated and narrative parity verified.
