using System;

namespace FoodDelivery.Domain.Entities;

public class SupportTicket
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? OrderId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? AdminReply { get; set; }
    public string Status { get; set; } = "Open"; // Open, Resolved
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RepliedAt { get; set; }

    // Navigation properties
    public AppUser? User { get; set; }
    public Order? Order { get; set; }
}
