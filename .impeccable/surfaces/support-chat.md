---
version: 1
slug: "support-chat"
primary_target: "Frontend_UI/src/components/common/CustomerLiveChat.jsx"
related_targets: ["Frontend_UI/src/styles/support-chat.css"]
---
# Support chat

Mode: Operate. Local extension of accepted public shell, code-first.

**THESIS:** Ask a support question without leaving shopping; clear connection and sending feedback.

**OWN-WORLD:** White, Inter, emerald, pale green header and fine rules; flat 14px panel, 8px controls. No blue gradients, animated badge or response-time promises.

**STORY:** Existing anonymous SignalR JoinCustomerGroup/SendMessageToAdmin/ReceiveMessage contract remains. Rejoin after reconnect; retry failed starts and sends. Connection does not imply staff availability. Messages remain memory-only and are cleared on account/session change or reload.

**FIRST VIEWPORT:** Desktop compact labeled launcher; mobile 44px beside search. Nonmodal dialog with title, connection state, log and labeled name/message form. Size bounded by viewport; no mobile floating closed launcher covering purchase actions.

**FORM:** Escape/close restore launcher focus; background remains usable. Native form submit, pending lock, valid display name, failed-message retry and unread indication only while closed. No new customer modals: prior order cancel/support/rating are already inline; unused ReviewModal and admin dialogs remain outside scope.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
