namespace FoodDelivery.Application.DTOs.Promotion;

public record ValidatePromotionResponseDTO(
    int Id,
    string Code,
    decimal DiscountPercentage,
    bool IsValid,
    string Message
);
