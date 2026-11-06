import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClientProvider } from '@tanstack/react-query';
import { createJSONStorage } from 'zustand/middleware';
import axiosClient from '../../src/api/axiosClient';
import { queryClient } from '../../src/api/queryClient';
import { useAuthStore } from '../../src/stores/useAuthStore';
import UserManagementPage from '../../src/pages/UserManagementPage';
import '../../src/index.css';

const scenario = new URLSearchParams(location.search).get('case');
const values = new Map<string, string>();
const storage = {
  getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => { values.set(key, value); },
  removeItem: (key: string) => { values.delete(key); },
};
Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
useAuthStore.persist.setOptions({ storage: createJSONStorage(() => storage) });
useAuthStore.setState({
  token: 'fixture-admin',
  user: { id: 99, role: 'Admin', fullName: 'Quản trị viên kiểm thử', email: 'admin@example.invalid' },
});
let users = [
  { id: 31, fullName: 'Nguyễn Minh Anh', email: 'minhanh@example.invalid', phoneNumber: '0900000000', address1: 'Địa chỉ mẫu', address2: '', loyaltyPoints: 120, tier: 1, role: 'Customer' },
  { id: 30, fullName: 'Trần Hoàng Nam', email: 'hoangnam@example.invalid', phoneNumber: '', address1: '', address2: '', loyaltyPoints: 0, tier: 0, role: 'Shipper' },
  { id: 29, fullName: 'Lê Thu Hà', email: 'thuha@example.invalid', phoneNumber: '', address1: '', address2: '', loyaltyPoints: 540, tier: 2, role: 'Admin' },
];
let failed = false;
axiosClient.defaults.adapter = async config => {
  let data: unknown;
  if (config.method === 'get' && config.url === '/api/users') {
    if (scenario === 'error' && !failed) { failed = true; throw Error('Isolated error'); }
    const page = Number(config.params.page);
    const empty = scenario === 'empty';
    data = { items: empty ? [] : page === 1 ? users : [{ ...users[0], id: 12, fullName: 'Phạm Ngọc Mai' }],
      totalCount: empty ? 0 : 11, page, pageSize: 10, totalPages: empty ? 0 : 2 };
  } else if (config.method === 'put' && /^\/api\/users\/\d+$/.test(config.url ?? '')) {
    if (scenario === 'save-error' && !failed) { failed = true; throw Error('Isolated write error'); }
    const id = Number(config.url?.split('/').at(-1));
    users = users.map(user => user.id === id ? { ...user, ...JSON.parse(String(config.data)) } : user);
    data = { message: 'OK' };
  } else {
    throw Error('Operation blocked by isolated fixture');
  }
  return { data, status: 200, statusText: 'OK', headers: {}, config };
};
queryClient.setDefaultOptions({ queries: { retry: false } });
createRoot(document.getElementById('root')!).render(
  <HelmetProvider><QueryClientProvider client={queryClient}>
    <MemoryRouter initialEntries={['/admin/users']}><UserManagementPage /></MemoryRouter>
  </QueryClientProvider></HelmetProvider>,
);
