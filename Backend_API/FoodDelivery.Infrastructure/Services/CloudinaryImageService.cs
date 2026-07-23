using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using FoodDelivery.Application.DTOs.Common;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Infrastructure.Settings;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Services;

/// <summary>
/// Triển khai IImageService sử dụng Cloudinary SDK để upload & xử lý ảnh.
/// </summary>
/// <remarks>
/// - Singleton service: Cloudinary client thread-safe, có thể dùng chung.
/// - Tự động crop ảnh vuông + tối ưu dung lượng qua Transformation.
/// - Validate file (size, extension) trước khi upload.
/// </remarks>
public class CloudinaryImageService : IImageService
{
    private readonly Cloudinary _cloudinary;
    private readonly CloudinarySettings _settings;
    private readonly ILogger<CloudinaryImageService> _logger;

    /// <summary>Định dạng ảnh được phép upload (Cloudinary hỗ trợ nhiều hơn, nhưng TMĐT chỉ cần các định dạng phổ biến).</summary>
    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"
    };

    /// <summary>MIME type được phép (bảo mật thêm lớp nữa ngoài extension).</summary>
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/svg+xml"
    };

    public CloudinaryImageService(
        IOptions<CloudinarySettings> options,
        ILogger<CloudinaryImageService> logger)
    {
        _settings = options.Value;
        _logger = logger;

        // Validate cấu hình fail-fast (sẽ throw ngay khi DI resolve nếu thiếu config)
        _settings.Validate();

        // Khởi tạo Cloudinary client. Account là record bất biến, an toàn khi share.
        var account = new Account(
            _settings.CloudName,
            _settings.ApiKey,
            _settings.ApiSecret);

        _cloudinary = new Cloudinary(account)
        {
            Api = { Secure = true } // Luôn trả về HTTPS URL
        };

        _logger.LogInformation(
            "Cloudinary client đã khởi tạo cho cloud '{CloudName}', folder mặc định: '{Folder}'",
            _settings.CloudName,
            _settings.DefaultFolder);
    }

    public async Task<ImageUploadResponseDTO> UploadImageAsync(IFormFile file)
    {
        // ─── Validate input ────────────────────────────────────────────────────
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("File upload rỗng hoặc không tồn tại.", nameof(file));
        }

        if (file.Length > _settings.MaxFileSizeBytes)
        {
            var sizeMb = file.Length / 1024d / 1024d;
            var maxMb = _settings.MaxFileSizeBytes / 1024d / 1024d;
            throw new ArgumentException(
                $"File vượt quá dung lượng cho phép ({sizeMb:F2} MB > {maxMb:F2} MB).",
                nameof(file));
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrEmpty(extension) || !AllowedExtensions.Contains(extension))
        {
            throw new ArgumentException(
                $"Định dạng file '{extension}' không được hỗ trợ. " +
                $"Chỉ chấp nhận: {string.Join(", ", AllowedExtensions)}.",
                nameof(file));
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            throw new ArgumentException(
                $"MIME type '{file.ContentType}' không hợp lệ.",
                nameof(file));
        }

        // ─── Build public ID duy nhất để tránh trùng tên ───────────────────────
        // Format: <folder>/<timestamp>_<safe-filename>
        // Ví dụ: fooddelivery/products/20260724_banh-xeo-oc-to
        var safeFileName = SanitizeFileName(Path.GetFileNameWithoutExtension(file.FileName));
        var publicId = $"{_settings.DefaultFolder}/{DateTime.UtcNow:yyyyMMddHHmmss}_{safeFileName}_{Guid.NewGuid():N}";
        // Cloudinary publicId giới hạn 255 ký tự, giữ dưới 200 để an toàn
        if (publicId.Length > 200)
        {
            publicId = publicId[..200];
        }

        // ─── Cấu hình upload + transformation ──────────────────────────────────
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(file.FileName, file.OpenReadStream()),
            PublicId = publicId,
            Overwrite = false,        // Không ghi đè nếu trùng tên
            UniqueFilename = true,    // Cloudinary thêm suffix nếu trùng
            UseFilenameAsDisplayName = true,
            Folder = _settings.DefaultFolder,

            // Transformation tự động áp dụng khi upload:
            // - Crop fill: cắt và scale để vừa khít khung (giữ tỉ lệ, lấp đầy khung)
            // - Gravity auto: Cloudinary tự chọn vùng quan trọng (face, focus, …)
            // - Quality auto: Cloudinary tự tối ưu chất lượng theo nội dung
            // - Fetch format auto: trình duyệt nào hỗ trợ webp/avif sẽ được serve tối ưu
            Transformation = new Transformation()
                .Height(_settings.DefaultHeight)
                .Width(_settings.DefaultWidth)
                .Crop("fill")
                .Gravity("auto")
                .Quality("auto")
                .FetchFormat("auto"),

            // Tag giúp quản lý ảnh trên Cloudinary dashboard
            Tags = "fooddelivery,product"
        };

        try
        {
            _logger.LogInformation(
                "Bắt đầu upload ảnh '{FileName}' ({Size:F2} KB) lên Cloudinary...",
                file.FileName,
                file.Length / 1024d);

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                _logger.LogError(
                    "Cloudinary upload thất bại cho file '{FileName}': {Error}",
                    file.FileName,
                    uploadResult.Error.Message);
                throw new InvalidOperationException(
                    $"Upload lên Cloudinary thất bại: {uploadResult.Error.Message}");
            }

            if (string.IsNullOrWhiteSpace(uploadResult.SecureUrl?.ToString()))
            {
                throw new InvalidOperationException(
                    "Upload thành công nhưng Cloudinary không trả về URL.");
            }

            _logger.LogInformation(
                "Upload ảnh thành công: {Url} (publicId={PublicId}, {Width}x{Height}, {Bytes} bytes)",
                uploadResult.SecureUrl,
                uploadResult.PublicId,
                uploadResult.Width,
                uploadResult.Height,
                uploadResult.Bytes);

            return new ImageUploadResponseDTO(
                Url: uploadResult.SecureUrl.ToString(),
                PublicId: uploadResult.PublicId,
                Width: uploadResult.Width,
                Height: uploadResult.Height,
                Format: uploadResult.Format ?? string.Empty,
                Bytes: uploadResult.Bytes);
        }
        catch (Exception ex) when (ex is not ArgumentException and not InvalidOperationException)
        {
            _logger.LogError(ex,
                "Lỗi không mong đợi khi upload file '{FileName}' lên Cloudinary.",
                file.FileName);
            throw new InvalidOperationException(
                $"Upload ảnh thất bại: {ex.Message}", ex);
        }
    }

    public async Task<bool> DeleteImageAsync(string publicId)
    {
        if (string.IsNullOrWhiteSpace(publicId))
        {
            throw new ArgumentException("PublicId không được để trống.", nameof(publicId));
        }

        var deleteParams = new DeletionParams(publicId);

        try
        {
            var result = await _cloudinary.DestroyAsync(deleteParams);
            var success = result.Result == "ok" || result.Result == "not found";

            if (success)
            {
                _logger.LogInformation(
                    "Đã xóa ảnh Cloudinary publicId={PublicId}: {Result}",
                    publicId,
                    result.Result);
            }
            else
            {
                _logger.LogWarning(
                    "Xóa ảnh Cloudinary publicId={PublicId} trả về: {Result}",
                    publicId,
                    result.Result);
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Lỗi khi xóa ảnh Cloudinary publicId={PublicId}", publicId);
            return false;
        }
    }

    /// <summary>
    /// Làm sạch tên file: bỏ ký tự đặc biệt, giới hạn độ dài.
    /// Tránh path traversal và ký tự Unicode gây lỗi URL.
    /// </summary>
    private static string SanitizeFileName(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            return "image";

        // Chỉ giữ chữ cái, số, gạch ngang, gạch dưới
        var cleaned = new string(fileName
            .Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_')
            .ToArray())
            .ToLowerInvariant();

        // Giới hạn 30 ký tự, fallback "image" nếu rỗng
        if (string.IsNullOrEmpty(cleaned))
            return "image";

        return cleaned.Length <= 30 ? cleaned : cleaned[..30];
    }
}
