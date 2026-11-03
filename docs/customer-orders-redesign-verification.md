# Customer orders redesign verification — 2026-11-03

Scope: public `/track-order`, shared personal page on `/my-orders` and `/account/orders`, shared progress/summary/lines/totals, inline cancellation/support/review. Approved Inter/white/emerald/amber system, concise Vietnamese. No backend, auth-store, cart-store or ProtectedRoute changes. No new reorder/payment API. Previous payment-result commit53c7fdb.

## Client behavior

- Public lookup retains orderID+phone API contract and renders only API-masked phone/address. Canonical positive int32 IDs and supported phone strings are validated locally; inputs keep stable accessible names/descriptions when errors appear. Results require matching responseID. No public lookup result is persisted in URL/local storage or private query cache.
- Aborted/obsolete lookup replies cannot replace current results. Double submit locks one request; stop/reset aborts and increments generation. Real retry reissues lookup; errors retain values. Result heading receives focus; no decorative smooth-scroll animation.
- Shared status mapping supports numeric/string enums. Cancelled and unknown states have explicit text and no active progress step. No fictional carrier, ETA or detailed event history.
- Personal list shows orderID/date/quantity/status/authoritative total; native details reveal items, recipient snapshot, payment method and fee/discount/point breakdown. Current catalog photos load only when expanded; price comes from order snapshot. Missing/deleted photos use shared placeholder. Effective voucher display caps at product subtotal where available.
- Original conditions retained: pending cancellation, completed-only unreviewed product ratings, completed/cancelled support. Inline cancellation confirmation and forms replace native/modal interruption. Subject200/message4000 and review1000 limits follow current DB shapes; star radios have44px targets. Success only after API acknowledgement/refetch, never immediately after submit. Drafts survive errors.
- Current-session guards and account/token keyed page reset prevent an old mutation callback from updating another account. Query/invalidation keys are scoped by owner; public product-image queries stay public. Server still enforces ownership/status.

## Checks

- Production build passed.16 frontend tests passed (13 previous +3 order permission, tracking boundary/format, error/date tests). Lint:only3 existing warnings (ProfilePage export, ReviewModal dependencies, CustomerLiveChat Wifi). Unused legacy ReviewModal file was left unchanged.
- Vite/API restarted atlocalhost5173/5156 with local SMTP override. Live tracking form checked at1440/1280/768/390/320px; no document overflow. Both personal URLs redirect guests to existing login. Fixture guest personal page shows a login action with no orders query.
- Browser fixtures use memory-only auth/cart and intercept every Axios request; no actual order cancelled, ticket sent or review written. Source `tests/fixtures/customer-orders.html/.tsx` is a Vite-only dev entry, not a production build input.
- Tracking:empty/invalid submission0calls; formatted+84 phone accepted; doubleclick1call; not-found error keeps values; retry succeeds; stop old request then begin new lookup ignores old response and shows new ID. Public result exposes masked090****000 andmaskedaddress only.
- Cancellation:keep confirmation0calls; double confirm1call; disabled pending controls; success refetch changes badge and removes cancel action. Simulated status rejection keeps order unchanged and shows error.
- Support:doubleclick1call; error retains subject/message; deliberate retry2 succeeds. Review:doubleclick1call; pending does not show thank-you; error retains star/comment; success marks reviewed after refetch. Numeric/string statuses and already-reviewed conditions covered in unit tests.
- Account switch during pending cancellation:old cards and drafts disappear, new account empty list; releasing old response does not show old success or trigger extra old refetch (orders count2 for two account reads).
- Primary evidence at `.impeccable/review/customer-orders/captures/`:actual blank tracking shell5 widths; personal summaries/details5 widths; tracking result5 widths; phone inline forms and cancelled/unknown/approved; empty/guest/loading/error and mutation supplements. All final captures document top0. A discarded warmup avoids browser full-page scrollbar reflow artifact. Fixture toolbar and synthetic names/amounts are labeled and excluded from product UI.
- Impeccable detector ran once:only pinned Inter overused-font warning (intentional). No new raster ships. React checklist:derived display data, stable order/product keys, native controls, owner-scoped cache and stale-response guards; no new dependencies.

## Limits

The browser mutation outcomes are isolated response simulations, not live Oracle writes. No authenticated real customer order data was used for screenshots. Backend masking/ownership/cancellation/review validation remains authoritative and unchanged. Account/login/profile/admin redesign follows separately; their current interiors are not claimed complete.

- Fresh independent finish review returned ship with no material fixes after source, viewport/state captures and persistence checks. DESIGN/sidecar preserve normative tokens and incumbent snippets; narrative parity asserted and parent git diff --check passes.
