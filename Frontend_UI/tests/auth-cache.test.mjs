import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Node's type stripping runs the actual stores without a browser or a test dependency.
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
const { queryClient } = await import('../src/api/queryClient.ts');
queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, gcTime: Infinity } });
const { useAuthStore } = await import('../src/stores/useAuthStore.ts');
const user = id => ({ id, fullName: 'User ' + id, email: id + '@example.test', role: 'Customer' });

test('Logout removes private cache and legacy token; login cannot reuse another account cache', () => {
  useAuthStore.getState().login('token-a', user(1));
  queryClient.setQueryData(['myOrders', 1], [{ id: 50 }]);
  queryClient.setQueryData(['userProfile', 1], { fullName: 'A' });
  localStorage.setItem('auth_token', 'legacy-a');
  useAuthStore.getState().logout();
  assert.equal(queryClient.getQueryData(['myOrders', 1]), undefined);
  assert.equal(queryClient.getQueryData(['userProfile', 1]), undefined);
  assert.equal(localStorage.getItem('auth_token'), null);
  useAuthStore.getState().login('token-b', user(2));
  assert.equal(queryClient.getQueryData(['myOrders', 2]), undefined);
  assert.equal(useAuthStore.getState().user.id, 2);
  queryClient.clear();
});

test('An old in-flight response cannot refill cache after switching accounts', async () => {
  useAuthStore.getState().login('token-a', user(1));
  let resolveOld;
  const pending = queryClient.fetchQuery({ queryKey: ['userProfile', 1], queryFn: () => new Promise(resolve => { resolveOld = resolve; }) });
  const settled = pending.catch(() => undefined);
  useAuthStore.getState().login('token-b', user(2));
  resolveOld({ fullName: 'A' });
  await settled;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(queryClient.getQueryData(['userProfile', 1]), undefined);
  assert.equal(queryClient.getQueryData(['userProfile', 2]), undefined);
  queryClient.clear();
});
