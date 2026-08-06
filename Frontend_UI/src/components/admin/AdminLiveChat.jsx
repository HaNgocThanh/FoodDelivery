import { useEffect, useMemo, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { Send, MessageSquare, Wifi, WifiOff, RefreshCw } from 'lucide-react';

/**
 * AdminLiveChat
 * ----------------------------------------------------------------------
 * Giao diện chat real-time cho Admin hỗ trợ khách hàng qua SignalR.
 *
 * - Không lưu database, toàn bộ state chỉ trong useState (theo yêu cầu).
 * - Khi kết nối thành công, server-side sẽ nhận diện Admin qua
 *   `JoinAdminGroup()` để phân quyền nhận broadcast tin nhắn từ khách.
 * - Mỗi khách được định danh bằng SignalR `connectionId`. State lưu trữ
 *   tin nhắn theo cấu trúc:
 *     {
 *       [connectionId]: [
 *         { id: string, sender: 'customer' | 'admin', text: string, ts: number }
 *       ]
 *     }
 *
 * Props:
 * - hubUrl: string  - URL của SignalR Hub
 *   Mặc định trỏ về dev profile http của backend (port 5156).
 *   Để dùng https backend, set VITE_SIGNALR_HUB_URL trong .env hoặc truyền prop.
 * - accessToken: string | null - Bearer token của Admin (tùy chọn)
 */
const DEFAULT_HUB_URL = 'http://localhost:5156/supporthub';

export default function AdminLiveChat({
  hubUrl = DEFAULT_HUB_URL,
  accessToken = null,
}) {
  // ====== State quản lý kết nối & UI ===================================
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  // 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'

  const [conversations, setConversations] = useState({});
  // { [connectionId]: ChatMessage[] }

  const [customerNames, setCustomerNames] = useState({});
  // { [connectionId]: senderName }  -- phục vụ hiển thị danh sách khách

  const [readMarks, setReadMarks] = useState({});
  // { [connectionId]: lastReadAt } -- thời điểm admin cuối cùng đã đọc cuộc hội thoại

  const [selectedConnectionId, setSelectedConnectionId] = useState(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [sendError, setSendError] = useState(null);

  // Ref để giữ connection qua các re-render + auto-scroll khung chat
  const connectionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ====== Kết nối SignalR ==============================================
  useEffect(() => {
    let cancelled = false;

    const buildConnection = () => {
      const builder = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          // Server có thể yêu cầu Bearer token từ access_token query string
          accessTokenFactory: () => accessToken || '',
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets |
            signalR.HttpTransportType.LongPolling,
        })
        .configureLogging(signalR.LogLevel.Warning)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (ctx) =>
            Math.min(1000 * 2 ** ctx.previousRetryCount, 15000),
        });

      return builder.build();
    };

    const connection = buildConnection();
    connectionRef.current = connection;

    // --- Lifecycle handlers ------------------------------------------
    const setStatusSafe = (status) => {
      if (!cancelled) setConnectionStatus(status);
    };

    connection.onreconnecting(() => setStatusSafe('reconnecting'));
    connection.onreconnected(() => setStatusSafe('connected'));
    connection.onclose(() => setStatusSafe('disconnected'));

    // --- Server-push: nhận tin nhắn từ server ----------------------
    // Server có thể broadcast 3 loại:
    //  (1) System: "🔔 Hệ thống" / "🛟 Hỗ trợ"  → skip customerNames
    //  (2) Customer message: tên thật của khách
    //  (3) Admin echo: "[Admin] <name>"  ← do ReplyToClient quay về admin-group
    //  Phân loại dựa vào prefix để hiển thị đúng bên trái / phải.
    connection.on('ReceiveMessage', (senderName, message, connectionId) => {
      if (cancelled) return;

      const rawName = senderName || '';
      const isSystem = rawName.startsWith('🔔') || rawName.startsWith('🛟');
      const isAdminEcho = rawName.startsWith('[Admin]');
      const sender = isSystem ? 'system' : isAdminEcho ? 'admin' : 'customer';

      // Chỉ lưu tên khách khi đây thực sự là customer (không phải admin/system echo)
      if (sender === 'customer' && rawName && connectionId) {
        setCustomerNames((prev) =>
          prev[connectionId] === rawName
            ? prev
            : { ...prev, [connectionId]: rawName }
        );
      }

      // Append message
      setConversations((prev) => {
        const existing = prev[connectionId] || [];
        const nextMsg = {
          id: `${connectionId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sender,
          senderName: rawName,
          text: message || '',
          ts: Date.now(),
        };
        return { ...prev, [connectionId]: [...existing, nextMsg] };
      });

      // Nếu admin đang mở cuộc hội thoại này → tự động đánh dấu đã đọc
      // (badge đỏ chỉ áp dụng cho khách đang ở sidebar mà chưa click vào)
      if (sender === 'customer') {
        setSelectedConnectionId((currentSelected) => {
          if (currentSelected === connectionId) {
            setReadMarks((prev) => ({ ...prev, [connectionId]: Date.now() }));
          }
          return currentSelected;
        });
      }
    });

    // --- Start + JoinAdminGroup ------------------------------------
    const startConnection = async () => {
      try {
        setStatusSafe('connecting');
        await connection.start();

        if (cancelled) return;

        // Sau khi kết nối thành công, gọi server để đăng ký Admin
        // nhận broadcast từ tất cả khách hàng.
        try {
          await connection.invoke('JoinAdminGroup');
        } catch (err) {
          // Không throw để không chặn UI; chỉ log
          // eslint-disable-next-line no-console
          console.warn('[AdminLiveChat] JoinAdminGroup failed:', err);
        }

        setStatusSafe('connected');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[AdminLiveChat] Connection error:', err);
        if (!cancelled) setStatusSafe('error');
      }
    };

    startConnection();

    // Cleanup khi component unmount
    return () => {
      cancelled = true;
      connection.off('ReceiveMessage');
      connection.stop().catch(() => {
        /* ignore */
      });
      connectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubUrl, accessToken]);

  // ====== Auto-scroll khi có tin nhắn mới của khách đang chọn ===========
  useEffect(() => {
    if (selectedConnectionId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [conversations, selectedConnectionId]);

  // ====== Focus input khi chọn khách ----------------------------------
  useEffect(() => {
    if (selectedConnectionId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedConnectionId]);

  // ====== Tính danh sách connectionId (sort theo tin nhắn mới nhất) ----
  const conversationList = useMemo(() => {
    return Object.entries(conversations)
      .map(([cid, msgs]) => {
        const last = msgs[msgs.length - 1];
        const readAt = readMarks[cid] || 0;
        return {
          connectionId: cid,
          senderName: customerNames[cid] || 'Khách hàng',
          lastMessage: last?.text || '',
          lastTs: last?.ts || 0,
          // Tin nhắn *chưa đọc* = tin nhắn từ khách có ts > lần đọc gần nhất
          unreadFromCustomer: msgs.filter(
            (m) => m.sender === 'customer' && m.ts > readAt
          ).length,
        };
      })
      .sort((a, b) => b.lastTs - a.lastTs);
  }, [conversations, customerNames, readMarks]);

  const selectedMessages = selectedConnectionId
    ? conversations[selectedConnectionId] || []
    : [];

  const selectedCustomerName = selectedConnectionId
    ? customerNames[selectedConnectionId] || 'Khách hàng'
    : null;

  // ====== Gửi phản hồi cho khách --------------------------------------
  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    const text = draftMessage.trim();
    if (!text || !selectedConnectionId || !connectionRef.current) return;

    const connection = connectionRef.current;
    if (connection.state !== signalR.HubConnectionState.Connected) {
      setSendError('Mất kết nối với máy chủ. Vui lòng đợi kết nối được khôi phục.');
      return;
    }

    // KHÔNG append optimistic bubble ở đây — Hub đã broadcast về admin-group
    // (ReplyToClient → Clients.Group(AdminGroup).SendAsync("[Admin] " + senderName, ...))
    // nên ta chỉ cần chờ echo. Tránh hiển thị 2 bubble admin trùng nhau.
    setDraftMessage('');
    setSendError(null);
    // Gửi reply = admin đã xem cuộc hội thoại → mark as read
    setReadMarks((prev) => ({
      ...prev,
      [selectedConnectionId]: Date.now(),
    }));

    try {
      await connection.invoke('ReplyToClient', selectedConnectionId, text);
    } catch (err) {
      setSendError(
        err?.message ||
          'Không gửi được tin nhắn. Vui lòng thử lại hoặc kiểm tra kết nối.'
      );
    }
  };
  const StatusBadge = () => {
    const map = {
      connected: {
        Icon: Wifi,
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        label: 'Đã kết nối',
      },
      connecting: {
        Icon: LoaderDot,
        cls: 'bg-sky-50 text-sky-700 border-sky-200',
        label: 'Đang kết nối...',
      },
      reconnecting: {
        Icon: RefreshCw,
        cls: 'bg-amber-50 text-amber-700 border-amber-200',
        label: 'Đang kết nối lại...',
      },
      disconnected: {
        Icon: WifiOff,
        cls: 'bg-slate-100 text-slate-600 border-slate-200',
        label: 'Chưa kết nối',
      },
      error: {
        Icon: WifiOff,
        cls: 'bg-red-50 text-red-700 border-red-200',
        label: 'Lỗi kết nối',
      },
    };
    const cfg = map[connectionStatus] || map.disconnected;
    const { Icon, cls, label } = cfg;
    const isConnecting =
      connectionStatus === 'connecting' || connectionStatus === 'reconnecting';

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider border rounded-lg ${cls}`}
      >
        <Icon
          className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`}
        />
        {label}
      </span>
    );
  };

  // ====== Render chính ================================================
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[500px]">

      {/* ===== Header ===== */}
      <header className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex-shrink-0">
            <MessageSquare className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 leading-tight truncate">
              Hỗ trợ khách hàng trực tuyến
            </h2>
            <p className="text-xs text-slate-500 truncate">
              Hub: <span className="font-mono">{hubUrl}</span>
            </p>
          </div>
        </div>
        <StatusBadge />
      </header>

      {/* ===== Body: split-pane 1/3 + 2/3 ===== */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">

        {/* ----- Cột trái: danh sách khách ----- */}
        <aside className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/50 flex flex-col min-h-0">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Cuộc hội thoại
            </span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-md">
              {conversationList.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversationList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600">
                  Chưa có cuộc hội thoại nào
                </p>
                <p className="text-slate-400">
                  Tin nhắn từ khách hàng sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {conversationList.map((conv) => {
                  const active = conv.connectionId === selectedConnectionId;
                  return (
                    <li key={conv.connectionId}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConnectionId(conv.connectionId);
                          setSendError(null);
                          // Đánh dấu đã đọc khi admin click chọn khách
                          // → badge đỏ sẽ tắt trong render kế tiếp
                          setReadMarks((prev) => ({
                            ...prev,
                            [conv.connectionId]: Date.now(),
                          }));
                        }}
                        className={`w-full text-left p-3 transition flex items-start gap-3 ${
                          active
                            ? 'bg-emerald-600 text-white'
                            : 'hover:bg-white text-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold flex-shrink-0 ${
                            active
                              ? 'bg-white/20 text-white'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                          title={conv.connectionId}
                        >
                          {conv.senderName.slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-bold truncate ${
                              active ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {conv.senderName}
                          </p>
                          <p
                            className={`text-xs truncate ${
                              active ? 'text-emerald-100' : 'text-slate-500'
                            }`}
                          >
                            {conv.lastMessage || '(chưa có tin nhắn)'}
                          </p>
                          <p
                            className={`text-[10px] font-mono truncate mt-0.5 ${
                              active ? 'text-emerald-200' : 'text-slate-400'
                            }`}
                          >
                            {conv.connectionId.slice(0, 18)}…
                          </p>
                        </div>
                        {conv.unreadFromCustomer > 0 && !active && (
                          <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-red-500 text-white flex-shrink-0">
                            {conv.unreadFromCustomer}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* ----- Cột phải: khung chat chính ----- */}
        <section className="flex-1 flex flex-col min-h-0 bg-white">

          {/* Sub-header */}
          <div className="p-4 border-b border-slate-200 flex items-center gap-3">
            {selectedConnectionId ? (
              <>
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                  {selectedCustomerName.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {selectedCustomerName}
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 truncate">
                    {selectedConnectionId}
                  </p>
                </div>
              </>
            ) : (
              <>
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-400">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Chưa chọn khách hàng
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Chọn một cuộc hội thoại bên trái để bắt đầu trả lời.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Khung message list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
            {!selectedConnectionId ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-2 py-12">
                <MessageSquare className="w-10 h-10" />
                <p className="text-sm font-semibold text-slate-500">
                  Chưa có cuộc hội thoại nào
                </p>
                <p className="text-xs text-slate-400 max-w-xs">
                  Tin nhắn từ khách sẽ hiển thị tại đây sau khi bạn chọn một
                  cuộc hội thoại.
                </p>
              </div>
            ) : selectedMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 gap-2 py-12">
                <MessageSquare className="w-10 h-10" />
                <p className="text-sm font-semibold text-slate-500">
                  Cuộc hội thoại trống
                </p>
                <p className="text-xs text-slate-400">
                  Hãy gửi tin nhắn đầu tiên cho khách.
                </p>
              </div>
            ) : (
              selectedMessages.map((m) => {
                const isAdmin = m.sender === 'admin';
                const isSystem = m.sender === 'system';
                if (isSystem) {
                  return (
                    <div
                      key={m.id}
                      className="text-center text-[11px] text-slate-500 italic py-1"
                    >
                      <span>{m.senderName}</span>
                      {m.text && <span> · {m.text}</span>}
                    </div>
                  );
                }
                return (
                  <div
                    key={m.id}
                    className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isAdmin
                          ? 'bg-emerald-600 text-white rounded-br-md'
                          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md'
                      } ${m.failed ? 'opacity-60 ring-1 ring-red-300' : ''}`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      <p
                        className={`text-[10px] mt-1 ${
                          isAdmin ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        {isAdmin && m.senderName && (
                          <span className="mr-1">
                            {m.senderName.replace(/^\[Admin\]\s*/, '')}
                          </span>
                        )}
                        {new Date(m.ts).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {m.failed && ' · Gửi lỗi'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Lỗi gửi */}
          {sendError && (
            <div className="mx-4 mb-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {sendError}
            </div>
          )}

          {/* Form nhập liệu */}
          <form
            onSubmit={handleSendMessage}
            className="border-t border-slate-200 p-3 flex items-center gap-2 bg-white"
          >
            <input
              ref={inputRef}
              id="admin-chat-input"
              type="text"
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
              placeholder={
                selectedConnectionId
                  ? `Nhắn cho "${selectedCustomerName}"...`
                  : 'Chọn khách hàng để bắt đầu chat'
              }
              disabled={!selectedConnectionId || connectionStatus !== 'connected'}
              autoComplete="off"
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={
                !selectedConnectionId ||
                !draftMessage.trim() ||
                connectionStatus !== 'connected'
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition shadow-sm"
            >
              <Send className="w-4 h-4" />
              Gửi
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

/**
 * Spinner nhỏ dùng cho trạng thái "đang kết nối".
 * Tách ra vì chỉ dùng trong StatusBadge.
 */
function LoaderDot({ className = '' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}