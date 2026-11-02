# Cart redesign verification — 2026-11-02

Scope: `/cart`, CartAddons presentation and the shared ProductPhoto input type. Checkout, cart store, pricing rules and backend remain unchanged. Approved Inter/emerald/amber system, concise Vietnamese, real catalog photos, no new shipping rasters.

## Checks

- Production build passed. Existing 10 frontend tests passed. Lint has only three pre-existing warnings (ReviewModal dependencies, ProfilePage fast refresh export, CustomerLiveChat unused Wifi).
- Browser: real API at localhost:5156; Vite at localhost:5173. Desktop 1440/1280, tablet 768, phones 390/320 inspected; final captures start at scrollY=0 under `.impeccable/review/cart/` (ignored local evidence).
- Subtotal 250,000 + shipping 25,000 + deposit 15,000 = 290,000. Increase pork from one to two: subtotal 400,000, free shipping, total 415,000. Stock cap two disables plus; reload retains quantity. Exact subtotal 300,000 => free shipping and total 315,000. Checkout navigation retained the same items and 315,000 total; no order placed.
- Remove item, decrease quantity and clear-all cancellation/confirmation verified. Original minus-at-one removal retained. Empty cart has product-list action and no phantom fee summary. All temporary browser test items were removed; initial cart was empty.
- Real suggestions exclude cart contents. Adding chicken/tomato works and updates total; product-detail GET remains immediately before add. API stopped during recommendation fetch: explicit error and retry shown. Restarted API and retry recovered. Backend remains running.
- Keyboard Tab focus visible on confirmation action. Global focus/selection/reduced-motion rules inherited. Photos use shared placeholder on absent/broken URL; no name-based substitute imagery.
- One Impeccable detector run: only Inter overused-font warning, intentional because the approved design pins Inter. React checklist checked: derived totals, event handlers, stable product keys, existing deduplicated query, no new effects or dependencies.

## Limits

This verifies cart interactions and checkout arrival, not a new full order/payment transaction or authenticated/admin routes. Existing fee rules remain estimates; the order API is authoritative at placement. Checkout redesign follows separately.
