---
version: 1
slug: "checkout"
primary_target: "Frontend_UI/src/components/CheckoutForm.tsx"
related_targets: ["Frontend_UI/src/components/CheckoutForm.css", "Frontend_UI/src/pages/CheckoutPage.tsx", "Frontend_UI/src/pages/CheckoutFormPage.tsx"]
---

# Checkout

Mode: Operate. Code-led extension of the approved FoodDelivery shopping system. User asks for the next accepted plan step. No new identity, comp or roll owed.

## Direction contract

**THESIS:** Complete an order through clear recipient fields, real delivery choices and a transparent total, with minimal Vietnamese copy.

**OWN-WORLD:** Inter, white, fine slate rules, emerald controls/prices and amber order action, matching the new cart. Reuse API photos and explicit missing-image placeholder. No fictional reservation, certification, temperature or guarantee.

**STORY:** Review items; enter recipient/address/notes; select one existing delivery slot and payment method; optionally apply voucher/points/tip; submit once. Keep backend-authoritative amounts, stock and authentication. Both checkout routes render the same form. COD success is included; payment-result route follows separately.

**FIRST VIEWPORT:** Back-to-cart and short h1; desktop has recipient/delivery/payment sections at left and a sticky products/fee summary at right. Mobile stacks fields and choices, then total and order action. Empty cart points to products.

**FORM:** Native labeled inputs, radio groups and optional checkbox, stable errors/retry and visible keyboard focus. Preserve the slot-a/b/c contract and 300k/25k shipping, 15k deposit, voucher/points/tip calculations. Pending disables mutations. If online link fails after order creation, retry the link for the same order, never create another order. No real order/payment submission in live browser verification; exercise mutation outcomes with isolated fixtures.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
