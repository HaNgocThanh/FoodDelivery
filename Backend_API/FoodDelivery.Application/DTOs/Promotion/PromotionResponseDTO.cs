namespace FoodDelivery.Application.DTOs.Promotion;

public record PromotionResponseDTO(
    int Id,
    string Code,
    decimal DiscountPercentage,
    int MaxUsage,
    int CurrentUsage,
    DateTime ExpiryDate,
    bool IsActive,
    bool IsExpired
);
