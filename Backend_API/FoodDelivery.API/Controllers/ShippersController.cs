using FoodDelivery.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class ShippersController : ControllerBase
{
    private readonly AppDbContext _context;

    public ShippersController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Lấy danh sách tất cả nhân viên giao hàng (Shippers)
    /// GET /api/shippers
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetShippers(CancellationToken ct)
    {
        var shippers = await _context.AppUsers
            .AsNoTracking()
            .Where(u => u.Role == "Shipper")
            .OrderBy(u => u.FullName).ThenBy(u => u.Id)
            .Select(u => new { u.Id, u.FullName })
            .ToListAsync(ct);

        return Ok(shippers);
    }
}
