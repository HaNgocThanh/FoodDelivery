using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Domain.Entities;

public class Order
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? PromotionId { get; set; }
    public DateTime OrderDate { get; set; }
    public decimal TotalAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public OrderStatus Status { get; set; }
    public int? ShipperId { get; set; }

    // Navigation properties
    public AppUser? User { get; set; }
    public AppUser? Shipper { get; set; }
    public Promotion? Promotion { get; set; }
    public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}
