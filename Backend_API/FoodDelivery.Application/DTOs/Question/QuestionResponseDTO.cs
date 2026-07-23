using System;

namespace FoodDelivery.Application.DTOs.Question;

public class QuestionResponseDTO
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int UserId { get; set; }
    public string UserFullName { get; set; } = string.Empty;
    public string QuestionText { get; set; } = string.Empty;
    public string? AnswerText { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? AnsweredAt { get; set; }
}
