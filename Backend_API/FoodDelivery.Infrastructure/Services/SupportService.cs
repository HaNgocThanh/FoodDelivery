using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FoodDelivery.Application.DTOs.Question;
using FoodDelivery.Application.DTOs.Support;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Exceptions;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Services;

public class SupportService : ISupportService
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;

    public SupportService(AppDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    // ==========================================
    // QUESTIONS (Q&A) BUSINESS LOGIC
    // ==========================================

    public async Task<QuestionResponseDTO> CreateQuestionAsync(int userId, CreateQuestionDTO dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.QuestionText))
        {
            throw new ArgumentException("Nội dung câu hỏi không được để trống.");
        }

        var product = await _context.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == dto.ProductId, ct);
        if (product == null)
        {
            throw new NotFoundException($"Sản phẩm với ID {dto.ProductId} không tồn tại.");
        }

        var question = new ProductQuestion
        {
            ProductId = dto.ProductId,
            UserId = userId,
            QuestionText = dto.QuestionText,
            CreatedAt = DateTime.UtcNow
        };

        await _context.ProductQuestions.AddAsync(question, ct);
        await _context.SaveChangesAsync(ct);

        var user = await _context.AppUsers.AsNoTracking().FirstAsync(u => u.Id == userId, ct);

        return new QuestionResponseDTO
        {
            Id = question.Id,
            ProductId = question.ProductId,
            ProductName = product.Name,
            UserId = question.UserId,
            UserFullName = user.FullName,
            QuestionText = question.QuestionText,
            AnswerText = question.AnswerText,
            CreatedAt = question.CreatedAt,
            AnsweredAt = question.AnsweredAt
        };
    }

    public async Task<QuestionResponseDTO> AnswerQuestionAsync(int questionId, AnswerQuestionDTO dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.AnswerText))
        {
            throw new ArgumentException("Nội dung câu trả lời không được để trống.");
        }

        var question = await _context.ProductQuestions
            .Include(q => q.Product)
            .Include(q => q.User)
            .FirstOrDefaultAsync(q => q.Id == questionId, ct);

        if (question == null)
        {
            throw new NotFoundException($"Không tìm thấy câu hỏi với ID #{questionId}.");
        }

        question.AnswerText = dto.AnswerText;
        question.AnsweredAt = DateTime.UtcNow;

        _context.ProductQuestions.Update(question);
        await _context.SaveChangesAsync(ct);

        return new QuestionResponseDTO
        {
            Id = question.Id,
            ProductId = question.ProductId,
            ProductName = question.Product?.Name ?? "Sản phẩm",
            UserId = question.UserId,
            UserFullName = question.User?.FullName ?? "Người dùng",
            QuestionText = question.QuestionText,
            AnswerText = question.AnswerText,
            CreatedAt = question.CreatedAt,
            AnsweredAt = question.AnsweredAt
        };
    }

    public async Task<IEnumerable<QuestionResponseDTO>> GetProductQuestionsAsync(int productId, CancellationToken ct = default)
    {
        return await _context.ProductQuestions
            .AsNoTracking()
            .Include(q => q.Product)
            .Include(q => q.User)
            .Where(q => q.ProductId == productId)
            .OrderByDescending(q => q.CreatedAt)
            .Select(q => new QuestionResponseDTO
            {
                Id = q.Id,
                ProductId = q.ProductId,
                ProductName = q.Product != null ? q.Product.Name : "Sản phẩm",
                UserId = q.UserId,
                UserFullName = q.User != null ? q.User.FullName : "Khách hàng",
                QuestionText = q.QuestionText,
                AnswerText = q.AnswerText,
                CreatedAt = q.CreatedAt,
                AnsweredAt = q.AnsweredAt
            })
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<QuestionResponseDTO>> GetUnansweredQuestionsAsync(CancellationToken ct = default)
    {
        return await _context.ProductQuestions
            .AsNoTracking()
            .Include(q => q.Product)
            .Include(q => q.User)
            .Where(q => q.AnswerText == null)
            .OrderBy(q => q.CreatedAt)
            .Select(q => new QuestionResponseDTO
            {
                Id = q.Id,
                ProductId = q.ProductId,
                ProductName = q.Product != null ? q.Product.Name : "Sản phẩm",
                UserId = q.UserId,
                UserFullName = q.User != null ? q.User.FullName : "Khách hàng",
                QuestionText = q.QuestionText,
                AnswerText = q.AnswerText,
                CreatedAt = q.CreatedAt,
                AnsweredAt = q.AnsweredAt
            })
            .ToListAsync(ct);
    }

    // ==========================================
    // SUPPORT TICKETS BUSINESS LOGIC
    // ==========================================

    public async Task<TicketResponseDTO> CreateTicketAsync(int userId, CreateTicketDTO dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Subject))
        {
            throw new ArgumentException("Chủ đề khiếu nại không được để trống.");
        }
        if (string.IsNullOrWhiteSpace(dto.Message))
        {
            throw new ArgumentException("Nội dung khiếu nại không được để trống.");
        }

        if (dto.OrderId.HasValue)
        {
            var orderExists = await _context.Orders.AsNoTracking().AnyAsync(o => o.Id == dto.OrderId.Value && o.UserId == userId, ct);
            if (!orderExists)
            {
                throw new NotFoundException($"Không tìm thấy đơn hàng #{dto.OrderId.Value} thuộc về tài khoản của bạn.");
            }
        }

        var ticket = new SupportTicket
        {
            UserId = userId,
            OrderId = dto.OrderId,
            Subject = dto.Subject,
            Message = dto.Message,
            Status = "Open",
            CreatedAt = DateTime.UtcNow
        };

        await _context.SupportTickets.AddAsync(ticket, ct);
        await _context.SaveChangesAsync(ct);

        var user = await _context.AppUsers.AsNoTracking().FirstAsync(u => u.Id == userId, ct);

        return new TicketResponseDTO
        {
            Id = ticket.Id,
            UserId = ticket.UserId,
            UserFullName = user.FullName,
            UserEmail = user.Email,
            OrderId = ticket.OrderId,
            Subject = ticket.Subject,
            Message = ticket.Message,
            AdminReply = ticket.AdminReply,
            Status = ticket.Status,
            CreatedAt = ticket.CreatedAt,
            RepliedAt = ticket.RepliedAt
        };
    }

    public async Task<TicketResponseDTO> ReplyTicketAsync(int ticketId, ReplyTicketDTO dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.AdminReply))
        {
            throw new ArgumentException("Nội dung phản hồi không được để trống.");
        }

        var ticket = await _context.SupportTickets
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Id == ticketId, ct);

        if (ticket == null)
        {
            throw new NotFoundException($"Không tìm thấy yêu cầu hỗ trợ với ID #{ticketId}.");
        }

        ticket.AdminReply = dto.AdminReply;
        ticket.Status = "Resolved";
        ticket.RepliedAt = DateTime.UtcNow;

        _context.SupportTickets.Update(ticket);
        await _context.SaveChangesAsync(ct);

        // Bắn email HTML thông báo tự động cho người dùng
        try
        {
            var user = ticket.User;
            if (user != null && !string.IsNullOrEmpty(user.Email))
            {
                var subject = $"[FoodDelivery] Phản hồi yêu cầu hỗ trợ #{ticket.Id}";
                var body = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>
                        <div style='background-color: #f97316; padding: 25px; text-align: center; color: #ffffff;'>
                            <h1 style='margin: 0; font-size: 20px; font-weight: bold;'>Phản hồi từ Ban quản trị FoodDelivery</h1>
                        </div>
                        <div style='padding: 24px;'>
                            <p style='font-size: 15px; color: #111827;'>Chào <strong>{user.FullName}</strong>,</p>
                            <p style='font-size: 14px; color: #4b5563; line-height: 1.5;'>
                                Yêu cầu hỗ trợ của bạn (<strong>#{ticket.Id} - Chủ đề: {ticket.Subject}</strong>) đã được phản hồi:
                            </p>
                            <div style='background-color: #f3f4f6; padding: 15px; border-radius: 12px; font-size: 14px; color: #1f2937; margin: 15px 0; border-left: 5px solid #f97316;'>
                                <p style='margin: 0 0 8px 0; font-weight: bold; color: #6b7280; font-size: 12px;'>Nội dung yêu cầu:</p>
                                <p style='margin: 0;'>{ticket.Message}</p>
                            </div>
                            <div style='background-color: #f0fdf4; padding: 15px; border-radius: 12px; font-size: 14px; color: #166534; margin: 15px 0; border-left: 5px solid #10b981;'>
                                <p style='margin: 0 0 8px 0; font-weight: bold; color: #15803d; font-size: 12px;'>Phản hồi của Admin:</p>
                                <p style='margin: 0;'>{dto.AdminReply}</p>
                            </div>
                            <p style='font-size: 13px; color: #9ca3af; margin-top: 25px; border-top: 1px solid #e5e7eb; padding-top: 15px;'>
                                Trạng thái yêu cầu: <strong>Đã giải quyết (Resolved)</strong>.
                            </p>
                        </div>
                    </div>";
                await _emailService.SendEmailAsync(user.Email, subject, body);
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EMAIL TICKET ERROR] Ticket #{ticketId}: {ex.Message}");
        }

        return new TicketResponseDTO
        {
            Id = ticket.Id,
            UserId = ticket.UserId,
            UserFullName = ticket.User?.FullName ?? "Khách hàng",
            UserEmail = ticket.User?.Email ?? "",
            OrderId = ticket.OrderId,
            Subject = ticket.Subject,
            Message = ticket.Message,
            AdminReply = ticket.AdminReply,
            Status = ticket.Status,
            CreatedAt = ticket.CreatedAt,
            RepliedAt = ticket.RepliedAt
        };
    }

    public async Task<IEnumerable<TicketResponseDTO>> GetUserTicketsAsync(int userId, CancellationToken ct = default)
    {
        return await _context.SupportTickets
            .AsNoTracking()
            .Include(t => t.User)
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TicketResponseDTO
            {
                Id = t.Id,
                UserId = t.UserId,
                UserFullName = t.User != null ? t.User.FullName : "Khách hàng",
                UserEmail = t.User != null ? t.User.Email : "",
                OrderId = t.OrderId,
                Subject = t.Subject,
                Message = t.Message,
                AdminReply = t.AdminReply,
                Status = t.Status,
                CreatedAt = t.CreatedAt,
                RepliedAt = t.RepliedAt
            })
            .ToListAsync(ct);
    }

    public async Task<IEnumerable<TicketResponseDTO>> GetOpenTicketsAsync(CancellationToken ct = default)
    {
        return await _context.SupportTickets
            .AsNoTracking()
            .Include(t => t.User)
            .Where(t => t.Status == "Open")
            .OrderBy(t => t.CreatedAt)
            .Select(t => new TicketResponseDTO
            {
                Id = t.Id,
                UserId = t.UserId,
                UserFullName = t.User != null ? t.User.FullName : "Khách hàng",
                UserEmail = t.User != null ? t.User.Email : "",
                OrderId = t.OrderId,
                Subject = t.Subject,
                Message = t.Message,
                AdminReply = t.AdminReply,
                Status = t.Status,
                CreatedAt = t.CreatedAt,
                RepliedAt = t.RepliedAt
            })
            .ToListAsync(ct);
    }
}
