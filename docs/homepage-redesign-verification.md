# Homepage redesign verification — 2026-10-30

Scope: homepage, shared public header/footer. User requested less copy, retained FoodDelivery emerald/amber identity, real catalog, code-first build. Selected composition: featured-counter.

## Verified

- Production frontend build passes (`npm run build`). Existing 4 frontend tests pass (`npm test`).
- Lint completes with 3 pre-existing warnings: ProfilePage fast-refresh export, ReviewModal effect dependencies, unused Wifi import in CustomerLiveChat. No warning in newly edited components.
- Browser at `http://localhost:5173/` loads 8 actual products and categories through API `http://localhost:5156` backed by Oracle. API returned product names, prices, stock and image URLs matching the rendered cards.
- All rendered homepage images loaded successfully.
- Category selection changes its pressed state and filters the catalog. Current database has one category containing all 8 products.
- Mobile header search for “Cà chua” navigates to encoded search route and renders its real result.
- Featured beef: increase quantity to 2, add, cart badge becomes 2; cart shows beef quantity 2 and subtotal 500,000 VND. Test item removed afterward.
- Pork belly: add its remaining stock of 2; add/increase controls disable at the limit, and cart shows quantity 2. Test item removed afterward.
- Out-of-stock apple has disabled add and quantity controls.
- No horizontal document overflow at 320, 390, 1280 and 1440px. Full-page captures made at scrollY=0 under `.impeccable/review/`.
- The 127.0.0.1 origin is not in the API's configured CORS origins: observed the real load-error state with recovery controls; testing continued at configured localhost origin. No CORS policy changed.

## Implementation and limits

- Removed synthetic fallback products and unverifiable homepage promotional copy. Loading/error/empty states are explicit; empty state was inspected in source, not induced by changing the database.
- Cart and checkout business contracts are preserved. This pass does not redesign search, product details, cart, checkout or admin content.
- React check: extracted components are module-scoped; categories/catalog requests run independently; no effect-driven derived state; feedback timer cleans up on unmount; product names and state feedback have accessible labels.
- Detector ran once. Only finding: Inter is common. Inter is the project-pinned font and is intentionally retained.
- The new hero photograph embeds its Unsplash origin. Catalog photographs remain externally managed API content. Unused pre-existing `assets/hero.png` is outside this surface's shipping raster set.
- Prior P1/P2 changes were pushed separately as commit `94586c5` before this redesign.

## Finish review

Independent Impeccable finish reviewer initially returned `fix`: mobile floating chat obscured product controls; footer bottom lacked gutters at 1280px. Chat now mounts in the header with a static mobile launcher beside search, retaining the existing live-chat behavior and desktop floating launcher. Footer bottom now follows the content gutters.

Fresh captures at all four widths were reviewed. Verdict: `ship` for the two scored fixes, both resolved; no visible material regression from that fix batch. This verdict pass scores the listed fixes rather than claiming an additional whole-app audit.
