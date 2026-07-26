using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Domain.Entities;

public class Promotion
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public DiscountType DiscountType { get; set; } = DiscountType.Percentage;
    public decimal DiscountValue { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public decimal MinOrderAmount { get; set; }
    public int MaxUsage { get; set; }
    public int CurrentUsage { get; set; }
    public DateTime ExpiryDate { get; set; }
    public bool IsActive { get; set; }

    // Navigation property
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
