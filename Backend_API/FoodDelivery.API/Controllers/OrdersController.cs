using System.Security.Claims;
using FoodDelivery.Application.DTOs.Order;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Enums;
using FoodDelivery.Domain.Exceptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
    }

    /// <summary>
    /// Lấy danh sách tất cả đơn hàng (Admin chỉ định)
    /// GET /api/orders
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IEnumerable<OrderResponseDTO>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrders([FromQuery] OrderStatus? status, CancellationToken ct)
    {
        var orders = await _orderService.GetOrdersByStatusAsync(status, ct);
        return Ok(orders);
    }

    /// <summary>
    /// Lấy danh sách đơn hàng của chính User đang đăng nhập
    /// GET /api/orders/my-orders
    /// </summary>
    [HttpGet("my-orders")]
    [Authorize]
    [ProducesResponseType(typeof(IEnumerable<OrderResponseDTO>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetMyOrders(CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new ProblemDetails
            {
                Status = 401,
                Title = "Chưa xác thực",
                Detail = "Vui lòng đăng nhập để xem lịch sử đơn hàng."
            });
        }

        var orders = await _orderService.GetUserOrdersAsync(userId, ct);
        return Ok(orders);
    }

    /// <summary>
    /// Khách hàng tự hủy đơn hàng của mình (Chỉ khi ở trạng thái Pending)
    /// PUT /api/orders/my-orders/{id}/cancel
    /// </summary>
    [HttpPut("my-orders/{id:int}/cancel")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelMyOrder(int id, CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new ProblemDetails
            {
                Status = 401,
                Title = "Chưa xác thực",
                Detail = "Vui lòng đăng nhập để thực hiện hủy đơn hàng."
            });
        }

        try
        {
            await _orderService.CancelUserOrderAsync(id, userId, ct);
            return Ok(new { message = $"Hủy đơn hàng #{id} thành công! Số lượng sản phẩm đã được hoàn trả vào kho." });
        }
        catch (NotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Status = 404,
                Title = "Không tìm thấy đơn hàng",
                Detail = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Không thể hủy đơn hàng",
                Detail = ex.Message
            });
        }
    }

    /// <summary>
    /// Tạo mới đơn hàng (Yêu cầu đăng nhập, tự động lấy UserId từ JWT Claim)
    /// POST /api/orders
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(OrderResponseDTO), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CreateOrder([FromBody] OrderRequestDTO request, CancellationToken ct)
    {
        // Tự động lấy UserId từ JWT Token Claims nếu người dùng không truyền hoặc truyền <= 0
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var effectiveUserId = request.UserId;

        if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out var parsedUserId))
        {
            effectiveUserId = parsedUserId;
        }

        var effectiveRequest = request with { UserId = effectiveUserId };
        var result = await _orderService.CreateOrderAsync(effectiveRequest, ct);
        return CreatedAtAction(nameof(GetOrderById), new { id = result.Id }, result);
    }

    /// <summary>
    /// Lấy chi tiết đơn hàng theo ID
    /// GET /api/orders/{id}
    /// </summary>
    [HttpGet("{id:int}")]
    [Authorize]
    [ProducesResponseType(typeof(OrderResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetOrderById(int id)
    {
        return Ok();
    }

    /// <summary>
    /// Phân công nhân viên giao hàng (Dành riêng cho Admin)
    /// PUT /api/orders/{id}/assign-shipper
    /// </summary>
    [HttpPut("{id:int}/assign-shipper")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignShipper(int id, [FromBody] AssignShipperDTO request, CancellationToken ct)
    {
        await _orderService.AssignShipperAsync(id, request.ShipperId, ct);
        return Ok(new { message = $"Đã gán thành công Shipper #{request.ShipperId} cho Đơn hàng #{id}." });
    }

    /// <summary>
    /// Cập nhật trạng thái đơn hàng (Dành riêng cho Admin)
    /// PUT /api/orders/{id}/status
    /// </summary>
    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDTO request, CancellationToken ct)
    {
        await _orderService.UpdateOrderStatusAsync(id, request.Status, ct);
        return Ok(new { message = $"Đã cập nhật đơn hàng #{id} sang trạng thái {request.Status}." });
    }
}
