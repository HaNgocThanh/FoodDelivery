using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Application.DTOs.Promotion;

public record PromotionResponseDTO(
    int Id,
    string Code,
    DiscountType DiscountType,
    decimal DiscountValue,
    decimal? MaxDiscountAmount,
    decimal MinOrderAmount,
    int MaxUsage,
    int CurrentUsage,
    DateTime ExpiryDate,
    bool IsActive,
    bool IsExpired
);
