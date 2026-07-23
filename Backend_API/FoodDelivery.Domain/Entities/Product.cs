namespace FoodDelivery.Domain.Entities;

public class Product
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public int StockQuantity { get; set; }
    public string? Origin { get; set; }
    public bool IsHot { get; set; }
    public bool IsAvailable { get; set; }

    /// <summary>URL công khai (https) của ảnh sản phẩm đã upload lên Cloudinary.</summary>
    public string? ImageUrl { get; set; }

    /// <summary>Public ID trên Cloudinary dùng để xóa/sửa ảnh (tránh rác dữ liệu).</summary>
    public string? ImagePublicId { get; set; }

    // Navigation properties
    public Category? Category { get; set; }
    public ICollection<OrderDetail> OrderDetails { get; set; } = new List<OrderDetail>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
}
