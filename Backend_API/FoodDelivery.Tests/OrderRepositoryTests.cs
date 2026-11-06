using System.Data.Common;
using FoodDelivery.Infrastructure.Data;
using FoodDelivery.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace FoodDelivery.Tests;

public class OrderRepositoryTests
{
    [Fact]
    public async Task OraclePaymentUpdate_ContainsOwnerAmountMethodAndPendingGuards()
    {
        var capture = new CaptureCommand();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=test;Password=test;Data Source=localhost:1521/XEPDB1;")
            .AddInterceptors(capture).Options;
        await using var context = new AppDbContext(options);
        var result = await new OrderRepository(context).TryApproveOnlinePaymentAsync(50, 1, 140000);
        Assert.True(result);
        Assert.Contains("UPDATE", capture.Sql);
        Assert.Contains("WHERE", capture.Sql);
        Assert.Contains("\"UserId\"", capture.Sql);
        Assert.Contains("\"TotalAmount\"", capture.Sql);
        Assert.Contains("\"PaymentMethod\"", capture.Sql);
        Assert.Contains("\"Status\"", capture.Sql);
        Assert.Contains("Pending", capture.Parameters);
        Assert.Contains("\"OnlinePaymentConfirmedAt\"", capture.Sql);
        Assert.Contains("Online", capture.Parameters);
        Assert.Contains("Approved", capture.Parameters);
        Assert.Contains("\"PaymentExpiresAt\" > SYS_EXTRACT_UTC(SYSTIMESTAMP)", capture.Sql);
    }

    private sealed class CaptureCommand : DbCommandInterceptor, IDbConnectionInterceptor
    {
        public string Sql { get; private set; } = "";
        public object?[] Parameters { get; private set; } = [];
        public ValueTask<InterceptionResult> ConnectionOpeningAsync(DbConnection connection, ConnectionEventData eventData,
            InterceptionResult result, CancellationToken cancellationToken = default)
            => ValueTask.FromResult(InterceptionResult.Suppress());

        public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(DbCommand command, CommandEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            Sql = command.CommandText;
            Parameters = command.Parameters.Cast<DbParameter>().Select(parameter => parameter.Value).ToArray();
            return ValueTask.FromResult(InterceptionResult<int>.SuppressWithResult(1));
        }
    }
}
