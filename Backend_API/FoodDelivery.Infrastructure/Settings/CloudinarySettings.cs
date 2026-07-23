namespace FoodDelivery.Infrastructure.Settings;

/// <summary>
/// Cấu hình Cloudinary binding từ section "CloudinarySettings" trong appsettings.json.
/// </summary>
/// <remarks>
/// Class POCO này được đăng ký với IOptions&lt;CloudinarySettings&gt; trong Program.cs.
/// Validate cơ bản trong constructor (fail-fast) để đảm bảo credentials không bị thiếu.
/// </remarks>
public class CloudinarySettings
{
    public const string SectionName = "CloudinarySettings";

    /// <summary>Cloud name (tên cloud account trên Cloudinary dashboard).</summary>
    public string CloudName { get; set; } = string.Empty;

    /// <summary>API key (lấy từ Cloudinary dashboard).</summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>API secret (lấy từ Cloudinary dashboard).</summary>
    public string ApiSecret { get; set; } = string.Empty;

    /// <summary>Folder mặc định để tổ chức ảnh trên Cloudinary (VD: "fooddelivery/products").</summary>
    public string DefaultFolder { get; set; } = "fooddelivery";

    /// <summary>Chiều rộng mặc định sau khi crop (px). Mặc định 800.</summary>
    public int DefaultWidth { get; set; } = 800;

    /// <summary>Chiều cao mặc định sau khi crop (px). Mặc định 800.</summary>
    public int DefaultHeight { get; set; } = 800;

    /// <summary>Dung lượng file tối đa cho phép upload (bytes). Mặc định 10 MB.</summary>
    public long MaxFileSizeBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>
    /// Validate cấu hình. Throw nếu thiếu field bắt buộc.
    /// </summary>
    public void Validate()
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(CloudName))
            errors.Add("CloudName");
        if (string.IsNullOrWhiteSpace(ApiKey))
            errors.Add("ApiKey");
        if (string.IsNullOrWhiteSpace(ApiSecret))
            errors.Add("ApiSecret");

        if (errors.Count > 0)
        {
            throw new InvalidOperationException(
                $"CloudinarySettings thiếu các field bắt buộc: {string.Join(", ", errors)}. " +
                "Vui lòng cấu hình trong appsettings.json hoặc user-secrets.");
        }
    }
}
