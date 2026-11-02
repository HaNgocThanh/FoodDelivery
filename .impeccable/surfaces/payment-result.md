---
version: 1
slug: "payment-result"
primary_target: "Frontend_UI/src/pages/PaymentResultPage.tsx"
related_targets: ["Frontend_UI/src/pages/PaymentResultPage.css", "Frontend_UI/src/hooks/useConfirmPayment.ts", "Frontend_UI/src/utils/paymentResult.ts"]
---

# Payment result

Mode: Operate. Code-led continuation of the approved shopping system. No new visual world, comp or choice round.

## Direction contract

**THESIS:** Tell the customer what the system has actually verified and offer one safe next action.

**OWN-WORLD:** Inter, white surface, emerald verified state and amount, fine slate receipt rules, amber main action. Match checkout outcome without a decorative card shell or new imagery.

**STORY:** Missing/cancelled/malformed return is unconfirmed, never proof of failure or success. Require authentication and signed-token backend confirmation. Pending, verified, retryable error and login states are distinct. Show only returned order ID/amount, not URL bank/date/transaction metadata. Retry verification for the same order rather than create a new one.

**FIRST VIEWPORT:** Restrained central reading column, small status icon, short h1 and one explanation. Verified receipt follows, with order-history and shopping actions. On phone controls stack and names/amounts wrap within gutters.

**FORM:** Keep mock-confirm backend contract and idempotent server validation. Reattach pending confirmation under StrictMode; ignore replies after URL/account change. Clear unchanged cart only after a matched finite nonnegative result; preserve edits made while request pending. Owner-scope order-cache refresh. Preserve focus and reduced motion. Browser outcomes use isolated adapters, no real payment/order submission.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
