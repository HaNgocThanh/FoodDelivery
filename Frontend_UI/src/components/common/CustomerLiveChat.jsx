import { useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { MessageCircle, Send, X, Wifi, WifiOff, Loader2 } from 'lucide-react';

/**
 * CustomerLiveChat
 * ----------------------------------------------------------------------
 * Widget chat nổi cho khách hàng (entry point phía User).
 *
 * - Hiển thị nút chat tròn ở góc dưới-phải mọi trang.
 * - Click mở khung chat mặc định.
 * - Khách gõ tên hiển thị (lưu localStorage) → JoinCustomerGroup.
 * - Gửi `SendMessageToAdmin(message)`, nhận `ReceiveMessage` từ Admin.
 * - Không lưu DB (theo yêu cầu).
 *
 * Props:
 * - hubUrl: URL SignalR Hub
 *   Mặc định trỏ về dev profile http của backend (port 5156).
 *   Để dùng https backend, set VITE_SIGNALR_HUB_URL trong .env hoặc truyền prop.
 * - defaultSenderName: tên mặc định nếu chưa có (lấy từ localStorage / user)
 * - positionClass: tuỳ chỉnh vị trí (mặc định 'bottom-6 right-6')
 */
const DEFAULT_HUB_URL = 'http://localhost:5156/supporthub';
const STORAGE_KEY = 'fooddelivery_chat_sender_name';
const STORAGE_OPEN_KEY = 'fooddelivery_chat_open';

/**
 * Kiểm tra một chuỗi có phải là tên hiển thị hợp lệ hay không.
 * Hợp lệ = có ít nhất 1 chữ cái/số và không phải toàn ký tự đặc biệt (như "/", "-", "?"...).
 */
function isValidSenderName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  // Bỏ qua nếu chỉ chứa ký tự đặc biệt / dấu câu / whitespace
  if (!/[\p{L}\p{N}]/u.test(trimmed)) return false;
  return true;
}

function getDefaultSenderName(propsDefault) {
  // Ưu tiên 1: prop defaultSenderName (từ parent component)
  if (isValidSenderName(propsDefault)) return propsDefault.trim();
  try {
    // Ưu tiên 2: localStorage đã lưu từ phiên trước
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isValidSenderName(saved)) return saved.trim();

    // Ưu tiên 3: user profile từ localStorage (nếu đã đăng nhập)
    const userJson = localStorage.getItem('userProfile') || localStorage.getItem('user');
    if (userJson) {
      const u = JSON.parse(userJson);
      const candidate =
        u?.fullName || u?.name || u?.FullName || u?.userName || '';
      if (isValidSenderName(candidate)) return candidate.trim();
    }
  } catch {
    /* ignore */
  }
  return '';
}

export default function CustomerLiveChat({
  hubUrl = DEFAULT_HUB_URL,
  defaultSenderName = '',
  positionClass = 'bottom-24 right-6',
}) {
  // ====== UI state ====================================================
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [hasUnread, setHasUnread] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [senderName, setSenderName] = useState(() => getDefaultSenderName(defaultSenderName));
  // Auto-confirm tên khi đã có sẵn (đăng nhập hoặc đã lưu trước đó):
  // - reload trang với localStorage 'fooddelivery_chat_sender_name' → skip form đặt tên
  // - user mới lần đầu chưa có tên → false → hiện form đặt tên
  const [nameConfirmed, setNameConfirmed] = useState(() => {
    return !!getDefaultSenderName(defaultSenderName);
  });
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);

  const connectionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ====== Connect / reconnect =========================================
  useEffect(() => {
    let cancelled = false;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: false,
        transport:
          signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling,
      })
      .configureLogging(signalR.LogLevel.Warning)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (ctx) =>
          Math.min(1000 * 2 ** ctx.previousRetryCount, 15000),
      })
      .build();

    connectionRef.current = connection;

    const setStatusSafe = (s) => !cancelled && setConnectionStatus(s);
    connection.onreconnecting(() => setStatusSafe('reconnecting'));
    connection.onreconnected(() => setStatusSafe('connected'));
    connection.onclose(() => setStatusSafe('disconnected'));

    // Nhận message (từ khách khác gửi broadcast? không — chỉ từ Admin hoặc hệ thống)
    connection.on('ReceiveMessage', (senderNameArg, message, _connectionId) => {
      if (cancelled) return;
      const newMsg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sender: senderNameArg?.startsWith('[Admin]')
          ? 'admin'
          : senderNameArg?.startsWith('🔔') || senderNameArg?.startsWith('🛟')
          ? 'system'
          : 'admin',
        senderName: senderNameArg,
        text: message,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, newMsg]);
      setHasUnread(true);
    });

    const start = async () => {
      try {
        setStatusSafe('connecting');
        await connection.start();
        if (cancelled) return;

        // Nếu đã có tên (từ localStorage/userProfile) → auto JoinCustomerGroup
        // để admin thấy được khách. Form đặt tên sẽ KHÔNG hiện trong trường hợp này.
        const existingName = getDefaultSenderName(defaultSenderName);
        if (existingName) {
          try {
            await connection.invoke('JoinCustomerGroup', existingName);
          } catch {
            /* noop */
          }
        }
        setStatusSafe('connected');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[CustomerLiveChat] Connect error:', err);
        if (!cancelled) setStatusSafe('error');
      }
    };
    start();

    return () => {
      cancelled = true;
      connection.off('ReceiveMessage');
      connection.stop().catch(() => {});
      connectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubUrl]);

  // ====== Persist open state ==========================================
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_OPEN_KEY, isOpen ? '1' : '0');
    } catch {
      /* noop */
    }
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ====== Auto-scroll =================================================
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // ====== Send ========================================================
  const handleSend = async (e) => {
    e?.preventDefault?.();
    const text = draft.trim();
    if (!text || !connectionRef.current) return;

    const connection = connectionRef.current;
    if (connection.state !== signalR.HubConnectionState.Connected) {
      setError('Chưa kết nối được với máy chủ. Vui lòng đợi...');
      return;
    }

    const optimistic = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: 'customer',
      senderName: senderName || 'Bạn',
      text,
      ts: Date.now(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    setError(null);

    try {
      await connection.invoke('SendMessageToAdmin', text);
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimistic.id ? { ...m, failed: true } : m
        )
      );
      setError(err?.message || 'Không gửi được tin nhắn.');
    }
  };

  // ====== Update tên (lưu localStorage) =============================
  const handleSaveName = () => {
    const name = senderName.trim() || 'Khách hàng';
    setSenderName(name);
    setNameConfirmed(true);
    try {
      localStorage.setItem(STORAGE_KEY, name);
    } catch {
      /* noop */
    }
    // Re-invoke JoinCustomerGroup với tên mới
    if (connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      connectionRef.current.invoke('JoinCustomerGroup', name).catch(() => {});
    }
  };

  // ====== Status Badge ================================================
  const statusDot = useMemo(() => {
    const map = {
      connected: 'bg-emerald-500',
      connecting: 'bg-amber-500 animate-pulse',
      reconnecting: 'bg-amber-500 animate-pulse',
      disconnected: 'bg-slate-400',
      error: 'bg-red-500',
    };
    return map[connectionStatus] || map.disconnected;
  }, [connectionStatus]);

  // ====== RENDER ======================================================
  return (
    <>
      {/* ===== Floating button ===== */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Mở chat hỗ trợ"
          data-testid="customer-chat-toggle"
          className={`fixed ${positionClass} z-40 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 text-white shadow-xl shadow-blue-600/40 hover:shadow-2xl hover:shadow-blue-600/50 ring-4 ring-blue-100/60 transition-all flex items-center justify-center ${
            hasUnread ? 'animate-bounce' : ''
          }`}
        >
          <MessageCircle className="w-6 h-6" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white">
              !
            </span>
          )}
        </button>
      )}

      {/* ===== Chat panel ===== */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Chat hỗ trợ khách hàng"
          data-testid="customer-chat-panel"
          className={`fixed ${positionClass} z-50 w-[calc(100vw-3rem)] sm:w-96 max-w-[24rem] h-[32rem] max-h-[80vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden`}
        >
          {/* Header */}
          <header className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-3 flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-base font-bold">
                <MessageCircle className="w-4 h-4" />
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-blue-800 ${statusDot}`}
                title={connectionStatus}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight">Hỗ trợ trực tuyến</p>
              <p className="text-[11px] text-emerald-100">
                {connectionStatus === 'connected'
                  ? '🟢 Đang hoạt động'
                  : connectionStatus === 'connecting' || connectionStatus === 'reconnecting'
                  ? '🟡 Đang kết nối...'
                  : connectionStatus === 'error'
                  ? '🔴 Mất kết nối'
                  : '⚪ Chưa kết nối'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Đóng"
              className="p-1.5 rounded hover:bg-white/20 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50/40">
            {messages.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">
                  Xin chào! 👋
                </p>
                <p className="text-[11px] mt-1 text-slate-500 max-w-[18rem] mx-auto">
                  Bạn có câu hỏi nào không? Hãy nhắn cho Admin ngay nhé — chúng
                  tôi phản hồi trong vài phút.
                </p>
              </div>
            )}

            {messages.map((m) => {
              const isMe = m.sender === 'customer' || m.senderName === 'Bạn';
              const isSys = m.sender === 'system';
              if (isSys) {
                return (
                  <div
                    key={m.id}
                    className="text-center text-[11px] text-slate-500 italic py-1"
                  >
                    {m.text}
                  </div>
                );
              }
              return (
                <div
                  key={m.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-sm ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-br-md'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                    } ${m.failed ? 'opacity-60 ring-1 ring-red-300' : ''}`}
                  >
                    {!isMe && (
                      <p className="text-[10px] font-bold text-emerald-700 mb-0.5">
                        {m.senderName?.replace(/^\[Admin\]\s*/, '')}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                    <p
                      className={`text-[9px] mt-1 ${
                        isMe ? 'text-emerald-100' : 'text-slate-400'
                      }`}
                    >
                      {new Date(m.ts).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Error */}
          {error && (
            <div className="mx-3 mt-2 p-2 bg-red-50 border border-red-200 text-red-700 text-[11px] rounded-lg flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} aria-label="Đóng" className="text-red-700/70 hover:text-red-900">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Form nhập */}
          {!nameConfirmed ? (
            <div className="border-t border-slate-200 p-3 bg-white space-y-2">
              <label
                htmlFor="customer-name-input"
                className="block text-[11px] font-semibold text-slate-700"
              >
                Tên hiển thị của bạn:
              </label>
              <div className="flex gap-2">
                <input
                  id="customer-name-input"
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  Bắt đầu
                </button>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSend}
              className="border-t border-slate-200 p-2.5 bg-white flex items-center gap-2"
            >
              <input
                ref={inputRef}
                id="customer-chat-input"
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Nhập tin nhắn..."
                disabled={connectionStatus !== 'connected'}
                autoComplete="off"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!draft.trim() || connectionStatus !== 'connected'}
                className="inline-flex items-center justify-center w-9 h-9 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-lg transition shadow-sm"
                aria-label="Gửi tin nhắn"
              >
                {connectionStatus !== 'connected' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
