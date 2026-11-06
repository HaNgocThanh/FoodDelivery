import { useRef, useState, type ComponentProps, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { RefreshCw } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import AdminLayout from '../components/AdminLayout';
import AdminLiveChat from '@/components/admin/AdminLiveChat.jsx';
import { useAuthStore } from '../stores/useAuthStore';
import { accountError, matchesSession } from '../utils/account';
import '../styles/admin-support.css';

type ChatFactory = ComponentProps<typeof AdminLiveChat>['createConnection'];
type Queue = 'qa' | 'tickets';
type Channel = Queue | 'live';
type RequestItem = {
  id: number;
  title: string;
  customer: string;
  detail: string;
  context: string;
  email: string;
  createdAt: string;
};

const channels = [
  ['live', 'Trực tuyến'],
  ['qa', 'Hỏi đáp'],
  ['tickets', 'Yêu cầu'],
] as const;

const queues = {
  qa: {
    path: '/api/questions/unanswered',
    title: 'Câu hỏi chưa trả lời',
    empty: 'Chưa có câu hỏi cần trả lời.',
    action: 'Trả lời',
    submit: 'Gửi câu trả lời',
    limit: 2000,
    update: (id: number, text: string) => axiosClient.put('/api/questions/' + id + '/answer', { answerText: text }),
  },
  tickets: {
    path: '/api/tickets/open',
    title: 'Yêu cầu đang mở',
    empty: 'Chưa có yêu cầu đang mở.',
    action: 'Phản hồi',
    submit: 'Gửi và đóng yêu cầu',
    limit: 4000,
    update: (id: number, text: string) => axiosClient.put('/api/tickets/' + id + '/reply', { adminReply: text }),
  },
};

function readQueue(value: unknown, channel: Queue): RequestItem[] {
  const invalid = () => new Error('Dữ liệu hỗ trợ không hợp lệ. Vui lòng tải lại.');
  if (!Array.isArray(value)) throw invalid();
  return value.map((row: Record<string, unknown>) => {
    if (!row || typeof row.id !== 'number' || !Number.isSafeInteger(row.id) || row.id < 1) throw invalid();
    const title = channel === 'qa' ? row.productName : row.subject;
    const detail = channel === 'qa' ? row.questionText : row.message;
    if (typeof title !== 'string' || typeof detail !== 'string' ||
        typeof row.userFullName !== 'string' || typeof row.createdAt !== 'string') throw invalid();
    return {
      id: row.id, title, detail, customer: row.userFullName, createdAt: row.createdAt,
      email: channel === 'tickets' && typeof row.userEmail === 'string' ? row.userEmail : '',
      context: channel === 'tickets' && typeof row.orderId === 'number' ? 'Đơn #' + row.orderId : '',
    };
  });
}

const dateFormat = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}

function SupportQueue({ channel, userId, token, active }: { channel: Queue; userId: number; token: string; active: boolean }) {
  const client = useQueryClient();
  const config = queues[channel];
  const heading = useRef<HTMLHeadingElement>(null);
  const gate = useRef(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const key = ['admin-support', userId, channel];
  const current = () => matchesSession(useAuthStore.getState(), { token, userId });
  const query = useQuery({
    queryKey: key,
    enabled: active,
    queryFn: async ({ signal }) => {
      const data = await axiosClient.get<unknown, unknown>(config.path, { signal });
      if (!current()) throw new Error('Phiên làm việc đã thay đổi.');
      return readQueue(data, channel);
    },
  });

  async function submit(event: FormEvent<HTMLFormElement>, item: RequestItem) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || text.length > config.limit || gate.current || !current()) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      await config.update(item.id, text);
      if (!current()) return;
      await client.cancelQueries({ queryKey: key });
      if (!current()) return;
      client.setQueryData<RequestItem[]>(key, rows => rows?.filter(row => row.id !== item.id));
      void client.invalidateQueries({ queryKey: key });
      setNotice(channel === 'qa' ? 'Đã gửi câu trả lời.' : 'Đã phản hồi và đóng yêu cầu.');
      setEditing(null);
      setDraft('');
      heading.current?.focus();
    } catch (cause) {
      if (current()) setError(accountError(cause));
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }

  return <section aria-labelledby={'support-' + channel} className="as-queue">
    <header className="as-bar">
      <h2 id={'support-' + channel} ref={heading} tabIndex={-1}>{config.title}{query.data && <small aria-hidden="true">{query.data.length}</small>}</h2>
      <button className="as-button" disabled={query.isFetching || busy} onClick={() => void query.refetch()}>
        <RefreshCw size={15} aria-hidden="true" /> Làm mới
      </button>
    </header>
    {notice && <p className="as-notice" role="status">{notice}</p>}
    {query.isPending && <p className="as-empty" role="status">Đang tải…</p>}
    {query.isError && <p className="as-error" role="alert">{accountError(query.error)}{query.data && ' Đang hiển thị dữ liệu lần tải trước.'}</p>}
    {query.data?.length === 0 && !query.isError && <p className="as-empty">{config.empty}</p>}
    {query.data?.map(item => {
      const date = displayDate(item.createdAt);
      const responseId = 'as-reply-' + channel;
      const triggerId = 'as-open-' + channel + '-' + item.id;
      return <article className="as-request" key={item.id}>
        <header>
          <h3>{item.title}</h3>
          <p className="as-meta">{[item.customer, item.email, item.context, date].filter(Boolean).join(' · ')}</p>
        </header>
        <p className="as-message">{item.detail}</p>
        {editing === item.id ? <form className="as-response" onSubmit={event => void submit(event, item)}>
          <label htmlFor={responseId}>Nội dung phản hồi</label>
          <textarea id={responseId} rows={4} autoFocus required maxLength={config.limit}
            disabled={busy} value={draft} onChange={event => setDraft(event.target.value)} />
          {channel === 'tickets' && <p className="as-meta">Gửi phản hồi sẽ đóng yêu cầu. Hệ thống sẽ thử gửi email cho khách.</p>}
          {error && <p className="as-error" role="alert">{error}</p>}
          <div className="as-actions">
            <button type="button" className="as-button" disabled={busy} onClick={() => {
              setEditing(null);
              requestAnimationFrame(() => {
                document.getElementById(triggerId)?.focus();
              });
            }}>Hủy</button>
            <button className="as-button as-primary" disabled={busy || !draft.trim()}>{busy ? 'Đang gửi…' : config.submit}</button>
          </div>
        </form> : <button id={triggerId} className="as-button" disabled={busy} onClick={() => {
          setDraft('');
          setError('');
          setNotice('');
          setEditing(item.id);
        }}>{config.action}</button>}
      </article>;
    })}
  </section>;
}

function SupportContent({ userId, token, createConnection }: { userId: number; token: string; createConnection?: ChatFactory }) {
  const [channel, setChannel] = useState<Channel>('live');
  return <main className="admin-support">
    <Helmet><title>Hỗ trợ | FoodDelivery</title></Helmet>
    <h1>Hỗ trợ</h1>
    <nav className="as-channels" aria-label="Kênh hỗ trợ">
      {channels.map(([value, label]) => <button type="button" key={value} aria-pressed={channel === value}
        onClick={() => setChannel(value)}>{label}</button>)}
    </nav>
    <div hidden={channel !== 'live'}>
      <AdminLiveChat hubUrl={import.meta.env.VITE_SIGNALR_HUB_URL || 'http://localhost:5156/supporthub'} accessToken={token}
        active={channel === 'live'} createConnection={createConnection} />
    </div>
    {(['qa', 'tickets'] as const).map(queue => <div hidden={channel !== queue} key={queue}>
      <SupportQueue channel={queue} token={token} userId={userId} active={channel === queue} />
    </div>)}
  </main>;
}

export default function AdminSupportPage({ createConnection }: { createConnection?: ChatFactory } = {}) {
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  return <AdminLayout>
    {user && token && user.role.toLowerCase() === 'admin' &&
      <SupportContent key={JSON.stringify([user.id, token])} userId={user.id} token={token} createConnection={createConnection} />}
  </AdminLayout>;
}
