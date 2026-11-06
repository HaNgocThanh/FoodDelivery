using FoodDelivery.Application.DTOs.Order;
using FoodDelivery.Application.DTOs.Review;
using FoodDelivery.Application.DTOs.User;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Application.Services;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Enums;
using FoodDelivery.Domain.Exceptions;
using FoodDelivery.Infrastructure.Data;
using FoodDelivery.Infrastructure.Repositories;
using FoodDelivery.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Oracle.ManagedDataAccess.Client;
using Xunit;

namespace FoodDelivery.Tests;

public class OracleConcurrencyTests
{
    private const string ConnectionVariable = "FOODDELIVERY_ORACLE_CONCURRENCY_TEST";

    public sealed class LocalOracleFactAttribute : FactAttribute
    {
        public LocalOracleFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(ConnectionVariable)))
                Skip = "Requires an explicitly configured local Oracle test database.";
        }
    }

    [LocalOracleFact]
    public async Task ConcurrentRestocksAddBothDeltasAndCheckoutDetectsTheLock()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(35));
        var ct = timeout.Token;
        await using var fixture = await Fixture.CreateAsync(ct);
        using var first = CreateUnitOfWork(OpenContext());
        using var checkout = CreateUnitOfWork(OpenContext());
        using var second = CreateUnitOfWork(OpenContext());

        await first.BeginTransactionAsync(ct);
        await first.Products.GetByIdWithLockAsync(fixture.ProductId, ct);

        await checkout.BeginTransactionAsync(ct);
        var conflict = await Assert.ThrowsAsync<OracleException>(() =>
            checkout.Products.GetManyWithLockAsync([fixture.ProductId], ct));
        Assert.Equal(54, conflict.Number);
        await checkout.RollbackTransactionAsync(CancellationToken.None);

        var waiting = ProductServiceFor(second).RestockAsync(fixture.ProductId, 4, ct);
        await Task.Delay(120, ct);
        Assert.False(waiting.IsCompleted);
        await ProductServiceFor(first).RestockAsync(fixture.ProductId, 2, ct);
        await waiting;

        await using var read = OpenContext();
        Assert.Equal(9, await read.Products.Where(product => product.Id == fixture.ProductId)
            .Select(product => product.StockQuantity).SingleAsync(ct));
    }

    [LocalOracleFact]
    public async Task ConcurrentReviewsAwardOneCreditPerOrderAndRejectStaleAdminBalance()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(35));
        var ct = timeout.Token;
        await using var fixture = await Fixture.CreateAsync(ct);
        using var first = CreateUnitOfWork(OpenContext());
        using var duplicate = CreateUnitOfWork(OpenContext());
        using var other = CreateUnitOfWork(OpenContext());

        await first.BeginTransactionAsync(ct);
        await first.Orders.GetOrderWithDetailsForUpdateAsync(fixture.FirstOrderId, ct);
        await first.Users.GetByIdWithLockAsync(fixture.UserId, ct);

        var firstReview = fixture.ReviewFor(fixture.FirstOrderId);
        var duplicateTask = new ReviewService(duplicate).CreateReviewAsync(firstReview, fixture.UserId, ct);
        var otherTask = new ReviewService(other).CreateReviewAsync(fixture.ReviewFor(fixture.OtherOrderId), fixture.UserId, ct);
        await Task.Delay(120, ct);
        Assert.False(duplicateTask.IsCompleted);
        Assert.False(otherTask.IsCompleted);

        await new ReviewService(first).CreateReviewAsync(firstReview, fixture.UserId, ct);
        await Assert.ThrowsAsync<BusinessRuleException>(() => duplicateTask);
        await otherTask;

        await using var read = OpenContext();
        Assert.Equal(2, await read.Reviews.CountAsync(review => review.UserId == fixture.UserId, ct));
        var users = new UserService(read);
        var staleEdit = new UpdateUserByAdminDTO
        {
            FullName = "Oracle fixture",
            Email = fixture.Email,
            PhoneNumber = "0900000000",
            Address1 = "Fixture",
            Role = "Customer",
            ExpectedLoyaltyPoints = 100,
            LoyaltyPoints = 110
        };

        await Assert.ThrowsAsync<ConcurrentWriteException>(() => users.UpdateUserByAdminAsync(fixture.UserId, staleEdit, ct));
        staleEdit.LoyaltyPoints = 100; // The admin did not edit the balance.
        await users.UpdateUserByAdminAsync(fixture.UserId, staleEdit, ct);
        Assert.Equal(120, await read.AppUsers.Where(user => user.Id == fixture.UserId)
            .Select(user => user.LoyaltyPoints).SingleAsync(ct));
    }

    [LocalOracleFact]
    public async Task PromotionLockMakesLastUseVisibleToSecondTransaction()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(35));
        var ct = timeout.Token;
        await using var setup = OpenContext();
        var promotion = new Promotion
        {
            Code = "TEST-" + Guid.NewGuid().ToString("N"),
            DiscountType = DiscountType.FixedAmount,
            DiscountValue = 1000, MaxUsage = 1, IsActive = true, ExpiryDate = DateTime.UtcNow.AddDays(1)
        };
        setup.Promotions.Add(promotion);
        await setup.SaveChangesAsync(ct);
        try
        {
            using var first = CreateUnitOfWork(OpenContext());
            using var second = CreateUnitOfWork(OpenContext());
            await first.BeginTransactionAsync(ct);
            await second.BeginTransactionAsync(ct);
            var available = await first.Promotions.GetByCodeWithLockAsync(promotion.Code, ct);
            Assert.NotNull(available);
            Assert.Equal(0, available.CurrentUsage);

            var waiting = second.Promotions.GetByCodeWithLockAsync(promotion.Code, ct);
            await Task.Delay(120, ct);
            Assert.False(waiting.IsCompleted);

            available.CurrentUsage++;
            await first.CommitTransactionAsync(ct);
            var exhausted = await waiting;
            Assert.NotNull(exhausted);
            Assert.Equal(exhausted.MaxUsage, exhausted.CurrentUsage);
            await second.RollbackTransactionAsync(CancellationToken.None);
        }
        finally
        {
            await using var cleanup = OpenContext();
            await cleanup.Promotions.Where(row => row.Id == promotion.Id).ExecuteDeleteAsync();
        }
    }

    [LocalOracleFact]
    public async Task CheckoutReplayUsesSameOrderAndUniqueConstraintRejectsDuplicate()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(35));
        var ct = timeout.Token;
        await using var fixture = await Fixture.CreateAsync(ct);
        using var first = CreateUnitOfWork(OpenContext());
        using var second = CreateUnitOfWork(OpenContext());
        var key = Guid.NewGuid();
        var request = CheckoutRequest(fixture, PaymentMethod.COD);
        var created = await new OrderService(first, Mock.Of<IEmailService>()).CreateOrderAsync(request, ct, key);

        var replayService = new OrderService(second, Mock.Of<IEmailService>());
        var replay = await replayService.CreateOrderAsync(request with { ExpectedTotalAmount = 42000 }, ct, key);
        Assert.Equal(created.Id, replay.Id);
        Assert.Equal(41000, replay.TotalAmount);
        await Assert.ThrowsAsync<ConcurrentWriteException>(() =>
            replayService.CreateOrderAsync(request with { DeliveryAddress = "Different address" }, ct, key));

        await using var read = OpenContext();
        var stored = await read.Orders.AsNoTracking().SingleAsync(order => order.Id == created.Id, ct);
        Assert.Equal(2, await read.Products.Where(product => product.Id == fixture.ProductId)
            .Select(product => product.StockQuantity).SingleAsync(ct));

        using var collision = CreateUnitOfWork(OpenContext());
        await collision.BeginTransactionAsync(ct);
        await collision.Orders.AddAsync(new Order
        {
            UserId = fixture.UserId, PaymentMethod = PaymentMethod.COD, Status = OrderStatus.Pending,
            OrderDate = DateTime.UtcNow, CheckoutRequestId = stored.CheckoutRequestId,
            CheckoutFingerprint = stored.CheckoutFingerprint
        }, ct);
        await Assert.ThrowsAsync<DuplicateCheckoutException>(() => collision.CommitTransactionAsync(ct));
    }

    [LocalOracleFact]
    public async Task ExpiredOnlineOrderCannotBePaidAndRestoresInventoryOnce()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(35));
        var ct = timeout.Token;
        await using var fixture = await Fixture.CreateAsync(ct);
        using var first = CreateUnitOfWork(OpenContext());
        var createService = new OrderService(first, Mock.Of<IEmailService>());
        var request = CheckoutRequest(fixture, PaymentMethod.Online);
        await Assert.ThrowsAsync<ArgumentException>(() => createService.CreateOrderAsync(request, ct, Guid.NewGuid()));
        var created = await createService.CreateOrderAsync(request, ct, Guid.NewGuid(), onlineEnabled: true);
        Assert.NotNull(created.PaymentExpiresAt);

        await using var read = OpenContext();
        var oldTime = DateTime.UtcNow.AddMinutes(-1);
        await read.Orders.Where(order => order.Id == created.Id).ExecuteUpdateAsync(
            setters => setters.SetProperty(order => order.PaymentExpiresAt, oldTime), ct);

        using var worker = CreateUnitOfWork(OpenContext());
        var service = new OrderService(worker, Mock.Of<IEmailService>());
        Assert.Contains(created.Id, await service.GetExpiredPaymentOrdersAsync(ct));
        await Assert.ThrowsAsync<BusinessRuleException>(() =>
            service.ConfirmMockPaymentAsync(created.Id, fixture.UserId, created.TotalAmount, ct));
        // A fresh scope is used by the hosted worker for each attempt.
        using var expiry = CreateUnitOfWork(OpenContext());
        Assert.True(await new OrderService(expiry, Mock.Of<IEmailService>()).ExpirePendingPaymentAsync(created.Id, ct));
        using var retry = CreateUnitOfWork(OpenContext());
        Assert.False(await new OrderService(retry, Mock.Of<IEmailService>()).ExpirePendingPaymentAsync(created.Id, ct));
        Assert.Equal(3, await read.Products.Where(product => product.Id == fixture.ProductId)
            .Select(product => product.StockQuantity).SingleAsync(ct));
        Assert.Equal(OrderStatus.Cancelled, await read.Orders.Where(order => order.Id == created.Id)
            .Select(order => order.Status).SingleAsync(ct));
    }

    [LocalOracleFact]
    public async Task FreshOnlineOrderCanBeConfirmedAndRetriedOnOracle()
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(35));
        var ct = timeout.Token;
        await using var fixture = await Fixture.CreateAsync(ct);
        using var checkout = CreateUnitOfWork(OpenContext());
        var order = await new OrderService(checkout, Mock.Of<IEmailService>())
            .CreateOrderAsync(CheckoutRequest(fixture, PaymentMethod.Online), ct, Guid.NewGuid(), onlineEnabled: true);

        using var payment = CreateUnitOfWork(OpenContext());
        var service = new OrderService(payment, Mock.Of<IEmailService>());
        await service.ConfirmMockPaymentAsync(order.Id, fixture.UserId, order.TotalAmount, ct);
        await service.ConfirmMockPaymentAsync(order.Id, fixture.UserId, order.TotalAmount, ct);

        await using var db = OpenContext();
        var paid = await db.Orders.AsNoTracking().SingleAsync(candidate => candidate.Id == order.Id, ct);
        Assert.Equal(OrderStatus.Approved, paid.Status);
        Assert.InRange(paid.OnlinePaymentConfirmedAt!.Value, order.OrderDate.AddSeconds(-1), paid.PaymentExpiresAt!.Value);
    }

    private static OrderRequestDTO CheckoutRequest(Fixture fixture, PaymentMethod method) =>
        new(fixture.UserId, method, null, false, 0, [new(fixture.ProductId, 1)], "Fixture buyer",
            "0900000000", "Fixture address", "slot-a", null, false, 0, 41000);

    private static ProductService ProductServiceFor(UnitOfWork unit) =>
        new(unit, Mock.Of<IImageService>(), NullLogger<ProductService>.Instance);

    private static UnitOfWork CreateUnitOfWork(AppDbContext db) =>
        new(db, new ProductRepository(db), new OrderRepository(db), new PromotionRepository(db),
            new CategoryRepository(db), new UserRepository(db), new ReviewRepository(db));

    private static AppDbContext OpenContext()
    {
        var connection = new OracleConnectionStringBuilder(Environment.GetEnvironmentVariable(ConnectionVariable));
        if (!Uri.TryCreate("oracle://" + connection.DataSource, UriKind.Absolute, out var endpoint) || !endpoint.IsLoopback)
            throw new InvalidOperationException("The Oracle concurrency tests require a loopback database.");

        return new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseOracle(connection.ConnectionString).Options);
    }

    private sealed record Fixture(int ProductId, int UserId, int CategoryId, int FirstOrderId, int OtherOrderId, string Email)
        : IAsyncDisposable
    {
        public static async Task<Fixture> CreateAsync(CancellationToken ct)
        {
            await using var db = OpenContext();
            var tag = Guid.NewGuid().ToString("N");
            var category = new Category { Name = "Oracle fixture " + tag };
            var product = new Product
            {
                Category = category, Name = "Oracle fixture " + tag, Price = 1000, StockQuantity = 3, IsAvailable = true
            };
            var user = new AppUser
            {
                FullName = "Oracle fixture", Email = tag + "@example.invalid",
                PhoneNumber = "0900000000", Address1 = "Fixture", LoyaltyPoints = 100
            };
            Order CreateOrder() => new()
            {
                User = user, OrderDate = DateTime.UtcNow, Status = OrderStatus.Completed,
                PaymentMethod = PaymentMethod.COD, TotalAmount = 1000, SubTotal = 1000,
                OrderDetails = [new OrderDetail { Product = product, Quantity = 1, UnitPrice = 1000 }]
            };

            var first = CreateOrder();
            var other = CreateOrder();
            db.Orders.AddRange(first, other);
            await db.SaveChangesAsync(ct);
            return new Fixture(product.Id, user.Id, category.Id, first.Id, other.Id, user.Email);
        }

        public CreateReviewRequest ReviewFor(int orderId) =>
            new() { OrderId = orderId, ProductId = ProductId, Rating = 5, Comment = "Oracle fixture review" };

        public async ValueTask DisposeAsync()
        {
            await using var db = OpenContext();
            await using var tx = await db.Database.BeginTransactionAsync();
            await db.Reviews.Where(review => review.UserId == UserId).ExecuteDeleteAsync();
            var orders = await db.Orders.Where(order => order.UserId == UserId).Select(order => order.Id).ToArrayAsync();
            await db.OrderDetails.Where(detail => orders.Contains(detail.OrderId)).ExecuteDeleteAsync();
            await db.Orders.Where(order => order.UserId == UserId).ExecuteDeleteAsync();
            await db.AppUsers.Where(user => user.Id == UserId).ExecuteDeleteAsync();
            await db.Products.Where(product => product.Id == ProductId).ExecuteDeleteAsync();
            await db.Categories.Where(category => category.Id == CategoryId).ExecuteDeleteAsync();
            await tx.CommitAsync();
        }
    }
}
