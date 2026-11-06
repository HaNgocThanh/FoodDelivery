using FoodDelivery.Application.DTOs.Order;
using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Application.Interfaces;

public interface IOrderService
{
    Task<OrderResponseDTO> CreateOrderAsync(OrderRequestDTO request, CancellationToken ct = default,
        Guid? idempotencyKey = null, bool onlineEnabled = false);
    Task<IReadOnlyList<int>> GetExpiredPaymentOrdersAsync(CancellationToken ct);
    Task<bool> ExpirePendingPaymentAsync(int orderId, CancellationToken ct);
    Task<decimal> GetPaymentAmountAsync(int orderId, int userId, CancellationToken ct = default);
    Task ConfirmMockPaymentAsync(int orderId, int userId, decimal amount, CancellationToken ct = default);
    Task<bool> AssignShipperAsync(int orderId, int shipperId, CancellationToken ct = default);
    Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatus status, CancellationToken ct = default);
    Task<IEnumerable<OrderResponseDTO>> GetOrdersByStatusAsync(OrderStatus? status = null, CancellationToken ct = default);
    Task<OrderResponseDTO> GetOrderByIdAsync(int orderId, int? ownerId, CancellationToken ct = default);
    Task<IEnumerable<OrderResponseDTO>> GetUserOrdersAsync(int userId, CancellationToken ct = default);
    Task<bool> CancelUserOrderAsync(int orderId, int userId, CancellationToken ct = default);
    Task<OrderTrackingDTO?> TrackOrderAsync(int orderId, string phone, CancellationToken ct = default);
}
