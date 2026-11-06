using System.Text;
using System.Threading.RateLimiting;
using FoodDelivery.API;
using FoodDelivery.API.Auth;
using FluentValidation;
using FluentValidation.AspNetCore;
using FoodDelivery.API.Hubs;
using FoodDelivery.API.Middleware;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Application.Services;
using FoodDelivery.Domain.Interfaces;
using FoodDelivery.Infrastructure.Data;
using FoodDelivery.Infrastructure.Data.Seeds;
using FoodDelivery.Infrastructure.Repositories;
using FoodDelivery.Infrastructure.Services;
using FoodDelivery.Infrastructure.Settings;
using Mapster;
using MapsterMapper;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// =============================================
// 0. KESTREL – tăng giới hạn multipart upload (ảnh sản phẩm)
// =============================================
builder.WebHost.ConfigureKestrel(options =>
{
    // Cho phép request body tối đa ~50 MB (phòng trường hợp nhiều ảnh cùng lúc)
    options.Limits.MaxRequestBodySize = 50 * 1024 * 1024;
});

// Cho phép form-data lớn hơn mặc định (mặc định ~28 MB)
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 50 * 1024 * 1024; // 50 MB
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartHeadersLengthLimit = int.MaxValue;
});

// =============================================
// 1. CONTROLLERS
// =============================================
builder.Services.AddControllers();
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Instance ??= context.HttpContext.Request.Path;
        context.ProblemDetails.Extensions.TryAdd("traceId",
            System.Diagnostics.Activity.Current?.Id ?? context.HttpContext.TraceIdentifier);
    };
});

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
var secretKey = jwtSettings["SecretKey"];
if (string.IsNullOrWhiteSpace(secretKey) || Encoding.UTF8.GetByteCount(secretKey) < 32)
    throw new InvalidOperationException("Jwt:SecretKey must be configured with at least 32 UTF-8 bytes.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var request = context.HttpContext.Request;
                if (request.Path == "/supporthub" && !request.Headers.ContainsKey("Authorization"))
                {
                    var token = request.Query["access_token"];
                    if (!string.IsNullOrEmpty(token)) context.Token = token;
                }
                return Task.CompletedTask;
            },
            OnTokenValidated = async context =>
            {
                var session = UserSessions.FromPrincipal(context.Principal);
                var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                if (session is null || !await UserSessions.IsCurrentAsync(db, session, context.HttpContext.RequestAborted))
                    context.Fail("Session has expired.");
            }
        };
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
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.MapToIPv6().ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));
});

// =============================================
// 4. DATABASE – Oracle EF Core
// =============================================
var oracleConnection = builder.Configuration.GetConnectionString("OracleConnection");
if (string.IsNullOrWhiteSpace(oracleConnection))
    throw new InvalidOperationException("ConnectionStrings:OracleConnection is required.");

builder.Services.AddDbContext<AppDbContext>(options => options.UseOracle(oracleConnection));

// =============================================
// 5. DEPENDENCY INJECTION – Application Services
// =============================================
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<PasswordRecoveryService>();
builder.Services.AddSingleton<PasswordRecoveryQueue>();
builder.Services.AddHostedService(services => services.GetRequiredService<PasswordRecoveryQueue>());
builder.Services.AddSingleton<UserSessions>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddHostedService<ExpiredPaymentOrdersWorker>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IPromotionService, PromotionService>();
builder.Services.AddScoped<IStatisticsService, StatisticsService>();
builder.Services.AddScoped<IEmailService, FoodDelivery.Infrastructure.Services.EmailService>();
builder.Services.AddScoped<ISupportService, FoodDelivery.Infrastructure.Services.SupportService>();

// =============================================
// 5.1 CLOUDINARY OPTIONS BINDING + IMAGE SERVICE
// =============================================
builder.Services.Configure<CloudinarySettings>(
    builder.Configuration.GetSection(CloudinarySettings.SectionName));

// Singleton vì Cloudinary client thread-safe, không cần tạo mới mỗi request
builder.Services.AddSingleton<IImageService, CloudinaryImageService>();

// =============================================
// 6. DEPENDENCY INJECTION – Infrastructure Repositories
// =============================================
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IPromotionRepository, PromotionRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
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
builder.Services.AddHealthChecks()
    .AddCheck<OracleReadinessCheck>("oracle", tags: ["ready"], timeout: TimeSpan.FromSeconds(5));

// =============================================
// 10.1 SIGNALR — Realtime chat hub (Customer ↔ Admin)
// =============================================
builder.Services.AddSignalR(options =>
{
    // Giữ connection sống ~30s, ping mỗi 15s
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});

// =============================================
// BUILD APP
// =============================================
var dataProtection = builder.Services.AddDataProtection();
var keyPath = builder.Configuration["DataProtection:KeyPath"];
if (!string.IsNullOrWhiteSpace(keyPath))
    dataProtection.PersistKeysToFileSystem(new DirectoryInfo(keyPath));

var app = builder.Build();

if (app.Environment.IsDevelopment() && app.Configuration.GetValue<bool>("DemoSeed:Enabled"))
{
    var demoPassword = app.Configuration["DemoSeed:Password"];
    if (string.IsNullOrWhiteSpace(demoPassword) || demoPassword.Length < 16)
        throw new InvalidOperationException("DemoSeed:Password must be configured with at least 16 characters.");

    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbInitializer.SeedDemoDataAsync(context, demoPassword);
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
app.UseRouting();
app.UseCors("ReactApp");
app.UseWhen(context => context.Request.Path.StartsWithSegments("/api"), branch =>
    branch.UseStatusCodePages(async status =>
    {
        var context = status.HttpContext;
        await Results.Problem(statusCode: context.Response.StatusCode).ExecuteAsync(context);
    }));
app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

// Health check endpoint
app.MapHealthChecks("/health", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains("ready") });

// Controllers
app.MapControllers();

// SignalR Hub mapping
app.MapHub<SupportHub>("/supporthub", options => options.CloseOnAuthenticationExpiration = true);

app.Run();
