using FoodDelivery.Application.DTOs.Common;
using Microsoft.AspNetCore.Http;

namespace FoodDelivery.Application.Interfaces;

/// <summary>
/// Service upload &amp; xử lý ảnh lên cloud storage (Cloudinary).
/// </summary>
/// <remarks>
/// Implement interface này ở tầng Infrastructure để giữ Application layer
/// độc lập với SDK cụ thể (Cloudinary, AWS S3, Azure Blob, v.v.).
/// </remarks>
public interface IImageService
{
    /// <summary>
    /// Upload 1 file ảnh lên cloud và trả về thông tin đầy đủ (Url + PublicId + metadata).
    /// </summary>
    /// <param name="file">File ảnh từ form-data (multipart/form-data).</param>
    /// <returns>
    /// <see cref="ImageUploadResponseDTO"/> chứa URL HTTPS công khai và PublicId
    /// — PublicId là tham chiếu Cloudinary dùng để xóa/sửa ảnh sau này (tránh rác dữ liệu).
    /// </returns>
    /// <exception cref="ArgumentException">Khi file null, rỗng hoặc sai định dạng.</exception>
    /// <exception cref="InvalidOperationException">Khi upload thất bại (Cloudinary trả lỗi).</exception>
    Task<ImageUploadResponseDTO> UploadImageAsync(IFormFile file);

    /// <summary>
    /// Xóa ảnh trên cloud thông qua public ID (idempotent — "not found" vẫn trả về true).
    /// </summary>
    /// <param name="publicId">Public ID của ảnh (VD: "fooddelivery/products/abc123").</param>
    /// <returns>true nếu xóa thành công HOẶC ảnh đã không tồn tại; false nếu Cloudinary trả lỗi.</returns>
    Task<bool> DeleteImageAsync(string publicId);
}
