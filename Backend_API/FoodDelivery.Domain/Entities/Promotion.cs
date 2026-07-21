namespace FoodDelivery.Domain.Entities;

public class Promotion
{
    public int Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public decimal DiscountPercentage { get; set; }
    public int MaxUsage { get; set; }
    public int CurrentUsage { get; set; }
    public DateTime ExpiryDate { get; set; }
    public bool IsActive { get; set; }

    // Navigation property
    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
