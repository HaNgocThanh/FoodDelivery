using System.Security.Claims;
using FoodDelivery.Application.DTOs.Product;
using FoodDelivery.Application.DTOs.Review;
using FoodDelivery.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    /// <summary>
    /// Lấy danh sách tất cả sản phẩm (Public cho Khách hàng)
    /// GET /api/products?categoryId=1
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ProductResponseDTO>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllProducts([FromQuery] int? categoryId, CancellationToken ct)
    {
        var products = await _productService.GetAllProductsAsync(categoryId, ct);
        return Ok(products);
    }

    /// <summary>
    /// Lấy chi tiết sản phẩm theo ID (kèm danh sách Reviews)
    /// GET /api/products/{id}
    /// </summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ProductResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProductById(int id, CancellationToken ct)
    {
        var product = await _productService.GetProductByIdAsync(id, ct);
        if (product == null) return NotFound(new ProblemDetails
        {
            Status = 404,
            Title = "Không tìm thấy sản phẩm",
            Detail = $"Sản phẩm với ID {id} không tồn tại."
        });

        return Ok(product);
    }

    /// <summary>
    /// Thêm mới sản phẩm (Dành riêng cho Admin)
    /// POST /api/products
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ProductResponseDTO), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductDTO request, CancellationToken ct)
    {
        var result = await _productService.CreateProductAsync(request, ct);
        return CreatedAtAction(nameof(GetProductById), new { id = result.Id }, result);
    }

    /// <summary>
    /// Cập nhật thông tin sản phẩm (Dành riêng cho Admin)
    /// PUT /api/products/{id}
    /// </summary>
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ProductResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] UpdateProductDTO request, CancellationToken ct)
    {
        var result = await _productService.UpdateProductAsync(id, request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Nhập kho sản phẩm (Dành riêng cho Admin)
    /// PATCH /api/products/{id}/restock
    /// </summary>
    [HttpPatch("{id:int}/restock")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(ProductResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RestockProduct(int id, [FromBody] RestockProductDTO request, CancellationToken ct)
    {
        var result = await _productService.RestockAsync(id, request.Quantity, ct);
        return Ok(result);
    }

    /// <summary>
    /// Xóa sản phẩm và dọn ảnh trên Cloudinary (nếu có) — Dành riêng cho Admin.
    /// DELETE /api/products/{id}
    /// </summary>
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteProduct(int id, CancellationToken ct)
    {
        await _productService.DeleteProductAsync(id, ct);
        return NoContent();
    }

    /// <summary>
    /// Đánh giá sản phẩm (Dành cho Khách hàng đã mua sản phẩm này)
    /// POST /api/products/{id}/reviews
    /// </summary>
    [HttpPost("{id:int}/reviews")]
    [Authorize]
    [ProducesResponseType(typeof(ReviewResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateReview(int id, [FromBody] CreateReviewDTO request, CancellationToken ct)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new ProblemDetails
            {
                Status = 401,
                Title = "Chưa xác thực",
                Detail = "Vui lòng đăng nhập để gửi đánh giá sản phẩm."
            });
        }

        try
        {
            var review = await _productService.CreateReviewAsync(id, userId, request, ct);
            return Ok(review);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Status = 400,
                Title = "Không thể gửi đánh giá",
                Detail = ex.Message
            });
        }
    }

    /// <summary>
    /// Tìm kiếm sản phẩm nâng cao (Public - Khách hàng)
    /// GET /api/products/search?keyword=thịt&categoryId=1&minPrice=50000&maxPrice=500000
    /// </summary>
    [HttpGet("search")]
    [ProducesResponseType(typeof(IEnumerable<ProductResponseDTO>), StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchProducts(
        [FromQuery] string? keyword,
        [FromQuery] int? categoryId,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        CancellationToken ct)
    {
        var results = await _productService.SearchProductsAsync(keyword, categoryId, minPrice, maxPrice, ct);
        return Ok(results);
    }
}
