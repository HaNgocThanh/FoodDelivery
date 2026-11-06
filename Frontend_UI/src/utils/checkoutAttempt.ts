import type { OrderRequestPayload } from '../hooks/useCreateOrder';

type Attempt = { key: string; orderId?: number };
const attempts = new Map<string, Attempt>();

function prefix(userId: number) {
  return `fooddelivery:checkout:${userId}:`;
}

function readAttempt(slot: string): Attempt | undefined {
  const cached = attempts.get(slot);
  if (cached) return cached;
  try {
    const stored = sessionStorage.getItem(slot);
    if (stored) {
      const attempt = JSON.parse(stored) as Attempt;
      if (typeof attempt.key === 'string') return attempt;
    }
  } catch {
    // Keep the in-memory attempt when session storage is unavailable.
  }
}

function writeAttempt(slot: string, attempt: Attempt) {
  attempts.set(slot, attempt);
  try { sessionStorage.setItem(slot, JSON.stringify(attempt)); } catch { /* Memory fallback. */ }
}

export async function checkoutAttempt(payload: OrderRequestPayload) {
  const { userId, paymentMethod, couponCode, usePoints, items, recipientName, recipientPhone,
    deliveryAddress, deliverySlot, deliveryNotes, leaveAtDoorstep, tipAmount } = payload;
  const intent = JSON.stringify([paymentMethod, couponCode?.trim().toUpperCase() || null, !!usePoints,
    [...items].sort((a, b) => a.productId - b.productId).map(item => [item.productId, item.quantity]),
    recipientName.trim(), recipientPhone.trim(), deliveryAddress.trim(), deliverySlot,
    deliveryNotes?.trim() || null, leaveAtDoorstep, tipAmount]);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(intent));
  const slot = prefix(userId) + Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  const attempt = readAttempt(slot) ?? { key: crypto.randomUUID() };
  writeAttempt(slot, attempt);
  return {
    key: attempt.key,
    rememberOrder: (orderId: number) => writeAttempt(slot, { ...attempt, orderId }),
  };
}

export function forgetCheckoutOrder(userId: number, orderId: number) {
  const slots = new Set(attempts.keys());
  try {
    for (let index = 0; index < sessionStorage.length; index++) {
      const slot = sessionStorage.key(index);
      if (slot) slots.add(slot);
    }
  } catch { /* Memory fallback. */ }
  for (const slot of slots) {
    if (!slot.startsWith(prefix(userId)) || readAttempt(slot)?.orderId !== orderId) continue;
    attempts.delete(slot);
    try { sessionStorage.removeItem(slot); } catch { /* Memory fallback. */ }
  }
}
