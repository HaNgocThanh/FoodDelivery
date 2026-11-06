using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace FoodDelivery.Infrastructure.Data;

/// <summary>
/// Factory dùng cho EF Core CLI (design-time) — tách riêng để khi chạy
/// `dotnet ef` không cần khởi động toàn bộ host (JWT/Email/Cloudinary/Swagger).
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        // Tự chọn connection string dev từ appsettings.json của API project.
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "..", "FoodDelivery.API"))
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("OracleConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("ConnectionStrings:OracleConnection is required.");

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle(connectionString);

        return new AppDbContext(optionsBuilder.Options);
    }
}
