namespace FoodDelivery.Application.DTOs.Statistics;

public record RevenueStatsResponseDTO(
    decimal TotalRevenue,
    int TotalOrders,
    IEnumerable<RevenueByDayDTO> ByDay
);
