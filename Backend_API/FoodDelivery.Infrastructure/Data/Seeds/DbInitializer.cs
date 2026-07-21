using FoodDelivery.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Data.Seeds;

public static class DbInitializer
{
    public static async Task SeedDataAsync(AppDbContext context)
    {
        // 1. Seed AppUsers (Khách hàng & Shippers) nếu chưa có hoặc ít hơn 4
        if (await context.AppUsers.CountAsync() < 4)
        {
            if (!await context.AppUsers.AnyAsync(u => u.Email == "nguyenvana@gmail.com"))
            {
                await context.AppUsers.AddAsync(new AppUser
                {
                    FullName = "Nguyễn Văn A (Khách hàng)",
                    PhoneNumber = "0901234567",
                    Email = "nguyenvana@gmail.com",
                    Address1 = "123 Nguyễn Huệ, Quận 1, TP.HCM",
                    Address2 = "Phòng 502, Tòa nhà Bitexco",
                    LoyaltyPoints = 100
                });
            }

            if (!await context.AppUsers.AnyAsync(u => u.Email == "shipper1@fooddelivery.com"))
            {
                await context.AppUsers.AddAsync(new AppUser
                {
                    FullName = "Lê Văn Nam (Đội 1 - Q1)",
                    PhoneNumber = "0981111222",
                    Email = "shipper1@fooddelivery.com",
                    Address1 = "Trạm giao nhận Q1",
                    LoyaltyPoints = 0
                });
            }

            if (!await context.AppUsers.AnyAsync(u => u.Email == "shipper2@fooddelivery.com"))
            {
                await context.AppUsers.AddAsync(new AppUser
                {
                    FullName = "Trần Văn Bình (Đội 2 - Q3)",
                    PhoneNumber = "0982222333",
                    Email = "shipper2@fooddelivery.com",
                    Address1 = "Trạm giao nhận Q3",
                    LoyaltyPoints = 0
                });
            }

            if (!await context.AppUsers.AnyAsync(u => u.Email == "shipper3@fooddelivery.com"))
            {
                await context.AppUsers.AddAsync(new AppUser
                {
                    FullName = "Phạm Văn Cường (Đội 3 - Bình Thạnh)",
                    PhoneNumber = "0983333444",
                    Email = "shipper3@fooddelivery.com",
                    Address1 = "Trạm giao nhận Bình Thạnh",
                    LoyaltyPoints = 0
                });
            }

            await context.SaveChangesAsync();
        }

        // 2. Seed Category (Thực phẩm tươi sống) nếu chưa có
        if (!await context.Categories.AnyAsync())
        {
            var category = new Category
            {
                Name = "Thực phẩm tươi sống",
                Description = "Thịt tươi, hải sản tươi và rau củ hữu cơ giao nhanh 2h"
            };
            await context.Categories.AddAsync(category);
            await context.SaveChangesAsync();
        }

        // 3. Seed Products nếu chưa có
        if (!await context.Products.AnyAsync())
        {
            var category = await context.Categories.FirstAsync();

            var products = new List<Product>
            {
                new Product
                {
                    CategoryId = category.Id,
                    Name = "Thịt bò Mỹ tươi nhập khẩu (500g)",
                    Description = "Thịt bò Mỹ bít tết mền mọng, bảo quản lạnh tiêu chuẩn",
                    Price = 250000m,
                    StockQuantity = 5, // Tồn kho = 5 theo yêu cầu bài toán
                    Origin = "Mỹ",
                    IsHot = true,
                    IsAvailable = true
                },
                new Product
                {
                    CategoryId = category.Id,
                    Name = "Rau cải thìa hữu cơ VietGAP (300g)",
                    Description = "Rau cải thìa trồng hướng hữu cơ không hóa chất",
                    Price = 35000m,
                    StockQuantity = 10,
                    Origin = "Đà Lạt",
                    IsHot = false,
                    IsAvailable = true
                }
            };
            await context.Products.AddRangeAsync(products);
            await context.SaveChangesAsync();
        }

        // 4. Seed Promotions nếu chưa có
        if (!await context.Promotions.AnyAsync())
        {
            var promotions = new List<Promotion>
            {
                new Promotion
                {
                    Code = "HELLOFRESH",
                    DiscountPercentage = 20,
                    MaxUsage = 100,
                    CurrentUsage = 0,
                    ExpiryDate = DateTime.UtcNow.AddDays(30),
                    IsActive = true
                },
                new Promotion
                {
                    Code = "FOOD50",
                    DiscountPercentage = 50,
                    MaxUsage = 10,
                    CurrentUsage = 0,
                    ExpiryDate = DateTime.UtcNow.AddDays(15),
                    IsActive = true
                }
            };
            await context.Promotions.AddRangeAsync(promotions);
            await context.SaveChangesAsync();
        }
    }
}
