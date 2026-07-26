using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Application.DTOs.Promotion;

public record CreatePromotionDTO(
    string Code,
    DiscountType DiscountType,
    decimal DiscountValue,
    decimal? MaxDiscountAmount,
    decimal MinOrderAmount,
    int MaxUsage,
    DateTime ExpiryDate,
    bool IsActive = true
);
