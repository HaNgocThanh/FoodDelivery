using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FoodDelivery.API;

public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        // Load the API configuration without running startup or database seeding.
        var assembly = typeof(AppDbContextFactory).Assembly;
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            Args = args,
            ApplicationName = assembly.GetName().Name,
            ContentRootPath = Path.GetDirectoryName(assembly.Location)
        });

        var connectionString = builder.Configuration.GetConnectionString("OracleConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Configure ConnectionStrings__OracleConnection or set ConnectionStrings:OracleConnection " +
                "in the FoodDelivery.API User Secrets for Development.");
        }

        var options = new DbContextOptionsBuilder<AppDbContext>().UseOracle(connectionString).Options;
        return new AppDbContext(options);
    }
}
