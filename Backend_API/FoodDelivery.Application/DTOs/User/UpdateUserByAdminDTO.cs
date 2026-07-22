using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Application.DTOs.User;

public class UpdateUserByAdminDTO
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string Address1 { get; set; } = string.Empty;
    public string? Address2 { get; set; }
    public int LoyaltyPoints { get; set; }
    public MembershipTier Tier { get; set; }
    public string Role { get; set; } = "Customer";
}
