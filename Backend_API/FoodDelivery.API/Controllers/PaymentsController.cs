using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using FoodDelivery.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

public record MockPaymentRequestDTO(int OrderId);
public record MockPaymentResponseDTO(string PayUrl);
public record ConfirmMockPaymentDTO(int OrderId, string PaymentToken);
public record MockPaymentTicket(int OrderId, int UserId, decimal Amount, DateTimeOffset ExpiresAt);

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IOrderService _orders;
    private readonly IWebHostEnvironment _environment;
    private readonly IDataProtector _protector;
    private readonly IConfiguration _configuration;

    public PaymentsController(IOrderService orders, IWebHostEnvironment environment,
        IDataProtectionProvider protection, IConfiguration configuration)
    {
        _orders = orders;
        _environment = environment;
        _protector = protection.CreateProtector("FoodDelivery.MockPayment.v1");
        _configuration = configuration;
    }

    [HttpGet("methods")]
    [AllowAnonymous]
    public IActionResult GetMethods() => Ok(new { mockOnline = _environment.IsDevelopment() });

    [HttpPost("mock-url")]
    public async Task<IActionResult> GetMockPaymentUrl([FromBody] MockPaymentRequestDTO request, CancellationToken ct)
    {
        if (!_environment.IsDevelopment()) return NotFound();
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        var amount = await _orders.GetPaymentAmountAsync(request.OrderId, userId, ct);
        var ticket = new MockPaymentTicket(request.OrderId, userId, amount, DateTimeOffset.UtcNow.AddMinutes(15));
        var token = _protector.Protect(JsonSerializer.Serialize(ticket));
        var frontend = (_configuration["FrontendUrl"] ?? "http://localhost:5173").TrimEnd('/');
        var payUrl = $"{frontend}/payment-result?orderId={request.OrderId}&vnp_ResponseCode=00&paymentToken={Uri.EscapeDataString(token)}";
        return Ok(new MockPaymentResponseDTO(payUrl));
    }

    [HttpPost("mock-confirm")]
    public async Task<IActionResult> ConfirmMockPayment([FromBody] ConfirmMockPaymentDTO request, CancellationToken ct)
    {
        if (!_environment.IsDevelopment()) return NotFound();
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return Unauthorized();
        MockPaymentTicket? ticket;
        try
        {
            ticket = JsonSerializer.Deserialize<MockPaymentTicket>(_protector.Unprotect(request.PaymentToken));
        }
        catch (Exception ex) when (ex is CryptographicException or JsonException or ArgumentException)
        {
            return BadRequest(new ProblemDetails { Status = 400, Detail = "Kết quả thanh toán không hợp lệ." });
        }
        if (ticket == null || ticket.OrderId != request.OrderId || ticket.UserId != userId || ticket.ExpiresAt <= DateTimeOffset.UtcNow)
            return BadRequest(new ProblemDetails { Status = 400, Detail = "Kết quả thanh toán đã hết hạn hoặc không thuộc tài khoản hiện tại." });
        await _orders.ConfirmMockPaymentAsync(ticket.OrderId, userId, ticket.Amount, ct);
        return Ok(new { orderId = ticket.OrderId, amount = ticket.Amount });
    }
}
