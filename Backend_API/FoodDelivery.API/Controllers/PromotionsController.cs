using FoodDelivery.Application.DTOs.Promotion;
using FoodDelivery.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PromotionsController : ControllerBase
{
    private readonly IPromotionService _promotionService;

    public PromotionsController(IPromotionService promotionService)
    {
        _promotionService = promotionService;
    }

    /// <summary>
    /// Lấy danh sách tất cả mã khuyến mãi (Dành riêng cho Admin)
    /// GET /api/promotions
    /// </summary>
    [HttpGet]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(IEnumerable<PromotionResponseDTO>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllPromotions(CancellationToken ct)
    {
        var promotions = await _promotionService.GetAllPromotionsAsync(ct);
        return Ok(promotions);
    }

    /// <summary>
    /// Tạo mã khuyến mãi mới (Dành riêng cho Admin)
    /// POST /api/promotions
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(PromotionResponseDTO), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePromotion([FromBody] CreatePromotionDTO request, CancellationToken ct)
    {
        var result = await _promotionService.CreatePromotionAsync(request, ct);
        return CreatedAtAction(nameof(GetAllPromotions), new { id = result.Id }, result);
    }

    /// <summary>
    /// Kiểm tra tính hợp lệ của Mã khuyến mãi (Public cho Khách hàng khi Checkout)
    /// POST /api/promotions/validate
    /// </summary>
    [HttpPost("validate")]
    [ProducesResponseType(typeof(ValidatePromotionResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ValidatePromotion([FromBody] ValidatePromotionRequestDTO request, CancellationToken ct)
    {
        var result = await _promotionService.ValidatePromotionAsync(request.Code, ct);
        return Ok(result);
    }
}
