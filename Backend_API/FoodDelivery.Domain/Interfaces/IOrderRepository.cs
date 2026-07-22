using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Domain.Interfaces;

public interface IOrderRepository : IGenericRepository<Order>
{
    Task<bool> AssignShipperAsync(int orderId, int shipperId, CancellationToken ct = default);
    Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatus status, CancellationToken ct = default);
    Task<List<Order>> GetUserOrdersAsync(int userId, CancellationToken ct = default);
    Task<Order?> GetOrderWithDetailsAsync(int orderId, CancellationToken ct = default);

    /// <summary>
    /// Lấy danh sách đơn hàng Completed trong khoảng ngày để tính doanh thu.
    /// </summary>
    Task<List<Order>> GetCompletedOrdersInRangeAsync(DateTime startDate, DateTime endDate, CancellationToken ct = default);

    /// <summary>
    /// Lấy tất cả đơn hàng kèm trạng thái để thống kê.
    /// </summary>
    Task<List<Order>> GetAllOrdersForStatusStatsAsync(CancellationToken ct = default);

    Task<List<Order>> GetOrdersWithDetailsAsync(OrderStatus? status = null, CancellationToken ct = default);
}
