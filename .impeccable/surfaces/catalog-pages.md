---
version: 1
slug: "catalog-pages"
primary_target: "Frontend_UI/src/components/catalog/CatalogPage.tsx"
related_targets: ["Frontend_UI/src/pages/ProductListPage.tsx", "Frontend_UI/src/pages/SearchPage.tsx", "Frontend_UI/src/components/catalog/ProductCard.tsx", "Frontend_UI/src/styles/shop.css"]
---

# Product browsing

Mode: Operate. User requested the first implementation step of the accepted frontend plan, matching the approved homepage, code-first and with concise Vietnamese copy. Scope: shared shopping primitives, product list and search. Existing homepage composition is preserved. No new brand or concept round is needed for this explicitly pinned extension.

## Direction contract

**THESIS:** Product browsing begins with goods and useful filters rather than an editorial introduction.

**OWN-WORLD:** The accepted white/emerald/amber FoodDelivery world, Inter, fine borders, rectangular controls and photographic product cards. Reuse the homepage's cards and cart feedback directly.

**STORY:** Enter a keyword, choose real categories and prices, sort actual results, inspect stock, choose quantity and add. URL state survives reload and history navigation.

**FIRST VIEWPORT:** A concise heading, narrow filter column at left and a four-column product grid at desktop. At tablet/mobile, filters expand inline above the results; a two-column grid at phone widths keeps prices and actions legible. No promotional hero. Header/footer remain shared.

**FORM:** Code-led extension of the user-approved homepage and accepted plan. No roll or approved raster comp for this precise extension. Signature interaction: the same transient add confirmation and reduced-motion behavior as the homepage.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Truth: only catalog/category API data and supported filters. Remove farm/certification/harvest-time defaults and decorative capability controls. Preserve test IDs from product list. No backend business changes.
