namespace FoodDelivery.Application.DTOs.Order;

/// <summary>
/// DTO trả về cho endpoint tra cứu đơn hàng công khai (không yêu cầu đăng nhập).
/// Người dùng chỉ cần cung cấp OrderId + số điện thoại đặt hàng để xem trạng thái.
/// Đã che một phần địa chỉ giao hàng + số điện thoại để bảo mật.
/// </summary>
public record OrderTrackingItemDTO(
    int ProductId,
    string ProductName,
    int Quantity,
    decimal UnitPrice,
    decimal Subtotal
);

public record OrderTrackingDTO(
    int Id,
    DateTime OrderDate,
    string Status,
    decimal SubTotal,
    decimal DiscountAmount,
    decimal TotalAmount,
    string PaymentMethod,
    string CustomerName,
    string CustomerPhoneMasked,
    string ShippingAddressMasked,
    List<OrderTrackingItemDTO> Items
);
