using FoodDelivery.Application.DTOs.Statistics;

namespace FoodDelivery.Application.Interfaces;

public interface IStatisticsService
{
    /// <summary>
    /// Lấy thống kê doanh thu theo khoảng ngày (chỉ tính đơn Completed).
    /// </summary>
    Task<RevenueStatsResponseDTO> GetRevenueStatsAsync(DateTime startDate, DateTime endDate, CancellationToken ct = default);

    /// <summary>
    /// Lấy số lượng đơn hàng theo từng trạng thái để vẽ biểu đồ tròn.
    /// </summary>
    Task<IEnumerable<OrderStatusStatDTO>> GetOrderStatusStatsAsync(CancellationToken ct = default);
}
