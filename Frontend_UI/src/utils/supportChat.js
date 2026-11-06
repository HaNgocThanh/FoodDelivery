export function isValidSenderName(name) {
  return typeof name === 'string' && name.trim().length <= 80 && /[\p{L}\p{N}]/u.test(name.trim());
}
export function receivedMessage(sender, text, connectionId, kind) {
  return {id:crypto.randomUUID(), sender:(kind === 'system' || (kind == null && (connectionId === 'system' || /^(🔔|🛟)/u.test(sender || '')))) ? 'system' : 'admin', senderName:(sender || 'Hỗ trợ').replace(/^\[Admin\]\s*/, ''), text, ts:Date.now()};
}
export const CHAT_STATUS = {connected:'Đã kết nối',connecting:'Đang kết nối…',reconnecting:'Đang kết nối lại…',disconnected:'Chưa kết nối',error:'Không thể kết nối'};
// A send lock lives outside React's asynchronous state updates.
export function createSendGate() {
  let busy = false;
  return async function run(work) {
    if (busy) return false;
    busy = true;
    try { await work(); return true; } finally { busy = false; }
  };
}
