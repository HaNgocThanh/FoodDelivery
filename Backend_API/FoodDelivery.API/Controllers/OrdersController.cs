using FoodDelivery.Application.DTOs.Order;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Enums;
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
    /// Lấy danh sách tất cả đơn hàng (hoặc lọc theo trạng thái)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<OrderResponseDTO>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrders([FromQuery] OrderStatus? status, CancellationToken ct)
    {
        var orders = await _orderService.GetOrdersByStatusAsync(status, ct);
        return Ok(orders);
    }

    /// <summary>
    /// Tạo mới đơn hàng (Create Order)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(OrderResponseDTO), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> CreateOrder([FromBody] OrderRequestDTO request, CancellationToken ct)
    {
        var result = await _orderService.CreateOrderAsync(request, ct);
        return CreatedAtAction(nameof(GetOrderById), new { id = result.Id }, result);
    }

    /// <summary>
    /// Lấy chi tiết đơn hàng theo ID
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(OrderResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public IActionResult GetOrderById(int id)
    {
        return Ok();
    }

    /// <summary>
    /// Phân công nhân viên giao hàng (Shipper) cho đơn hàng
    /// PUT /api/orders/{id}/assign-shipper
    /// </summary>
    [HttpPut("{id:int}/assign-shipper")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignShipper(int id, [FromBody] AssignShipperDTO request, CancellationToken ct)
    {
        await _orderService.AssignShipperAsync(id, request.ShipperId, ct);
        return Ok(new { message = $"Đã gán thành công Shipper #{request.ShipperId} cho Đơn hàng #{id}." });
    }

    /// <summary>
    /// Cập nhật trạng thái đơn hàng (Pending -> Approved -> Shipping -> Completed -> Cancelled)
    /// PUT /api/orders/{id}/status
    /// </summary>
    [HttpPut("{id:int}/status")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusDTO request, CancellationToken ct)
    {
        await _orderService.UpdateOrderStatusAsync(id, request.Status, ct);
        return Ok(new { message = $"Đã cập nhật đơn hàng #{id} sang trạng thái {request.Status}." });
    }
}
