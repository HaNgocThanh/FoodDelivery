using System.Data;
using System.Data.Common;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FoodDelivery.API.Controllers;
using FoodDelivery.Application.DTOs.Auth;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using FoodDelivery.Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace FoodDelivery.Tests;

public class RegistrationSecurityTests
{
    [Theory]
    [InlineData("Admin")]
    [InlineData("Shipper")]
    public async Task PublicRegistration_IgnoresRequestedRoleInStoredAccountAndSignedToken(string requestedRole)
    {
        var json = JsonSerializer.Serialize(new
        {
            fullName = "Test Customer",
            email = "customer@example.invalid",
            password = "registration-fixture",
            phoneNumber = "0900000000",
            address1 = "Test address",
            role = requestedRole
        });
        var request = JsonSerializer.Deserialize<RegisterRequestDTO>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.NotNull(request);

        var key = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:SecretKey"] = key,
            ["Jwt:Issuer"] = "registration-test",
            ["Jwt:Audience"] = "registration-test"
        }).Build();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=test;Password=test;Data Source=localhost:1521/XEPDB1;")
            .AddInterceptors(new NoExistingAccount()).Options;
        await using var context = new RegistrationContext(options);
        var controller = new AuthController(new AuthService(context, new TokenService(configuration)),
            null!, null!);

        var result = Assert.IsType<OkObjectResult>(await controller.Register(request, CancellationToken.None));
        var response = Assert.IsType<AuthResponseDTO>(result.Value);
        Assert.Equal("Customer", context.SavedUser?.Role);
        Assert.Equal("Customer", response.Role);

        var principal = new JwtSecurityTokenHandler().ValidateToken(response.Token, new TokenValidationParameters
        {
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            ValidateIssuerSigningKey = true,
            ValidIssuer = "registration-test",
            ValidAudience = "registration-test"
        }, out _);
        Assert.True(principal.IsInRole("Customer"));
        Assert.False(principal.IsInRole(requestedRole));
    }

    private sealed class RegistrationContext(DbContextOptions<AppDbContext> options) : AppDbContext(options)
    {
        public AppUser? SavedUser { get; private set; }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SavedUser = ChangeTracker.Entries<AppUser>().Single(entry => entry.State == EntityState.Added).Entity;
            return Task.FromResult(1);
        }
    }

    private sealed class NoExistingAccount : DbCommandInterceptor, IDbConnectionInterceptor
    {
        public ValueTask<InterceptionResult> ConnectionOpeningAsync(DbConnection connection, ConnectionEventData eventData,
            InterceptionResult result, CancellationToken cancellationToken = default) =>
            ValueTask.FromResult(InterceptionResult.Suppress());

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command,
            CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            var rows = new DataTable();
            rows.Columns.Add("EXISTS", typeof(bool));
            rows.Rows.Add(false);
            return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(rows.CreateDataReader()));
        }
    }
}
