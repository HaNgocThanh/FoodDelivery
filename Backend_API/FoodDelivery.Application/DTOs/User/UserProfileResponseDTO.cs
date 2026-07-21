using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Application.DTOs.User;

public record UserProfileResponseDTO(
    int Id,
    string FullName,
    string Email,
    string PhoneNumber,
    string Address1,
    string? Address2,
    int LoyaltyPoints,
    MembershipTier Tier,
    string Role
);
