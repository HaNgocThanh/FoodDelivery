using FoodDelivery.Application.DTOs.Product;

namespace FoodDelivery.Application.Interfaces;

public interface IProductService
{
    Task<IEnumerable<ProductResponseDTO>> GetAllProductsAsync(int? categoryId = null, CancellationToken ct = default);
    Task<ProductResponseDTO?> GetProductByIdAsync(int id, CancellationToken ct = default);
    Task<ProductResponseDTO> CreateProductAsync(CreateProductDTO dto, CancellationToken ct = default);
    Task<ProductResponseDTO> UpdateProductAsync(int id, UpdateProductDTO dto, CancellationToken ct = default);
    Task<ProductResponseDTO> RestockAsync(int productId, int additionalQuantity, CancellationToken ct = default);
}
