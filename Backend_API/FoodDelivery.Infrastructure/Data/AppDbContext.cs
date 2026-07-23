using Microsoft.EntityFrameworkCore;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Enums;

namespace FoodDelivery.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<AppUser> AppUsers { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Promotion> Promotions { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<OrderDetail> OrderDetails { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<ProductQuestion> ProductQuestions { get; set; }
        public DbSet<SupportTicket> SupportTickets { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Cấu hình Fluent API cho Category
            modelBuilder.Entity<Category>(entity =>
            {
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
            });

            // 2. Cấu hình Fluent API cho Product (Tập trung vào tồn kho)
            modelBuilder.Entity<Product>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.Property(p => p.Name).IsRequired().HasMaxLength(200);
                entity.Property(p => p.Price).HasColumnType("decimal(18,2)");
                
                // Ràng buộc số lượng tồn kho không được âm ở cấp độ DB (Dùng quote identifier trong Oracle DDL)
                entity.Property(p => p.StockQuantity).IsRequired();
                entity.ToTable(t => t.HasCheckConstraint("CK_Product_StockQuantity", "\"StockQuantity\" >= 0"));

                // Khóa ngoại tới Category (Link với navigation properties)
                entity.HasOne(p => p.Category)
                      .WithMany(c => c.Products)
                      .HasForeignKey(p => p.CategoryId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Ảnh sản phẩm lưu trên Cloudinary: lưu URL public + PublicId để dọn rác
                entity.Property(p => p.ImageUrl).HasMaxLength(1000).IsRequired(false);
                entity.Property(p => p.ImagePublicId).HasMaxLength(255).IsRequired(false);
            });

            // 3. Cấu hình Fluent API cho AppUser
            modelBuilder.Entity<AppUser>(entity =>
            {
                entity.HasKey(u => u.Id);
                entity.Property(u => u.FullName).IsRequired().HasMaxLength(150);
                entity.Property(u => u.PhoneNumber).HasMaxLength(20);
                entity.Property(u => u.Email).HasMaxLength(100);
                entity.Property(u => u.PasswordHash).HasMaxLength(256).IsRequired(false);
                entity.Property(u => u.Role).HasMaxLength(50).HasDefaultValue("Customer").IsRequired(false);
                entity.Property(u => u.Tier).HasConversion<string>().HasDefaultValue(MembershipTier.Standard);
                entity.Property(u => u.ResetPasswordToken).HasMaxLength(100).IsRequired(false);
                entity.Property(u => u.ResetPasswordExpiry).IsRequired(false);
                entity.HasIndex(u => u.Email).IsUnique();
            });

            // 4. Cấu hình Fluent API cho Promotion
            modelBuilder.Entity<Promotion>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.Property(p => p.Code).IsRequired().HasMaxLength(50);
                entity.Property(p => p.DiscountPercentage).HasColumnType("decimal(18,2)");
                entity.HasIndex(p => p.Code).IsUnique(); // Đảm bảo mã KM không trùng lặp
            });

            // 5. Cấu hình Fluent API cho Order
            modelBuilder.Entity<Order>(entity =>
            {
                entity.HasKey(o => o.Id);
                entity.Property(o => o.TotalAmount).HasColumnType("decimal(18,2)");
                entity.Property(o => o.PaymentMethod).HasConversion<string>(); // Lưu Enum dưới dạng String (COD, Online)
                entity.Property(o => o.Status).HasConversion<string>();

                // Quan hệ: Khách hàng (User) <-> Đơn hàng
                entity.HasOne(o => o.User)
                      .WithMany(u => u.UserOrders)
                      .HasForeignKey(o => o.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Quan hệ: Người giao hàng (Shipper) <-> Đơn hàng
                entity.HasOne(o => o.Shipper)
                      .WithMany(u => u.ShipperOrders)
                      .HasForeignKey(o => o.ShipperId)
                      .OnDelete(DeleteBehavior.Restrict);

                // Quan hệ: Mã khuyến mãi (Promotion) <-> Đơn hàng
                entity.HasOne(o => o.Promotion)
                      .WithMany(p => p.Orders)
                      .HasForeignKey(o => o.PromotionId)
                      .OnDelete(DeleteBehavior.SetNull);
            });

            // 6. Cấu hình Fluent API cho OrderDetail (Khóa chính kép)
            modelBuilder.Entity<OrderDetail>(entity =>
            {
                // Khóa chính kép (Composite Key)
                entity.HasKey(od => new { od.OrderId, od.ProductId });
                entity.Property(od => od.UnitPrice).HasColumnType("decimal(18,2)");
                entity.Property(od => od.Quantity).IsRequired();

                entity.HasOne(od => od.Order)
                      .WithMany(o => o.OrderDetails)
                      .HasForeignKey(od => od.OrderId)
                      .OnDelete(DeleteBehavior.Cascade); // Xóa đơn hàng thì xóa luôn chi tiết

                entity.HasOne(od => od.Product)
                      .WithMany(p => p.OrderDetails)
                      .HasForeignKey(od => od.ProductId)
                      .OnDelete(DeleteBehavior.Restrict); // Không cho xóa Product nếu đã có trong OrderDetail
            });

            // 7. Cấu hình Fluent API cho Review
            modelBuilder.Entity<Review>(entity =>
            {
                entity.HasKey(r => r.Id);
                entity.Property(r => r.Rating).IsRequired();
                entity.Property(r => r.Comment).HasMaxLength(1000);

                entity.HasOne(r => r.Product)
                      .WithMany(p => p.Reviews)
                      .HasForeignKey(r => r.ProductId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(r => r.User)
                      .WithMany(u => u.Reviews)
                      .HasForeignKey(r => r.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // 8. Cấu hình Fluent API cho ProductQuestion
            modelBuilder.Entity<ProductQuestion>(entity =>
            {
                entity.HasKey(pq => pq.Id);
                entity.Property(pq => pq.QuestionText).IsRequired().HasMaxLength(2000);
                entity.Property(pq => pq.AnswerText).HasMaxLength(2000).IsRequired(false);

                entity.HasOne(pq => pq.Product)
                      .WithMany()
                      .HasForeignKey(pq => pq.ProductId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(pq => pq.User)
                      .WithMany()
                      .HasForeignKey(pq => pq.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // 9. Cấu hình Fluent API cho SupportTicket
            modelBuilder.Entity<SupportTicket>(entity =>
            {
                entity.HasKey(st => st.Id);
                entity.Property(st => st.Subject).IsRequired().HasMaxLength(200);
                entity.Property(st => st.Message).IsRequired().HasMaxLength(4000);
                entity.Property(st => st.AdminReply).HasMaxLength(4000).IsRequired(false);
                entity.Property(st => st.Status).HasMaxLength(50).HasDefaultValue("Open");

                entity.HasOne(st => st.User)
                      .WithMany()
                      .HasForeignKey(st => st.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(st => st.Order)
                      .WithMany()
                      .HasForeignKey(st => st.OrderId)
                      .OnDelete(DeleteBehavior.SetNull);
            });
        }
    }
}