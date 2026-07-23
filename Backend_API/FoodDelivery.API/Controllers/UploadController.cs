using FoodDelivery.Application.DTOs.Common;
using FoodDelivery.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Controllers;

/// <summary>
/// API Upload ảnh lên Cloudinary. Chỉ dành cho Admin.
/// </summary>
/// <remarks>
/// Sau khi upload thành công, frontend sẽ nhận URL và lưu vào DB
/// (thường là trong bảng Product, Category, Review, …).
/// </remarks>
[ApiController]
[Route("api/upload")]
[Authorize(Roles = "Admin")]
public class UploadController : ControllerBase
{
    private readonly IImageService _imageService;
    private readonly ILogger<UploadController> _logger;

    public UploadController(
        IImageService imageService,
        ILogger<UploadController> logger)
    {
        _imageService = imageService;
        _logger = logger;
    }

    /// <summary>
    /// Upload 1 ảnh lên Cloudinary và trả về URL + PublicId công khai.
    /// </summary>
    /// <param name="file">File ảnh (multipart/form-data, field name = "file").</param>
    /// <returns>JSON chứa URL + PublicId + metadata để FE dùng cho Product create/update.</returns>
    /// <response code="200">Upload thành công, trả về URL + PublicId.</response>
    /// <response code="400">File không hợp lệ (rỗng, sai định dạng, vượt quá dung lượng).</response>
    /// <response code="401">Chưa đăng nhập.</response>
    /// <response code="403">Không có quyền Admin.</response>
    /// <response code="500">Lỗi Cloudinary hoặc server.</response>
    [HttpPost("image")]
    [ProducesResponseType(typeof(ImageUploadResponseDTO), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> UploadImage([FromForm(Name = "file")] IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "File không hợp lệ",
                Detail = "Vui lòng gửi file ảnh qua form-data với field name = 'file'.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        try
        {
            var result = await _imageService.UploadImageAsync(file);

            // Trả về đầy đủ thông tin (Url + PublicId + metadata) để FE dùng được cho
            // Product create/update mà vẫn giữ khả năng xóa ảnh trên Cloudinary sau này.
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Upload ảnh bị reject do input không hợp lệ");
            return BadRequest(new ProblemDetails
            {
                Title = "File không hợp lệ",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Upload ảnh thất bại do Cloudinary");
            return StatusCode(StatusCodes.Status500InternalServerError, new ProblemDetails
            {
                Title = "Upload thất bại",
                Detail = ex.Message,
                Status = StatusCodes.Status500InternalServerError
            });
        }
    }

    /// <summary>
    /// Xóa ảnh trên Cloudinary thông qua public ID.
    /// </summary>
    /// <param name="publicId">Public ID của ảnh cần xóa.</param>
    [HttpDelete("image/{publicId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> DeleteImage(string publicId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(publicId))
        {
            return BadRequest(new ProblemDetails
            {
                Title = "PublicId không hợp lệ",
                Detail = "Vui lòng cung cấp publicId của ảnh cần xóa.",
                Status = StatusCodes.Status400BadRequest
            });
        }

        var deleted = await _imageService.DeleteImageAsync(publicId);
        return Ok(new { deleted, publicId });
    }
}
