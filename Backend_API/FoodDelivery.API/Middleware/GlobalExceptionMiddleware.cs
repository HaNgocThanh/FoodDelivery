using System.Net;
using System.Text.Json;
using FoodDelivery.Domain.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace FoodDelivery.API.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var problemDetails = new ProblemDetails
        {
            Instance = context.Request.Path
        };

        switch (exception)
        {
            case InsufficientStockException ex:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest; // HTTP 400
                problemDetails.Status = (int)HttpStatusCode.BadRequest;
                problemDetails.Title = "Không đủ số lượng tồn kho";
                problemDetails.Detail = ex.Message;
                _logger.LogWarning(ex, "Lỗi tồn kho: {Message}", ex.Message);
                break;

            case NotFoundException ex:
                context.Response.StatusCode = (int)HttpStatusCode.NotFound; // HTTP 404
                problemDetails.Status = (int)HttpStatusCode.NotFound;
                problemDetails.Title = "Không tìm thấy dữ liệu";
                problemDetails.Detail = ex.Message;
                _logger.LogWarning(ex, "Không tìm thấy: {Message}", ex.Message);
                break;

            case ForbiddenException ex:
                context.Response.StatusCode = (int)HttpStatusCode.Forbidden; // HTTP 403
                problemDetails.Status = (int)HttpStatusCode.Forbidden;
                problemDetails.Title = "Bị từ chối truy cập";
                problemDetails.Detail = ex.Message;
                _logger.LogWarning(ex, "Từ chối truy cập: {Message}", ex.Message);
                break;

            case ArgumentException ex:
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest; // HTTP 400
                problemDetails.Status = (int)HttpStatusCode.BadRequest;
                problemDetails.Title = "Dữ liệu không hợp lệ";
                problemDetails.Detail = ex.Message;
                _logger.LogWarning(ex, "Dữ liệu không hợp lệ: {Message}", ex.Message);
                break;

            default:
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError; // HTTP 500
                problemDetails.Status = (int)HttpStatusCode.InternalServerError;
                problemDetails.Title = "Lỗi hệ thống nội bộ";
                problemDetails.Detail = "Đã xảy ra lỗi không mong muốn từ hệ thống. Vui lòng thử lại sau.";
                _logger.LogError(exception, "Lỗi không xử lý được (Unhandled Exception): {Message}", exception.Message);
                break;
        }

        var json = JsonSerializer.Serialize(problemDetails, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}

public static class GlobalExceptionMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionMiddleware(this IApplicationBuilder app)
    {
        return app.UseMiddleware<GlobalExceptionMiddleware>();
    }
}
