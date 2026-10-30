using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Application.DTOs.Order;

public record OrderRequestDTO(
    int UserId,
    PaymentMethod PaymentMethod,
    string? CouponCode,
    bool UsePoints,
    int UserPointsAvailable,
    List<OrderItemRequestDTO> Items,
    string RecipientName,
    string RecipientPhone,
    string DeliveryAddress,
    string DeliverySlot,
    string? DeliveryNotes,
    bool LeaveAtDoorstep,
    decimal TipAmount,
    decimal ExpectedTotalAmount
);
