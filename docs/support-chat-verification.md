# Support chat verification

Date: 2026-11-03. Scope: public customer support widget. Inherits the accepted homepage/account white, Inter and emerald system.

## Scope and contracts

Replaced blue gradients, floating circular ornament and unsupported response-time claims with a compact labeled desktop launcher, mobile search-row button, pale emerald header, native controls and truthful connection status. The panel is a nonmodal dialog, with Escape/close returning focus to its launcher; background shopping controls remain usable.

SignalR remains anonymous and uses the existing hub URL and JoinCustomerGroup / SendMessageToAdmin / ReceiveMessage contracts. Connection now starts on first open, stays available for replies while minimized, and re-registers the customer after reconnect. Failed starts can be retried. A successful hub invocation marks a message sent, not read by staff. Failed acknowledgments are marked uncertain and offer manual resend; no automatic duplicate resend occurs. Messages are not persisted; the existing saved name/open preference remains. Account/token changes remount private chat state and stop the obsolete connection.

No backend changes, new assets or new customer modal are introduced. Order cancellation, support requests and ratings already use inline controls from the previous stage. Unused ReviewModal and admin dialogs remain outside this scope.

## Automated verification

- Production build passed (TypeScript + Vite).
- 22 frontend tests passed, including name validation, server-notice classification and duplicate-send gate release after rejection.
- Lint: no errors; one pre-existing ReviewModal exhaustive-dependencies warning. Existing chat unused-import warning removed.
- Impeccable detector ran once on changed chat/component/shell targets: no findings.

## Browser verification

Live page: existing backend connection reached 'Đã kết nối'. No real customer name/message was submitted and no message to others was sent during verification. Synthetic sends/replies are exclusively in tests/fixtures/support-chat.html, where the injected connection factory and memory storage prevent real transport/persistence.

Verified: open/close; Escape and launcher focus restoration; empty and invalid display names; failed name registration/retry; double submission issues only one send; pending/failure/manual resend/success; received replies; reconnect state and customer-group re-registration; unread only while closed; long names/unbroken messages wrap without horizontal overflow; session change clears old messages and ignores a late pending reply.

Live open/closed and synthetic conversation captures cover 1440x900, 1280x800, 768x1024, 390x844 and 320x800. Additional live 390x500 viewport checks the short panel. Ten narrow fixture states cover empty, invalid name, name error, offline, reconnecting, sending, uncertain send, long message, unread and session change. All 26 required files were decoded, dimensions verified and visually inspected in contact sheets after the responsive fix batch. Product and fixture document widths match their viewports. Canonical local evidence: .impeccable/review/support-chat/captures (ignored images).

Development screenshots include the existing React Query Devtools tropical trigger, guarded by import.meta.env.DEV in main.tsx and absent from production. It is excluded from the product design assessment. Fixture diagnostics and synthetic conversation copy are explicitly labeled test-only. Before.jpg is auxiliary old-widget evidence.

## Limits

Real admin replies and delivery across real users were not exercised. Backend persistence, authorization and staff availability remain unchanged; a connected transport does not prove an agent is online. No new response-time or delivery guarantee is presented.

Independent verdict is recorded in support-chat-finish-review.md. No shipping raster provenance changes are required.
