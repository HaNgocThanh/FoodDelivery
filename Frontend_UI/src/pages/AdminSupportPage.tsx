import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../api/axiosClient';
import AdminLayout from '../components/AdminLayout';
import {
  MessageSquare,
  HelpCircle,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Clock,
  ArrowRight,
  Send,
  RefreshCw
} from 'lucide-react';

interface QuestionItem {
  id: number;
  productId: number;
  productName: string;
  userId: number;
  userFullName: string;
  questionText: string;
  answerText: string | null;
  createdAt: string;
  answeredAt: string | null;
}

interface TicketItem {
  id: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  orderId: number | null;
  subject: string;
  message: string;
  adminReply: string | null;
  status: string; // Open, Resolved
  createdAt: string;
  repliedAt: string | null;
}

export default function AdminSupportPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'qa' | 'tickets'>('qa');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // States for answering questions
  const [answeringQuestionId, setAnsweringQuestionId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState<string>('');

  // States for replying to tickets
  const [replyingTicketId, setReplyingTicketId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<string>('');

  // Fetch unanswered questions
  const { data: unansweredQuestions = [], isLoading: isQLoading, refetch: refetchQuestions } = useQuery<QuestionItem[]>({
    queryKey: ['unansweredQuestions'],
    queryFn: async () => {
      return await axiosClient.get<QuestionItem[], QuestionItem[]>('/api/questions/unanswered');
    }
  });

  // Fetch open tickets
  const { data: openTickets = [], isLoading: isTicketsLoading, refetch: refetchTickets } = useQuery<TicketItem[]>({
    queryKey: ['openTickets'],
    queryFn: async () => {
      return await axiosClient.get<TicketItem[], TicketItem[]>('/api/tickets/open');
    }
  });

  // Mutation to answer question
  const answerMutation = useMutation({
    mutationFn: async ({ id, answerText }: { id: number; answerText: string }) => {
      return await axiosClient.put(`/api/questions/${id}/answer`, { answerText });
    },
    onSuccess: () => {
      setNotification({
        type: 'success',
        message: 'Đã gửi câu trả lời thành công!'
      });
      setAnsweringQuestionId(null);
      setAnswerText('');
      queryClient.invalidateQueries({ queryKey: ['unansweredQuestions'] });
    },
    onError: (err: any) => {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi gửi câu trả lời.'
      });
    }
  });

  // Mutation to reply and resolve ticket
  const replyMutation = useMutation({
    mutationFn: async ({ id, replyText }: { id: number; replyText: string }) => {
      return await axiosClient.put(`/api/tickets/${id}/reply`, { adminReply: replyText });
    },
    onSuccess: () => {
      setNotification({
        type: 'success',
        message: 'Đã giải quyết yêu cầu hỗ trợ và gửi thông báo email thành công!'
      });
      setReplyingTicketId(null);
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['openTickets'] });
    },
    onError: (err: any) => {
      setNotification({
        type: 'error',
        message: err.message || 'Lỗi khi gửi phản hồi hỗ trợ.'
      });
    }
  });

  const handleAnswerSubmit = (e: React.FormEvent, questionId: number) => {
    e.preventDefault();
    if (!answerText.trim()) return;
    answerMutation.mutate({ id: questionId, answerText });
  };

  const handleReplySubmit = (e: React.FormEvent, ticketId: number) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    replyMutation.mutate({ id: ticketId, replyText });
  };

  const handleRefresh = () => {
    if (activeTab === 'qa') {
      refetchQuestions();
    } else {
      refetchTickets();
    }
    setNotification({
      type: 'success',
      message: 'Đã làm mới dữ liệu!'
    });
  };

  return (
    <AdminLayout>
      <main className="p-6 lg:p-8 space-y-6 min-h-screen bg-slate-50">
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-rose-50 text-rose-600">
                <MessageSquare className="w-5 h-5" />
              </span>
              Chăm sóc Khách hàng &amp; Hỗ trợ
            </h1>
            <p className="text-xs text-slate-500 mt-1">Trả lời câu hỏi sản phẩm và giải quyết yêu cầu hỗ trợ khách hàng</p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-semibold rounded-lg transition shadow-sm w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </header>

        {/* NOTIFICATION */}
        {notification && (
          <div
            role="alert"
            className={`p-4 rounded-xl border flex items-center justify-between text-xs transition duration-200 shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className="font-semibold">{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-[10px] font-bold opacity-80 hover:opacity-100 hover:underline transition"
            >
              Đóng
            </button>
          </div>
        )}

        {/* TAB CONTROLS */}
        <nav role="tablist" className="flex gap-4 border-b border-slate-200 pb-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'qa'}
            onClick={() => setActiveTab('qa')}
            className={`pb-3 font-bold text-sm transition relative ${
              activeTab === 'qa' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Hỏi đáp chưa trả lời ({unansweredQuestions.length})
            {activeTab === 'qa' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-full" />
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tickets'}
            onClick={() => setActiveTab('tickets')}
            className={`pb-3 font-bold text-sm transition relative ${
              activeTab === 'tickets' ? 'text-emerald-700 font-extrabold' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Yêu cầu hỗ trợ (Tickets) ({openTickets.length})
            {activeTab === 'tickets' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 rounded-full" />
            )}
          </button>
        </nav>

        {/* CONTENT */}
        {activeTab === 'qa' ? (
          <div>
            {isQLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <p className="text-xs">Đang tải câu hỏi chưa trả lời...</p>
              </div>
            ) : unansweredQuestions.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {unansweredQuestions.map((q) => (
                  <article
                    key={q.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 hover:border-emerald-300 hover:shadow-sm transition"
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-mono font-bold">
                          {q.userFullName?.charAt(0).toUpperCase() || 'Q'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{q.userFullName}</p>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(q.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>
                      <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 font-bold rounded-lg h-fit text-[10px]">
                        Sản phẩm: {q.productName}
                      </div>
                    </div>

                    <div className="pl-9 space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Câu hỏi:</p>
                      <p className="text-sm text-slate-700 italic">"{q.questionText}"</p>
                    </div>

                    {answeringQuestionId === q.id ? (
                      <form onSubmit={(e) => handleAnswerSubmit(e, q.id)} className="pl-9 space-y-3">
                        <textarea
                          rows={3}
                          required
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Nhập câu trả lời chi tiết cho khách hàng..."
                          className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 text-slate-900 placeholder-slate-400 rounded-lg text-xs focus:outline-none transition resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setAnsweringQuestionId(null)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition"
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            disabled={answerMutation.isPending}
                            data-testid="button-submit-answer"
                            className="inline-flex items-center gap-1 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition shadow-sm"
                          >
                            {answerMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <Send className="w-3 h-3" /> Trả lời
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="pl-9 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAnsweringQuestionId(q.id);
                            setAnswerText('');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition"
                        >
                          Phản hồi câu hỏi
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-12 bg-white border border-slate-200 rounded-xl text-center space-y-2 shadow-sm">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-700">Không có câu hỏi nào chưa trả lời</p>
                <p className="text-[10px] text-slate-500">Tuyệt vời! Tất cả câu hỏi của người dùng đã được giải đáp.</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {isTicketsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                <p className="text-xs">Đang tải danh sách khiếu nại...</p>
              </div>
            ) : openTickets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {openTickets.map((t) => (
                  <article
                    key={t.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 hover:border-emerald-300 hover:shadow-sm transition"
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-mono font-bold">
                          {t.userFullName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{t.userFullName}</p>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {t.userEmail}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {t.orderId && (
                          <div className="px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 font-mono font-bold rounded-lg h-fit text-[10px]">
                            Đơn hàng: #{t.orderId}
                          </div>
                        )}
                        <div className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 font-bold rounded-lg h-fit text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          {t.status}
                        </div>
                      </div>
                    </div>

                    <div className="pl-9 space-y-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Chủ đề khiếu nại:</span>
                        <p className="text-sm font-bold text-slate-900">{t.subject}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Nội dung yêu cầu hỗ trợ:</span>
                        <p className="text-xs text-slate-700 leading-relaxed italic">"{t.message}"</p>
                      </div>
                    </div>

                    {replyingTicketId === t.id ? (
                      <form onSubmit={(e) => handleReplySubmit(e, t.id)} className="pl-9 space-y-3">
                        <textarea
                          rows={4}
                          required
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Nhập nội dung phản hồi giải quyết chi tiết... (Hệ thống sẽ gửi email HTML thông báo trực tiếp tới tài khoản khách hàng)"
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 text-slate-900 placeholder-slate-400 rounded-lg text-xs focus:outline-none transition resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReplyingTicketId(null)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition"
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            disabled={replyMutation.isPending}
                            data-testid="button-submit-reply"
                            className="inline-flex items-center gap-1 px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition shadow-sm"
                          >
                            {replyMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3" /> Giải quyết &amp; Gửi Email
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="pl-9 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTicketId(t.id);
                            setReplyText('');
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition"
                        >
                          Xử lý khiếu nại
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="p-12 bg-white border border-slate-200 rounded-xl text-center space-y-2 shadow-sm">
                <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-medium text-slate-700">Không có yêu cầu hỗ trợ nào đang mở</p>
                <p className="text-[10px] text-slate-500">Tuyệt vời! Tất cả các yêu cầu hỗ trợ từ khách hàng đã được xử lý xong.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
