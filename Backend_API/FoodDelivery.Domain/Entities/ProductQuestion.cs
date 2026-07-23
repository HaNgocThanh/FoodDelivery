using System;

namespace FoodDelivery.Domain.Entities;

public class ProductQuestion
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int UserId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
    public string? AnswerText { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AnsweredAt { get; set; }

    // Navigation properties
    public Product? Product { get; set; }
    public AppUser? User { get; set; }
}
