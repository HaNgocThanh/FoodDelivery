namespace FoodDelivery.Application.DTOs.Order;

public record OrderItemRequestDTO(
    int ProductId,
    int Quantity
);
