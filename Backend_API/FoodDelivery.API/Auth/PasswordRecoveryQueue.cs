using System.Threading.Channels;
using FoodDelivery.Infrastructure.Services;

namespace FoodDelivery.API.Auth;

public sealed class PasswordRecoveryQueue(IServiceScopeFactory scopes, ILogger<PasswordRecoveryQueue> logger)
    : BackgroundService
{
    private readonly Channel<string> _requests = Channel.CreateBounded<string>(
        new BoundedChannelOptions(64) { SingleReader = true });

    public bool TryEnqueue(string email) => _requests.Writer.TryWrite(email);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var address in _requests.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var recovery = scope.ServiceProvider.GetRequiredService<PasswordRecoveryService>();
                await recovery.SendCodeAsync(address, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception error)
            {
                logger.LogWarning("Password recovery delivery failed ({ErrorType}).", error.GetType().Name);
            }
        }
    }
}
