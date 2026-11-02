---
name: "FoodDelivery"
description: "Concise grocery shopping UI — homepage and public shell"
colors: {"primary": "#047857", "primary-deep": "#065f46", "primary-ink": "#064e3b", "primary-tint": "#ecfdf5", "cta": "#f59e0b", "cta-hover": "#fbbf24", "surface": "#ffffff", "surface-soft": "#f8fafc", "border": "#e2e8f0", "text": "#0f172a", "text-muted": "#475569"}
typography: {"display": {"fontFamily": "Inter, sans-serif", "fontSize": "clamp(28px, 3vw, 44px)", "fontWeight": 800, "lineHeight": 1.16, "letterSpacing": "-0.04em"}, "headline": {"fontFamily": "Inter, sans-serif", "fontSize": "28px", "fontWeight": 700, "letterSpacing": "-0.03em"}, "title": {"fontFamily": "Inter, sans-serif", "fontSize": "16px", "fontWeight": 600, "lineHeight": 1.5}, "price": {"fontFamily": "Inter, sans-serif", "fontSize": "21px", "fontWeight": 750, "lineHeight": 1.4}, "body": {"fontFamily": "Inter, sans-serif", "fontSize": "14px"}, "label": {"fontFamily": "Inter, sans-serif", "fontSize": "13px", "fontWeight": 600}}
rounded: {"control": "8px", "card": "14px", "hero": "16px"}
spacing: {"xs": "8px", "sm": "14px", "md": "16px", "lg": "24px", "xl": "32px", "desktop-gutter": "48px"}
components: {"button-primary": {"backgroundColor": "{colors.primary}", "textColor": "{colors.surface}", "rounded": "{rounded.control}", "padding": "10px 14px", "typography": "{typography.label}"}, "button-shopping": {"backgroundColor": "{colors.cta}", "textColor": "{colors.text}", "rounded": "{rounded.control}", "padding": "13px 18px"}, "search-input": {"backgroundColor": "{colors.surface-soft}", "textColor": "{colors.text}", "rounded": "{rounded.control}"}, "category-selected": {"backgroundColor": "{colors.primary}", "textColor": "{colors.surface}", "rounded": "{rounded.control}", "padding": "11px 18px"}, "product-card": {"backgroundColor": "{colors.surface}", "rounded": "{rounded.card}", "padding": "18px"}, "navigation": {"textColor": "{colors.text}", "typography": "{typography.label}"}}
---

## Overview

**Creative North Star: "FoodDelivery — clear shopping"**

A concise shopping interface: real food photography, clear prices and available stock. Emerald carries navigation and shopping feedback; amber marks the main shopping action. Short Vietnamese labels replace promotional paragraphs.

This records the redesigned homepage and shared public header/footer. Search, product details, cart, checkout and admin interiors retain their existing styling. Global legacy tokens remain intact: root primary is Emerald-500, while this surface uses its existing darker Emerald-700 token for readable controls and prices.

**Key Characteristics:**
- Concise Vietnamese copy
- Real catalog photography and prices
- Flat white surfaces and fine borders

## Colors

Primary: emerald controls and prices; deeper emerald hover; darkest emerald display text; pale emerald introductory ground. Secondary: amber shopping action, with a lighter hover. Neutral: white cards, cool pale search background, fine slate borders, dark text and readable muted text. Frontmatter values are normative for this scope; they do not redefine legacy root variables.

## Typography

Inter is the pinned brand font for display, body and controls. The frontmatter records desktop roles. Featured titles use 14px; mobile catalog titles use 14px, prices 20px, and section headings 23px. The mobile hero uses a 25–34px clamp, with a 30px heading below 361px. Product names wrap to two visible lines and remain complete in link text. Prices use tabular numerals.

**The Content First Rule.** Use photographs, prices and stock to explain the offer; avoid long promotional sections.

## Layout

Homepage and header cap at 1440px. Horizontal gutters are 48px on desktop, 32px below 1200px, and 20px below 768px; the narrowest homepage/header use 16px. Catalog uses four columns on desktop and two below 768px. Card gaps are 24px, then 18px, then 14px. Shared footer bottom aligns to its content gutters. Route-specific opening composition belongs in the surface brief.

## Elevation & Depth

**The Flat Surface Rule.** Homepage cards use a fine border without decorative shadows.

Focus uses a 2px emerald outline with an offset; tonal backgrounds distinguish selected categories and unavailable controls. The legacy desktop support widget retains its existing floating treatment; it is not the homepage card depth model.

## Shapes

Controls use gently curved corners, cards larger corners, and photographic introduction the largest corners. Images fill their region with cover cropping. Use the rounded frontmatter values; keep controls rectangular rather than decorative pills.

## Components

- Buttons: emerald add action; amber main shopping action; slate disabled state. Add confirmation lasts 1800ms with an expanding border for 650ms using cubic-bezier(.16,1,.3,1). Reduced motion suppresses the ring.
- Search: pale field with fine border, emerald icon and focus-within outline. It remains available on mobile.
- Categories: horizontally scrollable buttons; pressed state uses emerald with white text.
- Product cards: photo, two-line linked name, price, stock, quantity and add action. Missing photographs have an explicit placeholder. Out-of-stock controls disable. Quantity controls clamp to remaining stock after cart contents.
- Navigation: compact brand, tracking, account and cart. Mobile hides secondary text while keeping accessible names. Support launcher sits beside search on mobile; the open panel remains fixed. Desktop retains floating support.
- Footer: concise brand, public links and existing contact details; no implementation jargon or unsupported policy links.

## Do's and Don'ts

- Do preserve FoodDelivery, emerald/amber and Inter.
- Do show real catalog data and explicit loading, error, empty and unavailable states.
- Do keep mobile search and support accessible without covering purchasing controls.

- Don't replace API failures with purchasable sample products.
- Don't add unsupported ratings, certifications or delivery promises.
- Don't extend the new homepage styling to legacy interiors without reviewing them.
