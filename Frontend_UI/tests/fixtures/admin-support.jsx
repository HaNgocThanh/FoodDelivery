import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClientProvider } from '@tanstack/react-query';
import { HubConnectionState } from '@microsoft/signalr';
import axiosClient from '../../src/api/axiosClient';
import { queryClient } from '../../src/api/queryClient';
import AdminSupportPage from '../../src/pages/AdminSupportPage';
import { useAuthStore } from '../../src/stores/useAuthStore';
import '../../src/index.css';

const params = new URLSearchParams(location.search);
const scenario = params.get('case');
useAuthStore.persist.setOptions({ storage: { getItem: () => null, setItem() {}, removeItem() {} } });
useAuthStore.setState({
  token: 'fixture-admin-support',
  user: { id: 99001, role: 'Admin', fullName: 'Quản trị viên kiểm thử', email: 'admin@example.invalid' },
});

const questions = [{ id: 42, productName: 'Bơ sáp Đắk Lắk', userFullName: 'Nguyễn Mai',
  createdAt: '2026-11-06T02:30:00Z', questionText: 'Bơ giao hôm nay có thể dùng ngay được không?' }];
const tickets = [{ id: 42, subject: 'Kiểm tra thời gian giao hàng', orderId: 2085, userFullName: 'Trần Gia Hân',
  userEmail: 'han@example.invalid', createdAt: '2026-11-06T02:35:00Z', message: 'Tôi muốn kiểm tra giờ giao của đơn hàng.' }];
let failedRead = false;
let failedWrite = false;
axiosClient.defaults.adapter = async config => {
  let data;
  if (config.method === 'get' && config.url === '/api/questions/unanswered') {
    if (scenario === 'error' && !failedRead) { failedRead = true; throw new Error('Lỗi tải mô phỏng. Vui lòng thử lại.'); }
    data = [...questions];
  } else if (config.method === 'get' && config.url === '/api/tickets/open') {
    data = [...tickets];
  } else if (config.method === 'put' && config.url === '/api/questions/42/answer' && JSON.parse(config.data).answerText) {
    if (scenario === 'error' && !failedWrite) { failedWrite = true; throw new Error('Lỗi lưu mô phỏng. Vui lòng thử lại.'); }
    questions.length = 0;
    data = {};
  } else if (config.method === 'put' && config.url === '/api/tickets/42/reply' && JSON.parse(config.data).adminReply) {
    tickets.length = 0;
    data = {};
  } else throw new Error('Thao tác ngoài phạm vi kiểm thử.');
  return { data, status: 200, statusText: 'OK', headers: {}, config };
};
queryClient.setDefaultOptions({ queries: { retry: false } });

let failStart = scenario === 'connection';
let failChat = scenario === 'error';
let active;
function createConnection() {
  let receive;
  let reconnecting;
  let reconnected;
  const connection = {
    state: HubConnectionState.Disconnected,
    async start() {
      if (failStart) { failStart = false; throw new Error('Lỗi kết nối mô phỏng.'); }
      this.state = HubConnectionState.Connected;
    },
    async stop() { this.state = HubConnectionState.Disconnected; },
    on(_, handler) { receive = handler; },
    off() { receive = undefined; },
    onreconnecting(handler) { reconnecting = handler; },
    onreconnected(handler) { reconnected = handler; },
    onclose() {},
    async invoke(method, id, text) {
      if (method === 'JoinAdminGroup') {
        if (scenario === 'empty') return;
        receive?.('Trần Gia Hân', 'Chào bạn, mình cần kiểm tra giờ giao hàng.', 'customer-a');
        receive?.('[Admin] Minh', 'Bạn gửi giúp mình mã đơn nhé.', 'customer-a');
        receive?.('Trần Gia Hân', 'Mã đơn của mình là #2085.', 'customer-a');
        receive?.('Phạm Quốc Bảo', 'Mình muốn hỏi về cách bảo quản rau.', 'customer-b');
        return;
      }
      if (method !== 'ReplyToClient') throw new Error('Thao tác ngoài phạm vi kiểm thử.');
      if (failChat) { failChat = false; throw new Error('Lỗi gửi mô phỏng.'); }
      receive?.('[Admin] Minh', text, id);
    },
    reconnect() {
      this.state = HubConnectionState.Reconnecting;
      reconnecting?.();
      this.state = HubConnectionState.Connected;
      reconnected?.();
    },
  };
  active = connection;
  return connection;
}

createRoot(document.getElementById('root')).render(
  <HelmetProvider><QueryClientProvider client={queryClient}>
    <MemoryRouter initialEntries={['/admin/support']}>
      {params.has('controls') && <button onClick={() => active?.reconnect()}>Mô phỏng kết nối lại</button>}
      <AdminSupportPage createConnection={createConnection} />
    </MemoryRouter>
  </QueryClientProvider></HelmetProvider>,
);
