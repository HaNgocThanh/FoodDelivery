using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Application.DTOs.Order;

public record OrderRequestDTO(
    int UserId,
    PaymentMethod PaymentMethod,
    int? PromotionId,
    List<OrderItemRequestDTO> Items
);
