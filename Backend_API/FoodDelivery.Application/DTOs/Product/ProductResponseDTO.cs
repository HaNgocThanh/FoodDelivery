using FoodDelivery.Application.DTOs.Review;

namespace FoodDelivery.Application.DTOs.Product;

public record ProductResponseDTO(
    int Id,
    int CategoryId,
    string? CategoryName,
    string Name,
    string? Description,
    decimal Price,
    int StockQuantity,
    string? Origin,
    bool IsHot,
    bool IsAvailable,
    /// <summary>URL công khai (HTTPS) của ảnh sản phẩm trên Cloudinary.</summary>
    string? ImageUrl = null,
    /// <summary>PublicId Cloudinary (dùng nội bộ — không cần hiển thị ra FE).</summary>
    string? ImagePublicId = null,
    double AverageRating = 0,
    IEnumerable<ReviewResponseDTO>? Reviews = null
);
