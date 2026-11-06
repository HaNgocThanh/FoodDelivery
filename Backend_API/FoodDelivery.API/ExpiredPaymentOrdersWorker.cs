using FoodDelivery.Application.Interfaces;

namespace FoodDelivery.API;

public sealed class ExpiredPaymentOrdersWorker(
    IServiceScopeFactory scopes,
    ILogger<ExpiredPaymentOrdersWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var readScope = scopes.CreateAsyncScope();
                var orders = readScope.ServiceProvider.GetRequiredService<IOrderService>();
                var due = await orders.GetExpiredPaymentOrdersAsync(stoppingToken);
                foreach (var orderId in due)
                {
                    try
                    {
                        await using var scope = scopes.CreateAsyncScope();
                        var service = scope.ServiceProvider.GetRequiredService<IOrderService>();
                        await service.ExpirePendingPaymentAsync(orderId, stoppingToken);
                    }
                    catch (Exception error) when (!stoppingToken.IsCancellationRequested)
                    {
                        logger.LogWarning(error, "Could not expire order {OrderId}; will retry.", orderId);
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception error)
            {
                logger.LogWarning(error, "Could not read expired payment orders.");
            }
        }
    }
}
