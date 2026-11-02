import type { PurchaseHistoryItem } from '../types/productDetail';

export function parseProductId(slug: string | undefined): number | null {
  if (!slug || !/^\d+$/.test(slug)) return null;
  const id = Number(slug);
  return Number.isInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

export function hasCompletedPurchase(orders: readonly PurchaseHistoryItem[], productId: number): boolean {
  return orders.some((order) => (order.status === 'Completed' || order.status === 4)
    && order.details?.some((item) => item.productId === productId));
}
