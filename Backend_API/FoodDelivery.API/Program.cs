using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using FoodDelivery.API.Middleware;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Application.Services;
using FoodDelivery.Domain.Interfaces;
using FoodDelivery.Infrastructure.Data;
using FoodDelivery.Infrastructure.Data.Seeds;
using FoodDelivery.Infrastructure.Repositories;
using Mapster;
using MapsterMapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// =============================================
// 1. CONTROLLERS
// =============================================
builder.Services.AddControllers();

// =============================================
// 2. SWAGGER / OPENAPI (Swashbuckle cho net8)
// =============================================
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "FoodDelivery API",
        Version = "v1",
        Description = "RESTful API cho hệ thống thương mại điện tử thực phẩm - FoodDelivery"
    });

    // Cho phép nhập JWT token trong Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header. Nhập: Bearer {token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// =============================================
// 3. JWT AUTHENTICATION
// =============================================
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"]
    ?? throw new InvalidOperationException("JWT SecretKey chưa được cấu hình");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings["Issuer"],
            ValidAudience = jwtSettings["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
            ClockSkew = TimeSpan.Zero // Không có độ trễ khi token hết hạn
        };
    });

builder.Services.AddAuthorization();

// =============================================
// 4. DATABASE – Oracle EF Core
// =============================================
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseOracle(builder.Configuration.GetConnectionString("OracleConnection")));
// builder.Services.AddDbContext<AppDbContext>(options =>
//     options.UseOracle(
//         builder.Configuration.GetConnectionString("OracleDb"),
//         oracleOptions => oracleOptions.UseOracleSQLCompatibility("19")));

// =============================================
// 5. DEPENDENCY INJECTION – Application Services
// =============================================
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IPromotionService, PromotionService>();

// =============================================
// 6. DEPENDENCY INJECTION – Infrastructure Repositories
// =============================================
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IPromotionRepository, PromotionRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();


// =============================================
// 7. FLUENTVALIDATION
// =============================================
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssembly(
    System.Reflection.Assembly.Load("FoodDelivery.Application"));

// =============================================
// 8. MAPSTER (Object Mapping)
// =============================================
var mapsterConfig = TypeAdapterConfig.GlobalSettings;
mapsterConfig.Scan(System.Reflection.Assembly.Load("FoodDelivery.Application"));
builder.Services.AddSingleton(mapsterConfig);
builder.Services.AddScoped<IMapper, ServiceMapper>();

// =============================================
// 9. CORS – Cho phép React Frontend
// =============================================
var allowedOrigins = builder.Configuration["AllowedOrigins"]?.Split(',')
    ?? new[] { "http://localhost:3000", "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// =============================================
// 10. HEALTH CHECKS
// =============================================
builder.Services.AddHealthChecks();

// =============================================
// BUILD APP
// =============================================
var app = builder.Build();

// Seed dữ liệu ban đầu khi ứng dụng khởi động
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        await DbInitializer.SeedDataAsync(context);
        Console.WriteLine("==================================================");
        Console.WriteLine("✅ SEED DỮ LIỆU BAN ĐẦU VÀO ORACLE DB THÀNH CÔNG!");
        Console.WriteLine("==================================================");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ LỖI SEED DATA: {ex.Message}");
    }
}

// =============================================
// MIDDLEWARE PIPELINE
// =============================================

// Swagger chỉ bật trong Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "FoodDelivery API v1");
        c.RoutePrefix = "swagger"; // Truy cập tại /swagger
    });
}

// Global Exception Handler (sẽ thêm Middleware sau)
// Global Exception Handler
app.UseGlobalExceptionMiddleware();

app.UseHttpsRedirection();

// CORS phải trước Authentication
app.UseCors("ReactApp");

app.UseAuthentication();
app.UseAuthorization();

// Health check endpoint
app.MapHealthChecks("/health");

// Controllers
app.MapControllers();

app.Run();
