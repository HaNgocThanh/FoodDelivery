# Checkout redesign verification — 2026-11-02

Scope: shared CheckoutForm and both checkout wrappers. Existing public shell and approved Inter/white/emerald/amber system. COD success and the online-link creation outcome included; PaymentResultPage is a separate next step. No backend/store/order-hook changes, no new shipping raster.

## Live browser

- Real API and catalog photos on localhost:5156/5173. Both checkout routes display the same form. Guest submit is blocked with a login message; no order request is made.
- Two test items (150,000 pork + 100,000 tomato): subtotal 250,000, shipping 25,000, deposit 15,000 => 290,000. Existing slot identifiers and fees retained. Real cart originally empty and cleaned after checking; no real order/payment submitted.
- Final screenshots at 1440, 1280, 768, 390, 320px, scrollY=0, under ignored `.impeccable/review/checkout/`. Valid alias screenshot is alias-390.jpg. Empty at 1440/320. Inter/contrast, focus and complete Vietnamese wrapping inspected.

## Isolated browser fixture

Open `/tests/fixtures/checkout.html?case=cod` with Vite running. This dev-only entry is not a production build input. It uses in-memory cart/auth storage and an Axios adapter that handles every request and rejects unexpected ones. Synthetic profile/product/order values are labeled; no request reaches the real API. `Cho phép phản hồi` releases a held mock order response; request counters/payload are visible. Other cases: `error`, `online`, `cod-only`, `methods-error`.

- Invalid phone: no create request; invalid field gets focus and a local accessible error.
- Voucher BAD: error; MIN: 300k minimum rejected for 250k subtotal; SAVE: 10% reduction25k. Gold tier points floor22k after voucher; tip20k => total263k. Expected-total payload263000 with selected slot-b, note and leave-at-door false verified.
- FIXED voucher500k cannot make product subtotal negative: fees remain40k. Removing voucher restores total.
- Doubleclick submits once. Pending button and recipient fields disable. The payload contains quantity-only items, recipient snapshot, slot, notes, tip, coupon/points and expected total.
- Rejected out-of-stock order retains recipient and other state, presents a recoverable error; another deliberate submit sends the next request.
- COD success shows server order ID/date/total and follow-up links; cart clears.
- Online link creation failure shows the already-created order. Retry requests the link for that ID: one order, two link requests. No duplicate order form remains. COD-only methods hides online; failed methods query shows retry, which recovers.
- Long product name and missing image render in the shared placeholder on 320px. Pending, validation, failed order, COD success and online retry have labeled fixture captures; these do not prove a live financial transaction.

## Quality and limits

- Impeccable detector ran once: only Inter overused-font warning, intentional pinned brand choice. No second detector.
- Existing account-keyed wrappers, profile request cancellation, mutation cache invalidation and backend-authoritative order/stock checks retained. Native radios, labels, autocomplete, errors and keyboard focus replace clickable div choices. No new dependencies.
- Price/stock-change and transaction recovery were exercised with isolated responses, not a newly placed Oracle order. PaymentResultPage, full login redesign and authenticated/admin routes remain outside this step.

- Final production build and existing 10 tests pass. Lint reports three pre-existing warnings after isolating the fixture component export. Test-only JSON diagnostics wrap on phone; they are excluded from the product build.

- Finish reviewer scored both material fixes resolved (ship at fix-list scope): voucher500k on250k now displays effective discount250k, fees40k and total40k; isolated expected-total payload remains40000. DESIGN/sidecar include checkout and outcomes, with PaymentResultPage still separate. Final capture pass uses a discarded warmup screenshot to avoid a browser full-page scrollbar reflow/clipping artifact; saved widths match all five requested viewports.
