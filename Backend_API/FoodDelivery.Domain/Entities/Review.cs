namespace FoodDelivery.Domain.Entities;

public class Review
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public int UserId { get; set; }
    public int? OrderId { get; set; }  // FK nullable — review có thể từ đơn hàng hoặc đánh giá tự do
    public int Rating { get; set; } // 1 to 5 stars
    public string Comment { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Product Product { get; set; } = null!;
    public AppUser User { get; set; } = null!;
    public Order? Order { get; set; }
}
