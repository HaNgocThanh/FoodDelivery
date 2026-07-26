using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Application.DTOs.Promotion;

public record ValidatePromotionResponseDTO(
    int Id,
    string Code,
    DiscountType DiscountType,
    decimal DiscountValue,
    decimal? MaxDiscountAmount,
    decimal MinOrderAmount,
    bool IsValid,
    string Message
);
