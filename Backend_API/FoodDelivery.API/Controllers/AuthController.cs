using FoodDelivery.Application.DTOs.Auth;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEmailService _emailService;

    public AuthController(IAuthService authService, IUnitOfWork unitOfWork, IEmailService emailService)
    {
        _authService = authService;
        _unitOfWork = unitOfWork;
        _emailService = emailService;
    }

    /// <summary>
    /// Đăng nhập tài khoản
    /// POST /api/auth/login
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Login([FromBody] LoginRequestDTO request, CancellationToken ct)
    {
        var result = await _authService.LoginAsync(request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Đăng ký tài khoản mới
    /// POST /api/auth/register
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDTO request, CancellationToken ct)
    {
        var result = await _authService.RegisterAsync(request, ct);
        return Ok(result);
    }

    public record ForgotPasswordRequestDTO(string Email);
    public record ResetPasswordRequestDTO(string Email, string Otp, string NewPassword);

    /// <summary>
    /// Yêu cầu gửi OTP khôi phục mật khẩu qua Email
    /// POST /api/auth/forgot-password
    /// </summary>
    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDTO request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Dữ liệu thiếu", Detail = "Vui lòng cung cấp Email." });
        }

        var normalizedEmail = request.Email.Trim().ToLower();
        var users = await _unitOfWork.Users.FindAsync(u => u.Email.ToLower() == normalizedEmail, ct);
        var user = users.FirstOrDefault();

        if (user == null)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = "Không tìm thấy tài khoản", Detail = "Email không tồn tại trong hệ thống." });
        }

        // Sinh OTP 6 số ngẫu nhiên
        var otp = new Random().Next(100000, 999999).ToString();
        user.ResetPasswordToken = otp;
        user.ResetPasswordExpiry = DateTime.UtcNow.AddMinutes(15);

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(ct);

        // Gửi email thực qua SMTP
        var subject = "Mã OTP đặt lại mật khẩu - FoodDelivery";
        var body = $@"
            <div style='font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; border: 1px solid #e5e7eb; border-radius: 16px;'>
                <h2 style='color: #f97316; margin-bottom: 5px;'>FoodDelivery</h2>
                <p style='font-size: 14px;'>Xin chào <strong>{user.FullName}</strong>,</p>
                <p style='font-size: 14px;'>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản tại FoodDelivery.</p>
                <p style='font-size: 14px; margin-bottom: 20px;'>Mã xác thực OTP của bạn là:</p>
                <div style='background-color: #f3f4f6; padding: 15px; border-radius: 12px; font-size: 24px; font-weight: bold; font-family: monospace; letter-spacing: 4px; display: inline-block; color: #1f2937;'>
                    {otp}
                </div>
                <p style='color: #ef4444; font-size: 12px; margin-top: 15px;'>Mã OTP này có thời hạn sử dụng trong 15 phút.</p>
                <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;' />
                <p style='font-size: 11px; color: #6b7280;'>Nếu bạn không thực hiện yêu cầu này, bạn có thể yên tâm bỏ qua email này.</p>
            </div>";

        await _emailService.SendEmailAsync(user.Email, subject, body);

        return Ok(new { message = "Mã xác thực OTP đã được gửi tới email của bạn." });
    }

    /// <summary>
    /// Đặt lại mật khẩu bằng mã OTP
    /// POST /api/auth/reset-password
    /// </summary>
    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDTO request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp) || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Dữ liệu thiếu", Detail = "Vui lòng nhập đầy đủ Email, mã OTP và Mật khẩu mới." });
        }

        var normalizedEmail = request.Email.Trim().ToLower();
        var users = await _unitOfWork.Users.FindAsync(u => u.Email.ToLower() == normalizedEmail, ct);
        var user = users.FirstOrDefault();

        if (user == null)
        {
            return NotFound(new ProblemDetails { Status = 404, Title = "Không tìm thấy tài khoản", Detail = "Email không tồn tại trong hệ thống." });
        }

        if (user.ResetPasswordToken != request.Otp || !user.ResetPasswordExpiry.HasValue || user.ResetPasswordExpiry.Value < DateTime.UtcNow)
        {
            return BadRequest(new ProblemDetails { Status = 400, Title = "Xác thực thất bại", Detail = "Mã OTP không chính xác hoặc đã hết hạn." });
        }

        // Đổi mật khẩu mới
        user.PasswordHash = FoodDelivery.Infrastructure.Services.AuthService.HashPassword(request.NewPassword);
        user.ResetPasswordToken = null;
        user.ResetPasswordExpiry = null;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(ct);

        return Ok(new { message = "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại." });
    }
}
