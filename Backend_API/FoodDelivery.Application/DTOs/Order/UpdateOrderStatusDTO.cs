using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Application.DTOs.Order;

public record UpdateOrderStatusDTO(
    OrderStatus Status
);
