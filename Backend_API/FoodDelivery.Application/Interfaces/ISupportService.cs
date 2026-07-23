using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FoodDelivery.Application.DTOs.Question;
using FoodDelivery.Application.DTOs.Support;

namespace FoodDelivery.Application.Interfaces;

public interface ISupportService
{
    // Questions (Q&A)
    Task<QuestionResponseDTO> CreateQuestionAsync(int userId, CreateQuestionDTO dto, CancellationToken ct = default);
    Task<QuestionResponseDTO> AnswerQuestionAsync(int questionId, AnswerQuestionDTO dto, CancellationToken ct = default);
    Task<IEnumerable<QuestionResponseDTO>> GetProductQuestionsAsync(int productId, CancellationToken ct = default);
    Task<IEnumerable<QuestionResponseDTO>> GetUnansweredQuestionsAsync(CancellationToken ct = default);

    // Support Tickets
    Task<TicketResponseDTO> CreateTicketAsync(int userId, CreateTicketDTO dto, CancellationToken ct = default);
    Task<TicketResponseDTO> ReplyTicketAsync(int ticketId, ReplyTicketDTO dto, CancellationToken ct = default);
    Task<IEnumerable<TicketResponseDTO>> GetUserTicketsAsync(int userId, CancellationToken ct = default);
    Task<IEnumerable<TicketResponseDTO>> GetOpenTicketsAsync(CancellationToken ct = default);
}
