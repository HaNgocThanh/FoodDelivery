using FoodDelivery.Application.DTOs.Product;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Exceptions;
using FoodDelivery.Domain.Interfaces;

namespace FoodDelivery.Application.Services;

public class ProductService : IProductService
{
    private readonly IUnitOfWork _unitOfWork;

    public ProductService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<ProductResponseDTO>> GetAllProductsAsync(int? categoryId = null, CancellationToken ct = default)
    {
        var allCategories = await _unitOfWork.Categories.GetAllAsync(ct);
        var categoryMap = allCategories.ToDictionary(c => c.Id, c => c.Name);

        var products = categoryId.HasValue && categoryId.Value > 0
            ? await _unitOfWork.Products.FindAsync(p => p.CategoryId == categoryId.Value, ct)
            : await _unitOfWork.Products.GetAllAsync(ct);

        return products.Select(p => MapToDTO(p, categoryMap.TryGetValue(p.CategoryId, out var name) ? name : null));
    }

    public async Task<ProductResponseDTO?> GetProductByIdAsync(int id, CancellationToken ct = default)
    {
        var product = await _unitOfWork.Products.GetByIdAsync(id, ct);
        if (product == null) return null;

        var category = await _unitOfWork.Categories.GetByIdAsync(product.CategoryId, ct);
        return MapToDTO(product, category?.Name);
    }

    public async Task<ProductResponseDTO> CreateProductAsync(CreateProductDTO dto, CancellationToken ct = default)
    {
        if (dto.Price <= 0) throw new ArgumentException("Giá sản phẩm phải lớn hơn 0.");
        if (dto.StockQuantity < 0) throw new ArgumentException("Số lượng tồn kho không được âm.");

        var category = await _unitOfWork.Categories.GetByIdAsync(dto.CategoryId, ct);

        var product = new Product
        {
            CategoryId = dto.CategoryId,
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            StockQuantity = dto.StockQuantity,
            Origin = dto.Origin,
            IsHot = dto.IsHot,
            IsAvailable = dto.StockQuantity > 0
        };

        await _unitOfWork.Products.AddAsync(product, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return MapToDTO(product, category?.Name);
    }

    public async Task<ProductResponseDTO> UpdateProductAsync(int id, UpdateProductDTO dto, CancellationToken ct = default)
    {
        var product = await _unitOfWork.Products.GetByIdAsync(id, ct);
        if (product == null)
        {
            throw new NotFoundException($"Sản phẩm với ID {id} không tồn tại.");
        }

        if (dto.Price <= 0) throw new ArgumentException("Giá sản phẩm phải lớn hơn 0.");

        var category = await _unitOfWork.Categories.GetByIdAsync(product.CategoryId, ct);

        product.Name = dto.Name;
        product.Description = dto.Description;
        product.Price = dto.Price;
        product.Origin = dto.Origin;
        product.IsHot = dto.IsHot;
        product.IsAvailable = dto.IsAvailable;

        _unitOfWork.Products.Update(product);
        await _unitOfWork.SaveChangesAsync(ct);

        return MapToDTO(product, category?.Name);
    }

    public async Task<ProductResponseDTO> RestockAsync(int productId, int additionalQuantity, CancellationToken ct = default)
    {
        if (additionalQuantity <= 0)
        {
            throw new ArgumentException("Số lượng nhập kho phải lớn hơn 0.");
        }

        var product = await _unitOfWork.Products.GetByIdAsync(productId, ct);
        if (product == null)
        {
            throw new NotFoundException($"Sản phẩm với ID {productId} không tồn tại.");
        }

        var category = await _unitOfWork.Categories.GetByIdAsync(product.CategoryId, ct);

        product.StockQuantity += additionalQuantity;
        if (product.StockQuantity > 0)
        {
            product.IsAvailable = true;
        }

        _unitOfWork.Products.Update(product);
        await _unitOfWork.SaveChangesAsync(ct);

        return MapToDTO(product, category?.Name);
    }

    private static ProductResponseDTO MapToDTO(Product p, string? categoryName = null) => new(
        p.Id,
        p.CategoryId,
        categoryName,
        p.Name,
        p.Description,
        p.Price,
        p.StockQuantity,
        p.Origin,
        p.IsHot,
        p.IsAvailable
    );
}
