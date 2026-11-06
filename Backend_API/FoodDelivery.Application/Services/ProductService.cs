using FoodDelivery.Application.DTOs.Product;
using FoodDelivery.Application.DTOs.Review;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Exceptions;
using FoodDelivery.Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace FoodDelivery.Application.Services;

public class ProductService : IProductService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IImageService _imageService;
    private readonly ILogger<ProductService> _logger;

    public ProductService(
        IUnitOfWork unitOfWork,
        IImageService imageService,
        ILogger<ProductService> logger)
    {
        _unitOfWork = unitOfWork;
        _imageService = imageService;
        _logger = logger;
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
            var reviewDtos = MapReviews(reviews);

            result.Add(MapToResponse(p, categoryMap, avgRating, reviewDtos));
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
        var reviewDtos = MapReviews(reviews);

        return MapToResponse(product, category, avgRating, reviewDtos);
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
            IsAvailable = dto.StockQuantity > 0,
            ImageUrl = dto.ImageUrl,
            ImagePublicId = dto.ImagePublicId
        };

        await _unitOfWork.Products.AddAsync(product, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return MapToResponse(product, category, 0, Enumerable.Empty<ReviewResponseDTO>());
    }

    public async Task<ProductResponseDTO> UpdateProductAsync(int id, UpdateProductDTO dto, CancellationToken ct = default)
    {
        if (dto.Price <= 0) throw new ArgumentException("Giá sản phẩm phải lớn hơn 0.");

        await _unitOfWork.BeginTransactionAsync(ct);
        Product product;
        string? oldPublicId = null;
        try
        {
            product = await GetLockedProductAsync(id, ct);
            product.Name = dto.Name;
            product.Description = dto.Description;
            product.Price = dto.Price;
            product.Origin = dto.Origin;
            product.IsHot = dto.IsHot;
            product.IsAvailable = dto.IsAvailable;

            if (!string.IsNullOrWhiteSpace(dto.ImageUrl))
                product.ImageUrl = dto.ImageUrl;
            if (!string.IsNullOrWhiteSpace(dto.ImagePublicId) &&
                !string.Equals(product.ImagePublicId, dto.ImagePublicId, StringComparison.Ordinal))
            {
                oldPublicId = product.ImagePublicId;
                product.ImagePublicId = dto.ImagePublicId;
            }

            await _unitOfWork.CommitTransactionAsync(ct);
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(CancellationToken.None);
            throw;
        }

        if (!string.IsNullOrWhiteSpace(oldPublicId))
            await DeleteCloudinaryImageSafelyAsync(oldPublicId);

        var category = await _unitOfWork.Categories.GetByIdAsync(product.CategoryId, ct);
        var reviews = await _unitOfWork.Reviews.GetProductReviewsAsync(id, ct);
        var avgRating = reviews.Count > 0 ? Math.Round(reviews.Average(r => r.Rating), 1) : 0;
        return MapToResponse(product, category, avgRating, MapReviews(reviews));
    }

    public async Task<ProductResponseDTO> RestockAsync(int productId, int additionalQuantity, CancellationToken ct = default)
    {
        if (additionalQuantity <= 0)
            throw new ArgumentException("Số lượng nhập kho phải lớn hơn 0.");

        await _unitOfWork.BeginTransactionAsync(ct);
        Product product;
        try
        {
            product = await GetLockedProductAsync(productId, ct);
            if ((long)product.StockQuantity + additionalQuantity > int.MaxValue)
                throw new ArgumentException("Tổng số lượng tồn kho vượt quá giới hạn.");

            product.StockQuantity += additionalQuantity;
            if (product.StockQuantity > 0) product.IsAvailable = true;
            await _unitOfWork.CommitTransactionAsync(ct);
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(CancellationToken.None);
            throw;
        }

        var category = await _unitOfWork.Categories.GetByIdAsync(product.CategoryId, ct);
        return MapToResponse(product, category, 0, Enumerable.Empty<ReviewResponseDTO>());
    }

    private async Task<Product> GetLockedProductAsync(int id, CancellationToken ct) =>
        await _unitOfWork.Products.GetByIdWithLockAsync(id, ct)
            ?? throw new NotFoundException($"Sản phẩm với ID {id} không tồn tại.");

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
            throw new ForbiddenException("Bạn phải mua và nhận hàng thành công mới được đánh giá.");
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
            var reviewDtos = MapReviews(reviews);

            result.Add(MapToResponse(p, categoryMap, avgRating, reviewDtos));
        }

        return result;
    }

    public async Task DeleteProductAsync(int id, CancellationToken ct = default)
    {
        await _unitOfWork.BeginTransactionAsync(ct);
        Product product;
        try
        {
            product = await GetLockedProductAsync(id, ct);
            _unitOfWork.Products.Delete(product);
            await _unitOfWork.CommitTransactionAsync(ct);
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(CancellationToken.None);
            throw;
        }

        if (!string.IsNullOrWhiteSpace(product.ImagePublicId))
            await DeleteCloudinaryImageSafelyAsync(product.ImagePublicId);
    }

    // ─────────────── Helpers ───────────────

    /// <summary>
    /// Gọi Cloudinary xóa ảnh, log lỗi nhưng KHÔNG ném exception cho Update flow
    /// (để không chặn việc cập nhật DB). DeleteProductAsync cũng dùng helper này.
    /// </summary>
    private async Task DeleteCloudinaryImageSafelyAsync(string publicId, bool throwOnError = false)
    {
        try
        {
            var deleted = await _imageService.DeleteImageAsync(publicId);
            if (!deleted)
            {
                _logger.LogWarning(
                    "Không thể xóa ảnh Cloudinary publicId={PublicId} (result != \"ok\"). Bỏ qua, tiếp tục thao tác DB.",
                    publicId);
                if (throwOnError)
                    throw new InvalidOperationException($"Xóa ảnh Cloudinary {publicId} thất bại.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Lỗi khi gọi IImageService.DeleteImageAsync(publicId={PublicId}). Bỏ qua để tránh chặn thao tác DB.",
                publicId);
            if (throwOnError) throw;
        }
    }

    private static IEnumerable<ReviewResponseDTO> MapReviews(IEnumerable<Review> reviews)
        => reviews.Select(r => new ReviewResponseDTO(
            r.Id,
            r.UserId,
            r.User?.FullName ?? "Khách hàng",
            r.Rating,
            r.Comment,
            r.CreatedAt));

    private static ProductResponseDTO MapToResponse(
        Product p,
        IDictionary<int, string> categoryMap,
        double avgRating,
        IEnumerable<ReviewResponseDTO> reviewDtos)
        => new(
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
            p.ImageUrl,
            p.ImagePublicId,
            avgRating,
            reviewDtos);

    private static ProductResponseDTO MapToResponse(
        Product p,
        Category? category,
        double avgRating,
        IEnumerable<ReviewResponseDTO> reviewDtos)
        => new(
            p.Id,
            p.CategoryId,
            category?.Name,
            p.Name,
            p.Description,
            p.Price,
            p.StockQuantity,
            p.Origin,
            p.IsHot,
            p.IsAvailable,
            p.ImageUrl,
            p.ImagePublicId,
            avgRating,
            reviewDtos);
}
