using FoodDelivery.Application.DTOs.Product;
using FoodDelivery.Application.Interfaces;
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
    /// Lấy danh sách tất cả sản phẩm (Có hỗ trợ lọc theo categoryId)
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
    /// Lấy chi tiết sản phẩm theo ID
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
    /// Thêm mới sản phẩm
    /// POST /api/products
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ProductResponseDTO), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductDTO request, CancellationToken ct)
    {
        var result = await _productService.CreateProductAsync(request, ct);
        return CreatedAtAction(nameof(GetProductById), new { id = result.Id }, result);
    }

    /// <summary>
    /// Cập nhật thông tin sản phẩm
    /// PUT /api/products/{id}
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(ProductResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] UpdateProductDTO request, CancellationToken ct)
    {
        var result = await _productService.UpdateProductAsync(id, request, ct);
        return Ok(result);
    }

    /// <summary>
    /// Nhập kho sản phẩm (Cộng dồn số lượng tồn kho)
    /// PATCH /api/products/{id}/restock
    /// </summary>
    [HttpPatch("{id:int}/restock")]
    [ProducesResponseType(typeof(ProductResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RestockProduct(int id, [FromBody] RestockProductDTO request, CancellationToken ct)
    {
        var result = await _productService.RestockAsync(id, request.Quantity, ct);
        return Ok(result);
    }
}
