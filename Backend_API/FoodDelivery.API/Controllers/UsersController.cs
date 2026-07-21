using System.Security.Claims;
using FoodDelivery.Application.DTOs.User;
using FoodDelivery.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    /// <summary>
    /// Lấy thông tin cá nhân của người dùng đang đăng nhập (kèm Điểm tích lũy & Hạng thẻ)
    /// GET /api/users/profile
    /// </summary>
    [HttpGet("profile")]
    [Authorize]
    [ProducesResponseType(typeof(UserProfileResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfile(CancellationToken ct)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new ProblemDetails
            {
                Status = 401,
                Title = "Chưa xác thực",
                Detail = "Vui lòng đăng nhập lại để xem thông tin cá nhân."
            });
        }

        var profile = await _userService.GetUserProfileAsync(userId, ct);
        return Ok(profile);
    }

    /// <summary>
    /// Lấy danh sách toàn bộ người dùng / khách hàng (Phân trang dành cho Admin)
    /// GET /api/users?page=1&pageSize=10
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(UserPaginatedResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var users = await _userService.GetPaginatedUsersAsync(page, pageSize, ct);
        return Ok(users);
    }
}
