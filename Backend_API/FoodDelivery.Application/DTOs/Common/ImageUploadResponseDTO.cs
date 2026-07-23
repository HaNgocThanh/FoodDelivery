namespace FoodDelivery.Application.DTOs.Common;

/// <summary>
/// Response trả về sau khi upload ảnh thành công.
/// </summary>
/// <param name="Url">URL HTTPS công khai của ảnh (dùng để lưu vào DB).</param>
/// <param name="PublicId">Public ID trên Cloudinary (dùng để xóa/sửa ảnh sau này).</param>
/// <param name="Width">Chiều rộng (px) sau khi áp dụng Transformation.</param>
/// <param name="Height">Chiều cao (px) sau khi áp dụng Transformation.</param>
/// <param name="Format">Định dạng ảnh sau khi Cloudinary tối ưu (jpg, png, webp, avif).</param>
/// <param name="Bytes">Dung lượng ảnh sau khi nén (bytes).</param>
public record ImageUploadResponseDTO(
    string Url,
    string PublicId,
    int Width,
    int Height,
    string Format,
    long Bytes
);
