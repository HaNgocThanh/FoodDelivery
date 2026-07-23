using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using FoodDelivery.Application.DTOs.Support;
using FoodDelivery.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TicketsController : ControllerBase
{
    private readonly ISupportService _supportService;

    public TicketsController(ISupportService supportService)
    {
        _supportService = supportService;
    }

    /// <summary>
    /// Gửi một yêu cầu khiếu nại/hỗ trợ mới (Khách hàng)
    /// POST /api/tickets
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(TicketResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateTicket([FromBody] CreateTicketDTO request, CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new ProblemDetails { Status = 401, Title = "Chưa xác thực", Detail = "Vui lòng đăng nhập để gửi yêu cầu hỗ trợ." });
        }

        var result = await _supportService.CreateTicketAsync(userId, request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Trả lời yêu cầu hỗ trợ và đóng/giải quyết ticket (Admin)
    /// PUT /api/tickets/{id}/reply
    /// </summary>
    [HttpPut("{id:int}/reply")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(TicketResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReplyTicket(int id, [FromBody] ReplyTicketDTO request, CancellationToken ct)
    {
        var result = await _supportService.ReplyTicketAsync(id, request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách ticket của cá nhân khách hàng đang đăng nhập
    /// GET /api/tickets/my-tickets
    /// </summary>
    [HttpGet("my-tickets")]
    [Authorize]
    [ProducesResponseType(typeof(IEnumerable<TicketResponseDTO>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyTickets(CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new ProblemDetails { Status = 401, Title = "Chưa xác thực", Detail = "Vui lòng đăng nhập để xem lịch sử hỗ trợ." });
        }

        var result = await _supportService.GetUserTicketsAsync(userId, ct);
        return Ok(result);
    }

    /// <summary>
    /// Lấy danh sách ticket đang mở (Dành cho Admin)
    /// GET /api/tickets/open
    /// </summary>
    [HttpGet("open")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IEnumerable<TicketResponseDTO>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetOpenTickets(CancellationToken ct)
    {
        var result = await _supportService.GetOpenTicketsAsync(ct);
        return Ok(result);
    }
}
