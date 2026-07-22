using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

public record MockPaymentRequestDTO(int OrderId, decimal Amount);
public record MockPaymentResponseDTO(string PayUrl);

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    /// <summary>
    /// Giả lập tạo URL thanh toán trực tuyến (VNPay Mock)
    /// POST /api/payments/mock-url
    /// </summary>
    [HttpPost("mock-url")]
    [ProducesResponseType(typeof(MockPaymentResponseDTO), StatusCodes.Status200OK)]
    public IActionResult GetMockPaymentUrl([FromBody] MockPaymentRequestDTO request)
    {
        // Giả lập trả về VNPay response code thành công (00)
        // Ghép đường dẫn tới Front-end local
        var payUrl = $"http://localhost:5173/payment-result?orderId={request.OrderId}&vnp_ResponseCode=00";
        return Ok(new MockPaymentResponseDTO(payUrl));
    }
}
