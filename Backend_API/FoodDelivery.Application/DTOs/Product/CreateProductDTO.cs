namespace FoodDelivery.Application.DTOs.Product;

public record CreateProductDTO(
    int CategoryId,
    string Name,
    string? Description,
    decimal Price,
    int StockQuantity,
    string? Origin,
    bool IsHot,
    /// <summary>URL ảnh đã upload lên Cloudinary (FE gọi /api/upload/image trước).</summary>
    string? ImageUrl = null,
    /// <summary>PublicId Cloudinary để có thể xóa ảnh khi cần (tránh rác).</summary>
    string? ImagePublicId = null
);
