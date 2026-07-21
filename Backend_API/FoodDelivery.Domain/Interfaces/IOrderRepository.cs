using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Domain.Interfaces;

public interface IOrderRepository : IGenericRepository<Order>
{
    Task<bool> AssignShipperAsync(int orderId, int shipperId, CancellationToken ct = default);
    Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatus status, CancellationToken ct = default);
}
