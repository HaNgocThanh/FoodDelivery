---
version: 1
slug: "frontend-ui-src-pages-homepage-tsx"
primary_target: "Frontend_UI/src/pages/HomePage.tsx"
related_targets: ["Frontend_UI/src/components/layout/Header.tsx","Frontend_UI/src/components/layout/Footer.tsx"]
---

# Homepage

Scope: `/`, HomePage and shared public navigation/footer. Mode: Operate.
Customers find food, inspect live prices and stock, and add to their cart. Keep the existing API/store contracts, route links, and emerald/amber FoodDelivery identity. Vietnamese copy must be short. No synthetic purchasable catalog or unverifiable promotional claims.

## Direction contract

**THESIS:** A compact grocery counter: food and prices lead, with one sentence of introduction. Remove the long editorial sales story.

**OWN-WORLD:** White ground, emerald navigation and prices, one amber shopping action. Inter, 12–16px image/card corners, fine slate borders, no decorative shadows. Product photography carries the page.

**STORY:** Find a product through search or category, read price and availability, choose quantity, add, and see immediate cart feedback.

**FIRST VIEWPORT:** Desktop has a broad split photo/introduction at left and two live, available product cards at right. Below, a heading and category controls introduce a four-column catalog. Mobile stacks a compact photo/introduction, horizontally paired featured products and a two-column catalog. Header search and account access remain usable.

**FORM:** Quầy hàng nổi bật, position 6; seed:900a3bcc19e32087. User locked featured-counter, code-led. Signature interaction is add-to-cart becoming a brief emerald confirmation, with a restrained expanding feedback ring. Reduced motion keeps the confirmation without animation.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Unresolved decisions: none. Reference sketch: `.impeccable/mocks/decision/featured-counter.html`.
