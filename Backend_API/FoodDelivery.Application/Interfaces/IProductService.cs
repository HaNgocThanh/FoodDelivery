using FoodDelivery.Application.DTOs.Product;
using FoodDelivery.Application.DTOs.Review;

namespace FoodDelivery.Application.Interfaces;

public interface IProductService
{
    Task<IEnumerable<ProductResponseDTO>> GetAllProductsAsync(int? categoryId = null, CancellationToken ct = default);
    Task<ProductResponseDTO?> GetProductByIdAsync(int id, CancellationToken ct = default);
    Task<ProductResponseDTO> CreateProductAsync(CreateProductDTO dto, CancellationToken ct = default);
    Task<ProductResponseDTO> UpdateProductAsync(int id, UpdateProductDTO dto, CancellationToken ct = default);
    Task<ProductResponseDTO> RestockAsync(int productId, int additionalQuantity, CancellationToken ct = default);
    Task<ReviewResponseDTO> CreateReviewAsync(int productId, int userId, CreateReviewDTO dto, CancellationToken ct = default);

    /// <summary>
    /// Tìm kiếm nâng cao theo keyword, danh mục, khoảng giá.
    /// </summary>
    Task<IEnumerable<ProductResponseDTO>> SearchProductsAsync(
        string? keyword, int? categoryId, decimal? minPrice, decimal? maxPrice,
        CancellationToken ct = default);
}

