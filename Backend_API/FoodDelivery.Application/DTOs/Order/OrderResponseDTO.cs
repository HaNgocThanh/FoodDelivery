using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Application.DTOs.Order;

public record OrderDetailResponseDTO(
    int ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal,
    bool IsReviewed
);

public record OrderResponseDTO(
    int Id,
    int UserId,
    DateTime OrderDate,
    decimal SubTotal,
    decimal DiscountAmount,
    string? AppliedCouponCode,
    int? PointsUsed,
    decimal? PointDiscount,
    decimal TotalAmount,
    PaymentMethod PaymentMethod,
    OrderStatus Status,
    int? ShipperId,
    List<OrderDetailResponseDTO> Details,
    string? RecipientName = null,
    string? RecipientPhone = null,
    string? DeliveryAddress = null,
    string? DeliverySlot = null,
    string? DeliveryNotes = null,
    bool LeaveAtDoorstep = false,
    decimal ShippingFee = 0,
    decimal ToteDeposit = 0,
    decimal TipAmount = 0
);
