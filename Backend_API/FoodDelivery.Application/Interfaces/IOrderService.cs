using FoodDelivery.Application.DTOs.Order;
using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Application.Interfaces;

public interface IOrderService
{
    Task<OrderResponseDTO> CreateOrderAsync(OrderRequestDTO request, CancellationToken ct = default);
    Task<bool> AssignShipperAsync(int orderId, int shipperId, CancellationToken ct = default);
    Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatus status, CancellationToken ct = default);
    Task<IEnumerable<OrderResponseDTO>> GetOrdersByStatusAsync(OrderStatus? status = null, CancellationToken ct = default);
    Task<IEnumerable<OrderResponseDTO>> GetUserOrdersAsync(int userId, CancellationToken ct = default);
    Task<bool> CancelUserOrderAsync(int orderId, int userId, CancellationToken ct = default);
}
