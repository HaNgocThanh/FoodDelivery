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
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-orange-500" />
              Chăm sóc Khách hàng &amp; Hỗ trợ
            </h1>
            <p className="text-xs text-slate-400">Trả lời câu hỏi sản phẩm và giải quyết yêu cầu hỗ trợ khách hàng</p>
          </div>

          <button
            onClick={handleRefresh}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-md w-fit"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>

        {/* NOTIFICATION */}
        {notification && (
          <div
            className={`p-4 rounded-xl border flex items-center justify-between text-xs transition duration-200 ${
              notification.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/35 text-emerald-300 shadow-emerald-950/10'
                : 'bg-red-950/80 border-red-500/35 text-red-300 shadow-red-950/10'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="font-medium">{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-[10px] font-bold hover:underline opacity-80 hover:opacity-100"
            >
              Đóng
            </button>
          </div>
        )}

        {/* TAB CONTROLS */}
        <div className="flex gap-4 border-b border-slate-850 pb-1">
          <button
            onClick={() => setActiveTab('qa')}
            className={`pb-3 font-bold text-sm transition relative ${activeTab === 'qa' ? 'text-orange-500 font-extrabold' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Hỏi đáp chưa trả lời ({unansweredQuestions.length})
            {activeTab === 'qa' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`pb-3 font-bold text-sm transition relative ${activeTab === 'tickets' ? 'text-orange-500 font-extrabold' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Yêu cầu hỗ trợ (Tickets) ({openTickets.length})
            {activeTab === 'tickets' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-full" />
            )}
          </button>
        </div>

        {/* CONTENT */}
        {activeTab === 'qa' ? (
          <div>
            {isQLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                <p className="text-xs">Đang tải câu hỏi chưa trả lời...</p>
              </div>
            ) : unansweredQuestions.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {unansweredQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-mono font-bold">
                          {q.userFullName?.charAt(0).toUpperCase() || 'Q'}
                        </div>
                        <div>
                          <p className="font-bold text-white">{q.userFullName}</p>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(q.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                      </div>
                      <div className="px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold rounded-lg h-fit text-[10px]">
                        Sản phẩm: {q.productName}
                      </div>
                    </div>

                    <div className="pl-9 space-y-1">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Câu hỏi:</p>
                      <p className="text-sm text-slate-200 italic">"{q.questionText}"</p>
                    </div>

                    {answeringQuestionId === q.id ? (
                      <form onSubmit={(e) => handleAnswerSubmit(e, q.id)} className="pl-9 space-y-3">
                        <textarea
                          rows={3}
                          required
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="Nhập câu trả lời chi tiết cho khách hàng..."
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-850 focus:border-orange-500 text-white placeholder-slate-700 rounded-xl text-xs focus:outline-none transition resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setAnsweringQuestionId(null)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold rounded-lg transition"
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            disabled={answerMutation.isPending}
                            className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1"
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
                          onClick={() => {
                            setAnsweringQuestionId(q.id);
                            setAnswerText('');
                          }}
                          className="px-3 py-1.5 bg-slate-850 hover:bg-slate-800 text-orange-400 border border-slate-850 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        >
                          Phản hồi câu hỏi
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 bg-slate-900/30 border border-slate-850 rounded-2xl text-center space-y-2 text-slate-500">
                <HelpCircle className="w-8 h-8 text-slate-700 mx-auto" />
                <p className="text-xs font-medium text-slate-400">Không có câu hỏi nào chưa trả lời</p>
                <p className="text-[10px] text-slate-600">Tuyệt vời! Tất cả câu hỏi của người dùng đã được giải đáp.</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            {isTicketsLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                <p className="text-xs">Đang tải danh sách khiếu nại...</p>
              </div>
            ) : openTickets.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {openTickets.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col sm:flex-row justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-mono font-bold">
                          U
                        </div>
                        <div>
                          <p className="font-bold text-white">{t.userFullName}</p>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-650" />
                            {t.userEmail}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {t.orderId && (
                          <div className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 font-mono font-bold rounded-lg h-fit text-[10px]">
                            Đơn hàng: #{t.orderId}
                          </div>
                        )}
                        <div className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold rounded-lg h-fit text-[10px] flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          {t.status}
                        </div>
                      </div>
                    </div>

                    <div className="pl-9 space-y-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Chủ đề khiếu nại:</span>
                        <p className="text-sm font-bold text-white">{t.subject}</p>
                      </div>
                      <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Nội dung yêu cầu hỗ trợ:</span>
                        <p className="text-xs text-slate-300 leading-relaxed italic">"{t.message}"</p>
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
                          className="w-full px-3 py-2.5 bg-slate-950 border border-slate-850 focus:border-orange-500 text-white placeholder-slate-700 rounded-xl text-xs focus:outline-none transition resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReplyingTicketId(null)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-755 text-slate-300 text-xs font-semibold rounded-lg transition"
                          >
                            Hủy
                          </button>
                          <button
                            type="submit"
                            disabled={replyMutation.isPending}
                            className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1"
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
                          onClick={() => {
                            setReplyingTicketId(t.id);
                            setReplyText('');
                          }}
                          className="px-3.5 py-1.5 bg-slate-850 hover:bg-slate-800 text-orange-400 border border-slate-850 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                        >
                          Xử lý khiếu nại
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 bg-slate-900/30 border border-slate-850 rounded-2xl text-center space-y-2 text-slate-500">
                <FileText className="w-8 h-8 text-slate-700 mx-auto" />
                <p className="text-xs font-medium text-slate-400">Không có yêu cầu hỗ trợ nào đang mở</p>
                <p className="text-[10px] text-slate-600">Tuyệt vời! Tất cả các yêu cầu hỗ trợ từ khách hàng đã được xử lý xong.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
