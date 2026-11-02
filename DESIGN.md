---
name: "FoodDelivery"
description: "Concise grocery shopping UI — homepage, public shell, catalog, product details, cart and checkout"
colors: {"primary": "#047857", "primary-deep": "#065f46", "primary-ink": "#064e3b", "primary-tint": "#ecfdf5", "cta": "#f59e0b", "cta-hover": "#fbbf24", "surface": "#ffffff", "surface-soft": "#f8fafc", "border": "#e2e8f0", "text": "#0f172a", "text-muted": "#475569"}
typography: {"display": {"fontFamily": "Inter, sans-serif", "fontSize": "clamp(28px, 3vw, 44px)", "fontWeight": 800, "lineHeight": 1.16, "letterSpacing": "-0.04em"}, "headline": {"fontFamily": "Inter, sans-serif", "fontSize": "28px", "fontWeight": 700, "letterSpacing": "-0.03em"}, "title": {"fontFamily": "Inter, sans-serif", "fontSize": "16px", "fontWeight": 600, "lineHeight": 1.5}, "price": {"fontFamily": "Inter, sans-serif", "fontSize": "21px", "fontWeight": 750, "lineHeight": 1.4}, "body": {"fontFamily": "Inter, sans-serif", "fontSize": "14px"}, "label": {"fontFamily": "Inter, sans-serif", "fontSize": "13px", "fontWeight": 600}}
rounded: {"control": "8px", "card": "14px", "hero": "16px"}
spacing: {"xs": "8px", "sm": "14px", "md": "16px", "lg": "24px", "xl": "32px", "desktop-gutter": "48px"}
components: {"button-primary":{"backgroundColor":"{colors.primary}","textColor":"{colors.surface}","rounded":"{rounded.control}","padding":"10px 14px","typography":"{typography.label}"},"button-shopping":{"backgroundColor":"{colors.cta}","textColor":"{colors.text}","rounded":"{rounded.control}","padding":"13px 18px"},"search-input":{"backgroundColor":"{colors.surface-soft}","textColor":"{colors.text}","rounded":"{rounded.control}"},"category-selected":{"backgroundColor":"{colors.primary}","textColor":"{colors.surface}","rounded":"{rounded.control}","padding":"11px 18px"},"product-card":{"backgroundColor":"{colors.surface}","rounded":"{rounded.card}","padding":"18px"},"navigation":{"textColor":"{colors.text}","typography":"{typography.label}"},"community-tabs":{"textColor":"{colors.primary}"},"community-input":{"rounded":"{rounded.control}","padding":"12px 14px","textColor":"{colors.text}","backgroundColor":"{colors.surface}"}}
---

## Overview

**Creative North Star: "FoodDelivery — clear shopping"**

A concise shopping interface: real food photography, clear prices and available stock. Emerald carries navigation and shopping feedback; amber marks the main shopping action. Short Vietnamese labels replace promotional paragraphs.

This records the redesigned homepage, shared public header/footer, shared catalog primitives used by the product list (/products) and search (/search), product details (/products/:slug), cart (/cart), and the shared form on both checkout routes. Checkout includes COD success and the online-created-order outcome with payment-link retry. PaymentResultPage, account and admin interiors retain their existing styling and belong to later stages. Global legacy tokens remain intact: root primary is Emerald-500, while these surfaces use its existing darker Emerald-700 token for readable controls and prices.

**Key Characteristics:**
- Concise Vietnamese copy
- Real catalog photography and prices
- Flat white surfaces and fine borders

## Colors

Primary: emerald controls and prices; deeper emerald hover; darkest emerald display text; pale emerald introductory ground. Secondary: amber shopping action, with a lighter hover. Neutral: white cards, cool pale search background, fine slate borders, dark text and readable muted text. Frontmatter values are normative for this scope; they do not redefine legacy root variables.

## Typography

Inter is the pinned brand font for display, body and controls. The frontmatter records desktop roles. Featured titles use 14px; mobile catalog titles use 14px, prices 20px, and section headings 23px. The mobile hero uses a 25–34px clamp, with a 30px heading below 361px. Product names wrap to two visible lines and remain complete in link text. Prices use tabular numerals.

Product detail names wrap completely rather than using the card's two-line limit. They use a 28–38px clamp on desktop, 30px below 1200px, 28px on phone and 25px at 360px or narrower. Detail prices use 32px on desktop and 30px on phone. Descriptions and community posts use 14px with 1.8 line-height; descriptions stay within 75ch.

Cart names wrap fully at 15px on desktop and 14px on phone; unit prices use smaller muted text and line totals use emerald tabular numerals. The cart heading steps from 36px to 30px on phone and 28px at 360px or narrower. Estimated totals use 24px, reduced to 23px at 480px or narrower.

Checkout uses a 36px heading, 19px section headings, 13px labels and 14px field text. Below 768px the heading becomes 30px and section headings 18px; at 360px or narrower the heading is 28px. Summary product names and line totals use 13px, then 12px on phone; quantities use muted 12px, then 11px. The emerald tabular total steps from 26px to 24px on phone and 23px at 360px or narrower. Outcome headings use 32px on desktop and 28px on phone.

**The Content First Rule.** Use photographs, prices and stock to explain the offer; avoid long promotional sections.

## Layout

Homepage, catalog pages and header cap at 1440px. Horizontal gutters are 48px on desktop, 32px below 1200px, and 20px below 768px; the narrowest homepage/catalog/header use 16px. The homepage catalog uses four columns on desktop and two below 768px. Product list and search pair a sticky filter sidebar with four product columns on desktop; below 1200px they use three product columns, and below 1024px filters expand inline above results. Below 768px the product grid uses two columns; expanded filters stack into one column below 480px. Card gaps are 24px, then 18px, then 14px. Shared footer bottom aligns to its content gutters. Route-specific opening composition belongs in the surface brief.

Product details share the 1440px cap and gutter steps, with 16px gutters at 360px or narrower. Desktop pairs a 4:3 photograph with purchase information in a 1.1:1 split and a 64px gap, reduced to 40px below 1200px. Below 768px, photograph and information stack with a 24px gap; community form and posts also stack. Below 480px quantity and add controls become separate full-width rows. Description and community sections use fine top rules and spacing instead of additional promotional panels.

Cart shares the 1440px cap and desktop, compact and phone gutter steps. Its desktop list pairs with a 340px summary and 48px gap; below 1200px the summary is 310px with a 32px gap. At 900px or narrower the summary stacks after the list and loses sticky positioning. Rows use fine top rules and compact square photos: 80px on desktop, 64px in compact layouts and on phone. Below 768px quantity and line total sit beneath the product name; at 360px or narrower they span the row. Suggestions use three columns, changing to compact horizontal rows at 480px or narrower.

Checkout shares the 1440px cap and 48px desktop, 32px compact and 20px phone gutters, reduced to 16px at 360px or narrower. Desktop pairs recipient and choice sections with a 400px summary and 64px gap; below 1200px the summary is 350px with a 36px gap. At 900px or narrower the summary stacks after the fields, loses sticky positioning and uses a 16px layout gap. Recipient fields use two columns on desktop, one below 1200px, two again at 900px or narrower, then one below 768px. Address and notes span both columns where present. The summary stays 24px from the viewport top on larger screens, with 24px padding reduced to 20px below 1200px and 16px at 360px or narrower. Product photos step from 48px to 44px on phone and 40px at 360px or narrower; at that narrow size line totals move beneath names. Outcome content caps at 780px and its follow-up actions stack on phone.

## Elevation & Depth

**The Flat Surface Rule.** Shared product cards use a fine border without decorative shadows.

Focus uses a 2px emerald outline with an offset; tonal backgrounds distinguish selected categories and unavailable controls. The legacy desktop support widget retains its existing floating treatment; it is not the homepage card depth model.

## Shapes

Controls use gently curved corners, cards larger corners, and photographic introduction the largest corners. Images fill their region with cover cropping. Use the rounded frontmatter values; keep controls rectangular rather than decorative pills.

## Components

- Buttons: emerald add action; amber main shopping action; slate disabled state. Add confirmation lasts 1800ms with an expanding border for 650ms using cubic-bezier(.16,1,.3,1). Reduced motion suppresses the ring.
- Search: pale field with fine border, emerald icon and focus-within outline. It remains available on mobile. On product list and search routes, the shared header reflects the URL keyword after navigation, browser history changes and reload; local edits remain a draft until submitted.
- Categories: horizontally scrollable buttons; pressed state uses emerald with white text.
- Product cards: photo, two-line linked name, price, stock, quantity and add action. Missing photographs have an explicit placeholder. Out-of-stock controls disable. Quantity controls clamp to remaining stock after cart contents.
- Product details: one API photograph uses the shared photo component and missing-image treatment; no fabricated gallery or bundle. The name, actual price, stock and available origin/category precede stock-aware quantity, add action and subtotal. The same catalog selection logic subtracts cart contents, disables unavailable purchases and announces additions. A full-cart notice links to the cart. Local product drafts reset on route changes.
- Cart: compact selected-product rows reuse the shared API photograph and explicit missing/broken-image placeholder, with full linked names, unit prices, stock-capped quantity, line totals and removal. Decreasing one to zero removes the row; clearing all products requires inline confirmation with a cancel action. Changes announce through a polite live region. A flat bordered summary keeps the estimated total and amber checkout action together, with fee details in a native disclosure. Empty carts show a product-list action without a fee summary. Suggestions use real available API products outside the cart, show loading and retryable fetch failures, and re-fetch product details before adding; pending adds disable suggestion controls and failures remain explicit.
- Checkout: both routes use the same account-keyed form. Recipient name, telephone, address and optional delivery notes have visible labels; name, telephone and address use shipping autocomplete, and the telephone uses a native tel input. Delivery, payment and optional tip use native radio groups; leaving goods at the door uses a checkbox. Selected delivery/payment rows have a pale emerald ground and emerald border, while selected tips use solid emerald. Fields have 8px corners and a 46px minimum height; choices use 52px rows and secondary actions have 44px minimum targets. Coupon validation, applied-code removal and the points toggle expose pending, error and applied states. The effective coupon reduction is capped at the product subtotal, so its displayed discount matches the total calculation; fees remain separate. The flat bordered summary reuses real catalog photos and the missing-image placeholder, item quantities, line totals and explicit fee/discount rows. Its full-width amber order action has a 48px minimum height. Invalid recipient fields have a red border, a linked inline alert and focus on the first invalid field. Guests see a login link and cannot submit an order. Order submission disables fields and the submit action; failures retain the draft for deliberate retry. Online availability has loading and retryable failure states, and the Development mock is labeled as a simulation. Empty checkout links to products without a fee summary.
- Checkout outcomes: COD success shows the returned order ID, creation time and authoritative total, then order-history and shopping links. Online order creation shows the same order snapshot and a pending or failed payment-link state; retry requests a payment link for that existing ID without creating another order. These outcomes use the checkout typography, fine rules and amber/emerald actions. The separate PaymentResultPage remains legacy and is not part of this extension.
- Descriptions: render the actual API description with preserved line breaks; descriptions longer than 360 characters sit inside native expandable details. Missing descriptions have a concise explicit message.
- Community: real reviews and questions appear in compact underline tabs. The selected tab has emerald text and rule; Left/Right switch tabs and Home/End reach the first/last tab while moving focus. Review stars are a native labeled radio group with 44px targets and visible keyboard focus. Guests see login links; review forms require a completed purchase, while authenticated users can ask questions. Account changes reset community drafts. Submission disables pending controls and provides success/error feedback; product, purchase-history and Q&A loading failures expose retry actions. Empty lists remain explicit rather than becoming sample content.
- Catalog filters: real API categories, applied minimum/maximum prices and sort order live in the URL alongside the keyword, so applied browsing state survives reload and Back/Forward. Active category and price filters can be removed individually; clearing filters preserves the keyword and sort. Invalid price ranges show an explicit error. Tablet and phone filters expand inline rather than covering results.
- Navigation: compact brand, tracking, account and cart. Mobile hides secondary text while keeping accessible names. Support launcher sits beside search on mobile; the open panel remains fixed. Desktop retains floating support.
- Footer: concise brand, public links and existing contact details; no implementation jargon or unsupported policy links.

## Do's and Don'ts

- Do preserve FoodDelivery, emerald/amber and Inter.
- Do show real catalog data and explicit loading, error, empty and unavailable states.
- Do keep mobile search and support accessible without covering purchasing controls.

- Don't replace API failures with purchasable sample products.
- Don't add unsupported ratings, certifications or delivery promises.
- Don't extend the shared shopping styling to remaining legacy interiors without reviewing them.
