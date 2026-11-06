using FoodDelivery.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using Oracle.ManagedDataAccess.Client;

namespace FoodDelivery.API.Middleware;

public class GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // The client has disconnected.
        }
        catch (Exception ex) when (!context.Response.HasStarted)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (status, title, detail) = exception switch
        {
            ConcurrentWriteException ex => (409, "Dữ liệu đã thay đổi", ex.Message),
            OracleException { Number: 54 or 60 or 30006 }
                or DbUpdateException { InnerException: OracleException { Number: 54 or 60 or 30006 } } =>
                (409, "Dữ liệu đang được cập nhật", "Vui lòng tải lại dữ liệu và thử lại."),
            InsufficientStockException ex => (409, "Không đủ số lượng tồn kho", ex.Message),
            NotFoundException ex => (404, "Không tìm thấy dữ liệu", ex.Message),
            ForbiddenException ex => (403, "Bị từ chối truy cập", ex.Message),
            BusinessRuleException ex => (400, "Thao tác không hợp lệ", ex.Message),
            ArgumentException ex => (400, "Dữ liệu không hợp lệ", ex.Message),
            _ => (500, "Lỗi hệ thống nội bộ", "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.")
        };

        if (status == StatusCodes.Status500InternalServerError)
            logger.LogError(exception, "Lỗi API không xử lý được. Trace ID: {TraceId}", context.TraceIdentifier);

        context.Response.Clear();
        await Results.Problem(statusCode: status, title: title, detail: detail).ExecuteAsync(context);
    }
}

public static class GlobalExceptionMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionMiddleware(this IApplicationBuilder app) =>
        app.UseMiddleware<GlobalExceptionMiddleware>();
}
