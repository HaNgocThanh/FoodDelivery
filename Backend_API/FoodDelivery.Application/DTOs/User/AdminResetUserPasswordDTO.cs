using System.ComponentModel.DataAnnotations;

namespace FoodDelivery.Application.DTOs.User;

/// <summary>
/// DTO nhận NewPassword từ Admin khi cưỡng chế reset mật khẩu người dùng.
/// UserId lấy từ Route param, không nằm trong DTO này.
/// </summary>
public class AdminResetUserPasswordDTO
{
    /// <summary>
    /// Mật khẩu mới (Admin đặt). Tối thiểu 6 ký tự.
    /// </summary>
    [Required(ErrorMessage = "Vui lòng nhập mật khẩu mới.")]
    [MinLength(6, ErrorMessage = "Mật khẩu phải có ít nhất 6 ký tự.")]
    [MaxLength(100, ErrorMessage = "Mật khẩu không được vượt quá 100 ký tự.")]
    public string NewPassword { get; set; } = string.Empty;
}