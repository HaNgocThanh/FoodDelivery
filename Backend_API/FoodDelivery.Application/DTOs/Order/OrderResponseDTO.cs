using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Application.DTOs.Order;

public record OrderDetailResponseDTO(
    int ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal
);

public record OrderResponseDTO(
    int Id,
    int UserId,
    DateTime OrderDate,
    decimal SubTotal,
    decimal DiscountAmount,
    string? AppliedCouponCode,
    decimal TotalAmount,
    PaymentMethod PaymentMethod,
    OrderStatus Status,
    int? ShipperId,
    List<OrderDetailResponseDTO> Details
);
