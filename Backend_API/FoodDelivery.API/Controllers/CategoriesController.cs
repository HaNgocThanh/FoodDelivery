using FoodDelivery.Application.DTOs.Category;
using FoodDelivery.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    /// <summary>
    /// Lấy danh sách tất cả danh mục sản phẩm
    /// GET /api/categories
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<CategoryResponseDTO>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllCategories(CancellationToken ct)
    {
        var categories = await _categoryService.GetAllCategoriesAsync(ct);
        return Ok(categories);
    }
}
