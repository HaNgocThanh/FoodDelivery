using FoodDelivery.Application.DTOs.Statistics;
using FoodDelivery.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

/// <summary>
/// API Thống kê dành cho Admin
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class StatisticsController : ControllerBase
{
    private readonly IStatisticsService _statisticsService;

    public StatisticsController(IStatisticsService statisticsService)
    {
        _statisticsService = statisticsService;
    }

    /// <summary>
    /// Thống kê doanh thu theo khoảng ngày (chỉ tính đơn Completed).
    /// GET /api/statistics/revenue?startDate=2026-01-01&amp;endDate=2026-12-31
    /// </summary>
    [HttpGet("revenue")]
    [ProducesResponseType(typeof(RevenueStatsResponseDTO), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRevenue(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        CancellationToken ct)
    {
        if (startDate > endDate)
        {
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Ngày không hợp lệ",
                Detail = "startDate phải nhỏ hơn hoặc bằng endDate."
            });
        }

        var result = await _statisticsService.GetRevenueStatsAsync(startDate, endDate, ct);
        return Ok(result);
    }

    /// <summary>
    /// Thống kê số lượng đơn hàng theo trạng thái (dành cho PieChart).
    /// GET /api/statistics/order-status
    /// </summary>
    [HttpGet("order-status")]
    [ProducesResponseType(typeof(IEnumerable<OrderStatusStatDTO>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrderStatusStats(CancellationToken ct)
    {
        var result = await _statisticsService.GetOrderStatusStatsAsync(ct);
        return Ok(result);
    }
}
