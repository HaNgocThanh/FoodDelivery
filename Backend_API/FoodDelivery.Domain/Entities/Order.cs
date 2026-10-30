using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Domain.Entities;

public class Order
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int? PromotionId { get; set; }
    public DateTime OrderDate { get; set; }
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? AppliedCouponCode { get; set; }
    public int? PointsUsed { get; set; }
    public decimal? PointDiscount { get; set; }
    public decimal TotalAmount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public OrderStatus Status { get; set; }
    public int? ShipperId { get; set; }

    public string? RecipientName { get; set; }
    public string? RecipientPhone { get; set; }
    public string? DeliveryAddress { get; set; }
    public string? DeliverySlot { get; set; }
    public string? DeliveryNotes { get; set; }
    public bool LeaveAtDoorstep { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal ToteDeposit { get; set; }
    public decimal TipAmount { get; set; }

    // Navigation properties
    public AppUser? User { get; set; }
    public AppUser? Shipper { get; set; }
    public Promotion? Promotion { get; set; }
    public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
}
