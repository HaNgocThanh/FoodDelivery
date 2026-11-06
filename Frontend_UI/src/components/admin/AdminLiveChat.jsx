import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { ArrowLeft, MessageSquare, RefreshCw, Send } from 'lucide-react';

const labels = {
  connecting: 'Đang kết nối…',
  connected: 'Đã kết nối',
  reconnecting: 'Đang kết nối lại…',
  disconnected: 'Mất kết nối',
  error: 'Không thể kết nối',
};

const emptyInbox = {
  connecting: 'Đang chờ kết nối để nhận hội thoại.',
  connected: 'Tin nhắn mới từ khách sẽ xuất hiện tại đây.',
  reconnecting: 'Đang chờ kết nối để nhận hội thoại.',
  disconnected: 'Kết nối lại để nhận tin nhắn mới.',
  error: 'Kết nối lại để nhận tin nhắn mới.',
};

const clock = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' });

function connect(hubUrl, accessToken) {
  return new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect({ nextRetryDelayInMilliseconds: ({ previousRetryCount }) => Math.min(1000 * 2 ** previousRetryCount, 15000) })
      .build();
}

export default function AdminLiveChat({ hubUrl, accessToken, active, createConnection = connect }) {
  const [status, setStatus] = useState('connecting');
  const [attempt, setAttempt] = useState(0);
  const [threads, setThreads] = useState({});
  const [selected, setSelected] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(null);
  const connectionRef = useRef(null);
  const selectedRef = useRef(null);
  const sendGate = useRef(false);
  const feed = useRef(null);
  const threadTitle = useRef(null);
  const listTitle = useRef(null);
  const rowButtons = useRef(new Map());
  const nearEnd = useRef(true);
  const messageId = useRef(0);

  useEffect(() => {
    let disposed = false;
    const connection = createConnection(hubUrl, accessToken);
    connectionRef.current = connection;

    async function subscribe() {
      try {
        await connection.invoke('JoinAdminGroup');
        if (!disposed && connection.state === signalR.HubConnectionState.Connected) setStatus('connected');
      } catch {
        if (disposed) return;
        await connection.stop().catch(() => {});
        if (!disposed) setStatus('error');
      }
    }

    connection.onreconnecting(() => { if (!disposed) setStatus('reconnecting'); });
    connection.onreconnected(() => { if (!disposed) void subscribe(); });
    connection.onclose(() => { if (!disposed) setStatus('disconnected'); });
    connection.on('ReceiveMessage', (name, text, id) => {
      if (disposed || !id || id === 'system' || typeof text !== 'string') return;
      const senderName = typeof name === 'string' ? name : '';
      const system = senderName === '🔔 Hệ thống' || senderName === '🛟 Hỗ trợ';
      const admin = senderName.startsWith('[Admin] ');
      const message = { id: ++messageId.current, senderName, text, at: Date.now(), system, admin };
      const isReading = selectedRef.current === id && !feed.current?.closest('[hidden]');
      setThreads(previous => {
        const thread = Object.hasOwn(previous, id) ? previous[id] : null;
        if (system && !thread) return previous;
        return {
          ...previous,
          [id]: {
            name: !system && !admin && senderName ? senderName : thread?.name || 'Khách hàng',
            messages: [...(thread?.messages || []), message],
            unread: isReading ? 0 : (thread?.unread || 0) + Number(!system && !admin),
          },
        };
      });
    });

    setStatus('connecting');
    void connection.start().then(() => { if (!disposed) return subscribe(); }).catch(() => {
      if (!disposed) setStatus('error');
    });
    return () => {
      disposed = true;
      connectionRef.current = null;
      connection.off('ReceiveMessage');
      void connection.stop().catch(() => {});
    };
  }, [accessToken, hubUrl, attempt, createConnection]);

  const thread = selected ? threads[selected] : null;
  const selectedMessages = thread?.messages;
  useEffect(() => {
    if (active && feed.current && nearEnd.current) feed.current.scrollTop = feed.current.scrollHeight;
  }, [active, selected, selectedMessages]);

  useEffect(() => {
    if (active && selected) {
      setThreads(previous => previous[selected]?.unread ?
        { ...previous, [selected]: { ...previous[selected], unread: 0 } } : previous);
    }
  }, [active, selected]);

  function openThread(id) {
    selectedRef.current = id;
    nearEnd.current = true;
    setSelected(id);
    setThreads(previous => ({ ...previous, [id]: { ...previous[id], unread: 0 } }));
    requestAnimationFrame(() => threadTitle.current?.focus());
  }

  function closeThread() {
    selectedRef.current = null;
    setSelected(null);
    requestAnimationFrame(() => (rowButtons.current.get(selected) || listTitle.current)?.focus());
  }

  const draft = selected ? drafts[selected] || '' : '';
  async function send(event) {
    event.preventDefault();
    const id = selected;
    const text = draft.trim();
    const connection = connectionRef.current;
    if (!id || !text || sendGate.current || status !== 'connected' ||
        connection?.state !== signalR.HubConnectionState.Connected) return;
    sendGate.current = true;
    setSending(id);
    setErrors(previous => ({ ...previous, [id]: '' }));
    try {
      await connection.invoke('ReplyToClient', id, text);
      setDrafts(previous => ({ ...previous, [id]: '' }));
    } catch {
      setErrors(previous => ({ ...previous, [id]: 'Chưa xác nhận gửi. Kiểm tra hội thoại trước khi thử lại.' }));
    } finally {
      sendGate.current = false;
      setSending(null);
    }
  }

  const list = Object.entries(threads).sort(([, a], [, b]) => b.messages.at(-1).id - a.messages.at(-1).id);
  return <section aria-label="Chat trực tuyến">
    <header className="as-bar">
      <p role="status" className="as-connection" data-connected={status === 'connected'}>{labels[status]}</p>
      {(status === 'error' || status === 'disconnected') && <button className="as-button" onClick={() => setAttempt(value => value + 1)}>
        <RefreshCw size={15} aria-hidden="true" /> Kết nối lại
      </button>}
    </header>
    <div className="as-inbox" data-open={Boolean(thread)}>
      <section className="as-list" aria-labelledby="as-list-title">
        <h2 id="as-list-title" ref={listTitle} tabIndex={-1}>Hội thoại{(list.length > 0 || status === 'connected') && <small aria-hidden="true">{list.length}</small>}</h2>
        {list.length === 0 ? <p className="as-list-empty">{emptyInbox[status]}</p> : <ul>
          {list.map(([id, item]) => {
            const preview = item.messages.findLast(message => !message.system) || item.messages.at(-1);
            return <li key={id}><button type="button" aria-pressed={selected === id}
              ref={node => { if (node) rowButtons.current.set(id, node); else rowButtons.current.delete(id); }}
              onClick={() => openThread(id)}>
              <span className="as-avatar" aria-hidden="true">{item.name.trim().slice(0, 1).toUpperCase()}</span>
              <span className="as-thread-summary"><strong>{item.name}</strong><span>{preview.text}</span></span>
              {item.unread > 0 && <small aria-label={item.unread + ' tin chưa đọc'}>{item.unread}</small>}
            </button></li>;
          })}
        </ul>}
      </section>
      <section className="as-thread" aria-label="Nội dung hội thoại">
        {thread ? <>
          <header>
            <button type="button" className="as-button as-back" aria-label="Về danh sách hội thoại" onClick={closeThread}>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <h2 ref={threadTitle} tabIndex={-1}>{thread.name}</h2>
          </header>
          <div ref={feed} role="log" aria-label="Tin nhắn" tabIndex={0} className="as-feed" onScroll={event => {
            const el = event.currentTarget;
            nearEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
          }}>
            {thread.messages.map(message => message.system ?
              <p className="as-system" key={message.id}>{message.text}</p> :
              <div key={message.id} className="as-bubble" data-admin={message.admin}>
                <p>{message.text}</p>
                <small>{message.admin ? message.senderName.slice(8) + ' · ' : ''}{clock.format(message.at)}</small>
              </div>
            )}
          </div>
          <form className="as-compose" onSubmit={event => void send(event)}>
            {errors[selected] && <p className="as-error" role="alert">{errors[selected]}</p>}
            <label className="sr-only" htmlFor="as-chat-input">Tin nhắn trả lời</label>
            <div>
              <input id="as-chat-input" value={draft} placeholder="Nhập tin nhắn" autoComplete="off"
                disabled={sending === selected} onChange={event => {
                  const value = event.target.value;
                  setDrafts(previous => ({ ...previous, [selected]: value }));
                }} />
              <button className="as-button as-primary" disabled={status !== 'connected' || Boolean(sending) || !draft.trim()}>
                <Send size={16} aria-hidden="true" /> {sending === selected ? 'Đang gửi…' : 'Gửi'}
              </button>
            </div>
          </form>
        </> : list.length > 0 && <div className="as-placeholder"><MessageSquare size={25} aria-hidden="true" /><p>Chọn một hội thoại để trả lời.</p></div>}
      </section>
    </div>
  </section>;
}
