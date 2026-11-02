import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseProductId, hasCompletedPurchase } from '../src/utils/productDetail.ts';

test('Product route accepts positive API int IDs and rejects malformed or overflowing IDs', () => {
  assert.equal(parseProductId('62'), 62);
  for (const invalid of [undefined, '', '0', '-1', 'abc', '1.5', '1e2', '2147483648']) assert.equal(parseProductId(invalid), null);
});

test('Review eligibility recognizes completed API status in either serialization and only the purchased product', () => {
  assert.equal(hasCompletedPurchase([{ status: 4, details: [{ productId: 62 }] }], 62), true);
  assert.equal(hasCompletedPurchase([{ status: 'Completed', details: [{ productId: 62 }] }], 62), true);
  assert.equal(hasCompletedPurchase([{ status: 4, details: [{ productId: 1 }] }], 62), false);
});

test('Pending, shipping, cancelled and empty history cannot unlock product reviews', () => {
  for (const status of [1, 2, 3, 5, 'Pending', 'Shipping', 'Cancelled']) assert.equal(hasCompletedPurchase([{ status, details: [{ productId: 62 }] }], 62), false);
  assert.equal(hasCompletedPurchase([], 62), false);
  assert.equal(hasCompletedPurchase([{ status: 4 }], 62), false);
});
