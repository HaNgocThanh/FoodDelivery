using System.ComponentModel.DataAnnotations;
using FoodDelivery.API.Auth;
using FoodDelivery.Application.DTOs.Auth;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FoodDelivery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public class AuthController(
    IAuthService authService,
    PasswordRecoveryQueue recoveryQueue,
    PasswordRecoveryService recoveryService) : ControllerBase
{
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDTO request, CancellationToken ct) =>
        Ok(await authService.LoginAsync(request, ct));

    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDTO request, CancellationToken ct) =>
        Ok(await authService.RegisterAsync(request, ct));

    public record ForgotPasswordRequestDTO(
        [Required, EmailAddress, MaxLength(100)] string Email);

    public record ResetPasswordRequestDTO(
        [Required, EmailAddress, MaxLength(100)] string Email,
        [Required, RegularExpression("^[0-9]{6}$")] string Otp,
        [Required, StringLength(100, MinimumLength = 6)] string NewPassword);

    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public IActionResult ForgotPassword([FromBody] ForgotPasswordRequestDTO request)
    {
        if (!recoveryQueue.TryEnqueue(request.Email.Trim().ToLowerInvariant()))
            return Problem(statusCode: 503, detail: "Hệ thống đang bận. Vui lòng thử lại sau.");

        return Ok(new { message = "Nếu email đã đăng ký, bạn sẽ nhận được mã xác thực." });
    }

    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDTO request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword))
            return Problem(statusCode: 400, detail: "Vui lòng nhập mật khẩu mới.");

        var address = request.Email.Trim().ToLowerInvariant();
        if (!await recoveryService.ResetAsync(address, request.Otp, request.NewPassword, ct))
            return Problem(statusCode: 400, detail: "Mã OTP không hợp lệ hoặc đã hết hạn. Hãy yêu cầu mã mới nếu cần.");

        return Ok(new { message = "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." });
    }
}
