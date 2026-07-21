using FoodDelivery.Application.DTOs.Statistics;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Enums;
using FoodDelivery.Domain.Interfaces;

namespace FoodDelivery.Application.Services;

public class StatisticsService : IStatisticsService
{
    private readonly IUnitOfWork _unitOfWork;

    public StatisticsService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<RevenueStatsResponseDTO> GetRevenueStatsAsync(DateTime startDate, DateTime endDate, CancellationToken ct = default)
    {
        // Đảm bảo endDate bao phủ cuối ngày
        var endOfDay = endDate.Date.AddDays(1).AddTicks(-1);

        var completedOrders = await _unitOfWork.Orders.GetCompletedOrdersInRangeAsync(startDate.Date, endOfDay, ct);

        var totalRevenue = completedOrders.Sum(o => o.TotalAmount);
        var totalOrders = completedOrders.Count;

        // GROUP BY ngày
        var byDay = completedOrders
            .GroupBy(o => o.OrderDate.Date)
            .OrderBy(g => g.Key)
            .Select(g => new RevenueByDayDTO(
                g.Key.ToString("yyyy-MM-dd"),
                g.Sum(o => o.TotalAmount),
                g.Count()
            ))
            .ToList();

        return new RevenueStatsResponseDTO(totalRevenue, totalOrders, byDay);
    }

    public async Task<IEnumerable<OrderStatusStatDTO>> GetOrderStatusStatsAsync(CancellationToken ct = default)
    {
        var allOrders = await _unitOfWork.Orders.GetAllOrdersForStatusStatsAsync(ct);

        var statusLabels = new Dictionary<OrderStatus, string>
        {
            { OrderStatus.Pending,   "Chờ xử lý" },
            { OrderStatus.Approved,  "Đã duyệt" },
            { OrderStatus.Shipping,  "Đang giao" },
            { OrderStatus.Completed, "Hoàn thành" },
            { OrderStatus.Cancelled, "Đã hủy" },
        };

        var validStatuses = new HashSet<int>(Enum.GetValues<OrderStatus>().Select(s => (int)s));

        var result = allOrders
            .GroupBy(o => o.Status)
            .Where(g => validStatuses.Contains((int)g.Key))   // Bỏ qua giá trị enum không hợp lệ
            .Select(g => new OrderStatusStatDTO(
                statusLabels.TryGetValue(g.Key, out var label) ? label : g.Key.ToString(),
                g.Count()
            ))
            .OrderBy(s => s.Status)
            .ToList();

        return result;
    }
}
