---
version: 1
slug: "customer-orders"
primary_target: "Frontend_UI/src/pages/TrackOrderPage.tsx"
related_targets: ["Frontend_UI/src/pages/MyOrdersPage.tsx", "Frontend_UI/src/components/track/OrderStatusStepper.tsx", "Frontend_UI/src/components/orders/OrderSummary.tsx", "Frontend_UI/src/styles/orders.css"]
---

# Customer order tracking

Mode: Operate. Code-led continuation of approved FoodDelivery shopping world; no comp/identity round.

## Direction contract

**THESIS:** Find the current order status quickly, then reveal delivery, products and actions only when needed.

**OWN-WORLD:** Inter, white, fine slate rules, emerald prices/status/progress and amber primary action. No invented delivery time, carrier, farm or status history.

**STORY:** Public tracking requires existing orderID/phone and displays only API-masked recipient data. Personal order routes share concise summary rows and native expandable details. Preserve pending-only cancellation, completed-only reviews and completed/cancelled support. Use inline confirmations/forms and truthful pending/error/success instead of premature review success.

**FIRST VIEWPORT:** Short h1 and compact lookup form; result emphasizes order ID and real status. Personal history opens with date/item count/total/status, expandable detail and contextual actions. Phone stacks fields and rows; full product names remain readable.

**FORM:** Retain backend contracts and protected routes. No new reorder/payment endpoint. Handle cancelled/unknown statuses without pretending active progress. Prevent duplicate requests, preserve drafts on error, ignore obsolete tracking responses and callbacks after account change; scope private cache by owner. Mutations verified only with isolated adapters, no real order cancellation, support message or review.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
