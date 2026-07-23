namespace FoodDelivery.Application.DTOs.Product;

public record UpdateProductDTO(
    string Name,
    string? Description,
    decimal Price,
    string? Origin,
    bool IsHot,
    bool IsAvailable,
    /// <summary>URL ảnh MỚI (đã upload lên Cloudinary). Nếu khác ảnh cũ thì ảnh cũ sẽ bị xóa.</summary>
    string? ImageUrl = null,
    /// <summary>PublicId ảnh MỚI trên Cloudinary. Nếu khác ảnh cũ thì ảnh cũ sẽ bị xóa.</summary>
    string? ImagePublicId = null
);
