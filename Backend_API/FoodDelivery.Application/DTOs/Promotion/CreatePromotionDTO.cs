namespace FoodDelivery.Application.DTOs.Promotion;

public record CreatePromotionDTO(
    string Code,
    decimal DiscountPercentage,
    int MaxUsage,
    DateTime ExpiryDate,
    bool IsActive = true
);
