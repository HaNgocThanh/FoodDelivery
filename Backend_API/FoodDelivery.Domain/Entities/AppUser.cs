namespace FoodDelivery.Domain.Entities;

public class AppUser
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address1 { get; set; } = string.Empty;
    public string? Address2 { get; set; }
    public int LoyaltyPoints { get; set; }

    // Navigation properties
    public ICollection<Order> UserOrders { get; set; } = new List<Order>();
    public ICollection<Order> ShipperOrders { get; set; } = new List<Order>();
}
