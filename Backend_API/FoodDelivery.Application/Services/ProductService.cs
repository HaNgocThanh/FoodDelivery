using FoodDelivery.Application.DTOs.Product;
using FoodDelivery.Application.DTOs.Review;
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

        var result = new List<ProductResponseDTO>();
        foreach (var p in products)
        {
            var reviews = await _unitOfWork.Reviews.GetProductReviewsAsync(p.Id, ct);
            var avgRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0;
            var reviewDtos = reviews.Select(r => new ReviewResponseDTO(
                r.Id,
                r.UserId,
                r.User?.FullName ?? "Khách hàng",
                r.Rating,
                r.Comment,
                r.CreatedAt
            ));

            result.Add(new ProductResponseDTO(
                p.Id,
                p.CategoryId,
                categoryMap.TryGetValue(p.CategoryId, out var name) ? name : null,
                p.Name,
                p.Description,
                p.Price,
                p.StockQuantity,
                p.Origin,
                p.IsHot,
                p.IsAvailable,
                avgRating,
                reviewDtos
            ));
        }

        return result;
    }

    public async Task<ProductResponseDTO?> GetProductByIdAsync(int id, CancellationToken ct = default)
    {
        var product = await _unitOfWork.Products.GetByIdAsync(id, ct);
        if (product == null) return null;

        var category = await _unitOfWork.Categories.GetByIdAsync(product.CategoryId, ct);
        var reviews = await _unitOfWork.Reviews.GetProductReviewsAsync(id, ct);
        var avgRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0;
        var reviewDtos = reviews.Select(r => new ReviewResponseDTO(
            r.Id,
            r.UserId,
            r.User?.FullName ?? "Khách hàng",
            r.Rating,
            r.Comment,
            r.CreatedAt
        ));

        return new ProductResponseDTO(
            product.Id,
            product.CategoryId,
            category?.Name,
            product.Name,
            product.Description,
            product.Price,
            product.StockQuantity,
            product.Origin,
            product.IsHot,
            product.IsAvailable,
            avgRating,
            reviewDtos
        );
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

        return new ProductResponseDTO(
            product.Id,
            product.CategoryId,
            category?.Name,
            product.Name,
            product.Description,
            product.Price,
            product.StockQuantity,
            product.Origin,
            product.IsHot,
            product.IsAvailable,
            0,
            Enumerable.Empty<ReviewResponseDTO>()
        );
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

        var reviews = await _unitOfWork.Reviews.GetProductReviewsAsync(id, ct);
        var avgRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0;
        var reviewDtos = reviews.Select(r => new ReviewResponseDTO(
            r.Id,
            r.UserId,
            r.User?.FullName ?? "Khách hàng",
            r.Rating,
            r.Comment,
            r.CreatedAt
        ));

        return new ProductResponseDTO(
            product.Id,
            product.CategoryId,
            category?.Name,
            product.Name,
            product.Description,
            product.Price,
            product.StockQuantity,
            product.Origin,
            product.IsHot,
            product.IsAvailable,
            avgRating,
            reviewDtos
        );
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

        return new ProductResponseDTO(
            product.Id,
            product.CategoryId,
            category?.Name,
            product.Name,
            product.Description,
            product.Price,
            product.StockQuantity,
            product.Origin,
            product.IsHot,
            product.IsAvailable,
            0,
            Enumerable.Empty<ReviewResponseDTO>()
        );
    }

    public async Task<ReviewResponseDTO> CreateReviewAsync(int productId, int userId, CreateReviewDTO dto, CancellationToken ct = default)
    {
        if (dto.Rating < 1 || dto.Rating > 5)
        {
            throw new ArgumentException("Điểm đánh giá phải từ 1 đến 5 sao.");
        }
        if (string.IsNullOrWhiteSpace(dto.Comment))
        {
            throw new ArgumentException("Nội dung đánh giá không được để trống.");
        }

        var product = await _unitOfWork.Products.GetByIdAsync(productId, ct);
        if (product == null)
        {
            throw new NotFoundException($"Sản phẩm với ID {productId} không tồn tại.");
        }

        // Ràng buộc: Chỉ cho phép đánh giá nếu khách đã từng mua sản phẩm này trong lịch sử đơn hàng
        var hasPurchased = await _unitOfWork.Reviews.HasUserPurchasedProductAsync(userId, productId, ct);
        if (!hasPurchased)
        {
            throw new ArgumentException("Bạn chỉ có thể đánh giá sản phẩm sau khi đã mua hàng.");
        }

        var user = await _unitOfWork.Users.GetByIdAsync(userId, ct);
        if (user == null)
        {
            throw new NotFoundException("Không tìm thấy thông tin người dùng.");
        }

        var review = new Review
        {
            ProductId = productId,
            UserId = userId,
            Rating = dto.Rating,
            Comment = dto.Comment.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Reviews.AddAsync(review, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return new ReviewResponseDTO(
            review.Id,
            user.Id,
            user.FullName,
            review.Rating,
            review.Comment,
            review.CreatedAt
        );
    }

    public async Task<IEnumerable<ProductResponseDTO>> SearchProductsAsync(
        string? keyword, int? categoryId, decimal? minPrice, decimal? maxPrice,
        CancellationToken ct = default)
    {
        var allCategories = await _unitOfWork.Categories.GetAllAsync(ct);
        var categoryMap = allCategories.ToDictionary(c => c.Id, c => c.Name);

        // Lấy tất cả sản phẩm rồi lọc trong bộ nhớ (LINQ + Contains)
        var products = await _unitOfWork.Products.GetAllAsync(ct);

        var filtered = products.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(keyword))
            filtered = filtered.Where(p => p.Name.Contains(keyword, StringComparison.OrdinalIgnoreCase)
                                        || (p.Description != null && p.Description.Contains(keyword, StringComparison.OrdinalIgnoreCase)));

        if (categoryId.HasValue && categoryId.Value > 0)
            filtered = filtered.Where(p => p.CategoryId == categoryId.Value);

        if (minPrice.HasValue)
            filtered = filtered.Where(p => p.Price >= minPrice.Value);

        if (maxPrice.HasValue)
            filtered = filtered.Where(p => p.Price <= maxPrice.Value);

        var result = new List<ProductResponseDTO>();
        foreach (var p in filtered)
        {
            var reviews = await _unitOfWork.Reviews.GetProductReviewsAsync(p.Id, ct);
            var avgRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0;
            var reviewDtos = reviews.Select(r => new ReviewResponseDTO(
                r.Id, r.UserId, r.User?.FullName ?? "Khách hàng", r.Rating, r.Comment, r.CreatedAt));

            result.Add(new ProductResponseDTO(
                p.Id,
                p.CategoryId,
                categoryMap.TryGetValue(p.CategoryId, out var name) ? name : null,
                p.Name,
                p.Description,
                p.Price,
                p.StockQuantity,
                p.Origin,
                p.IsHot,
                p.IsAvailable,
                avgRating,
                reviewDtos
            ));
        }

        return result;
    }
}
