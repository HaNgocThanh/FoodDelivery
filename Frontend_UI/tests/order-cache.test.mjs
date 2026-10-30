import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { QueryClient, QueryObserver, MutationObserver } from '@tanstack/react-query';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && context.parentURL?.includes('/src/')) {
    const target = new URL(specifier + '.ts', context.parentURL);
    if (existsSync(fileURLToPath(target))) return nextResolve(target.href, context);
  }
  return nextResolve(specifier, context);
}});
const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
};
const { createOrderMutationOptions } = await import('../src/hooks/useCreateOrder.ts');
const { default: axiosClient } = await import('../src/api/axiosClient.ts');
const payload = { userId: 1, paymentMethod: 1, items: [{ productId: 7, quantity: 1 }],
  recipientName: 'Test', recipientPhone: '0901111111', deliveryAddress: 'Test address',
  deliverySlot: 'slot-a', deliveryNotes: '', leaveAtDoorstep: false, tipAmount: 0, expectedTotalAmount: 140000 };
const makeClient = () => new QueryClient({ defaultOptions: {
  queries: { staleTime: 5 * 60 * 1000, gcTime: Infinity, retry: false },
  mutations: { gcTime: Infinity, retry: false },
}});

test('Creating an order refetches a fresh observed list before the mutation succeeds, and scopes invalidation to its owner', async () => {
  const client = makeClient();
  const oldOrders = [{ id: 10 }];
  const newOrders = [...oldOrders, { id: 50 }];
  client.setQueryData(['myOrders', 1], oldOrders);
  client.setQueryData(['myOrders', 2], [{ id: 20 }]);
  client.setQueryData(['userProfile', 1], { loyaltyPoints: 100 });
  let releaseRefetch;
  const observed = new QueryObserver(client, { queryKey: ['myOrders', 1],
    queryFn: () => new Promise(resolve => { releaseRefetch = resolve; }) });
  const unsubscribe = observed.subscribe(() => {});
  const adapter = axiosClient.defaults.adapter;
  axiosClient.defaults.adapter = async config => ({ data: { id: 50, userId: 1 }, status: 201, statusText: 'Created', headers: {}, config });
  try {
    const mutation = new MutationObserver(client, createOrderMutationOptions(client));
    let completed = false;
    const pending = mutation.mutate(payload).then(result => { completed = true; return result; });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(completed, false);
    assert.equal(typeof releaseRefetch, 'function');
    assert.equal(client.getQueryState(['userProfile', 1]).isInvalidated, true);
    releaseRefetch(newOrders);
    await pending;
    assert.deepEqual(observed.getCurrentResult().data, newOrders);
    assert.deepEqual(client.getQueryData(['myOrders', 2]), [{ id: 20 }]);
    assert.equal(client.getQueryState(['myOrders', 2]).isInvalidated, false);
  } finally {
    axiosClient.defaults.adapter = adapter;
    unsubscribe();
    client.clear();
  }
});

test('A rejected order request does not mark the cached order list as successfully refreshed', async () => {
  const client = makeClient();
  client.setQueryData(['myOrders', 1], [{ id: 10 }]);
  const adapter = axiosClient.defaults.adapter;
  axiosClient.defaults.adapter = async () => { throw new Error('Order rejected'); };
  try {
    const mutation = new MutationObserver(client, createOrderMutationOptions(client));
    await assert.rejects(mutation.mutate(payload));
    assert.deepEqual(client.getQueryData(['myOrders', 1]), [{ id: 10 }]);
    assert.equal(client.getQueryState(['myOrders', 1]).isInvalidated, false);
  } finally {
    axiosClient.defaults.adapter = adapter;
    client.clear();
  }
});
