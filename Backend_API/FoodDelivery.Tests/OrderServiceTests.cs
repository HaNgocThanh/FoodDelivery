using FoodDelivery.Application.DTOs.Order;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Application.Services;
using FoodDelivery.Application.Validators;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Enums;
using FoodDelivery.Domain.Exceptions;
using FoodDelivery.Domain.Interfaces;
using Moq;
using Xunit;

namespace FoodDelivery.Tests;

public class OrderServiceTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<IProductRepository> _products = new();
    private readonly Mock<IOrderRepository> _orders = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IPromotionRepository> _promotions = new();
    private readonly OrderService _service;
    private readonly Product _product = new() { Id = 7, Name = "Rau", Price = 100000m, StockQuantity = 10, IsAvailable = true };
    private readonly AppUser _user = new() { Id = 1, FullName = "Chủ tài khoản", PhoneNumber = "0901111111", Address1 = "Địa chỉ cũ", Email = "user@example.test", Tier = MembershipTier.Gold, LoyaltyPoints = 100 };

    public OrderServiceTests()
    {
        _uow.SetupGet(x => x.Products).Returns(_products.Object);
        _uow.SetupGet(x => x.Orders).Returns(_orders.Object);
        _uow.SetupGet(x => x.Users).Returns(_users.Object);
        _uow.SetupGet(x => x.Promotions).Returns(_promotions.Object);
        _products.Setup(x => x.GetManyWithLockAsync(It.IsAny<IEnumerable<int>>(), It.IsAny<CancellationToken>())).ReturnsAsync(new List<Product> { _product });
        _users.Setup(x => x.GetByIdAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(_user);
        _users.Setup(x => x.GetByIdWithLockAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(_user);
        _orders.Setup(x => x.AddAsync(It.IsAny<Order>(), It.IsAny<CancellationToken>())).Callback<Order, CancellationToken>((o, _) => o.Id = 50).Returns(Task.CompletedTask);
        _service = new OrderService(_uow.Object, Mock.Of<IEmailService>());
    }

    private static OrderRequestDTO Request(decimal expected = 140000m) => new(
        1, PaymentMethod.COD, null, false, 0, new() { new(7, 1) },
        "Người nhận mới", "0902222222", "Địa chỉ mới", "slot-b", "Gọi trước", true, 0, expected);

    [Theory]
    [InlineData(100000, 0, 140000, 25000)]
    [InlineData(100000, 20000, 160000, 25000)]
    [InlineData(300000, 0, 315000, 0)]
    [InlineData(299999, 0, 339999, 25000)]
    public async Task CreateOrder_PersistsRecipientAndAllCharges(decimal price, decimal tip, decimal total, decimal shipping)
    {
        _product.Price = price;
        Order? saved = null;
        _orders.Setup(x => x.AddAsync(It.IsAny<Order>(), It.IsAny<CancellationToken>())).Callback<Order, CancellationToken>((o, _) => { saved = o; o.Id = 50; }).Returns(Task.CompletedTask);
        var result = await _service.CreateOrderAsync(Request(total) with { TipAmount = tip });
        Assert.Equal(total, result.TotalAmount);
        Assert.Equal(shipping, result.ShippingFee);
        Assert.Equal(15000, result.ToteDeposit);
        Assert.Equal(tip, result.TipAmount);
        Assert.Equal("Người nhận mới", saved!.RecipientName);
        Assert.Equal("0902222222", saved.RecipientPhone);
        Assert.Equal("Địa chỉ mới", saved.DeliveryAddress);
        Assert.Equal("slot-b", saved.DeliverySlot);
        Assert.Equal("Gọi trước", saved.DeliveryNotes);
        Assert.True(saved.LeaveAtDoorstep);
        _uow.Verify(x => x.CommitTransactionAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ChangedPrice_RollsBackAndDoesNotSaveOrder()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateOrderAsync(Request(100000)));
        _orders.Verify(x => x.AddAsync(It.IsAny<Order>(), It.IsAny<CancellationToken>()), Times.Never);
        _uow.Verify(x => x.RollbackTransactionAsync(It.IsAny<CancellationToken>()), Times.Once);
        _uow.Verify(x => x.CommitTransactionAsync(It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CouponAndPoints_DiscountMerchandiseBeforeAddingFees()
    {
        _promotions.Setup(x => x.GetByCodeWithLockAsync("SALE", It.IsAny<CancellationToken>())).ReturnsAsync(new Promotion {
            Id = 1, Code = "SALE", IsActive = true, ExpiryDate = DateTime.UtcNow.AddDays(1), MaxUsage = 10,
            DiscountType = DiscountType.FixedAmount, DiscountValue = 20000m
        });
        var result = await _service.CreateOrderAsync(Request(112000) with { CouponCode = "SALE", UsePoints = true });
        Assert.Equal(8, result.PointsUsed);
        Assert.Equal(8000, result.PointDiscount);
        Assert.Equal(112000, result.TotalAmount);
    }

    [Theory]
    [InlineData("", "0902222222", "Địa chỉ mới", 0, 1)]
    [InlineData("Tên", "bad-phone", "Địa chỉ mới", 0, 1)]
    [InlineData("Tên", "0902222222", "", 0, 1)]
    [InlineData("Tên", "0902222222", "Địa chỉ mới", -1, 1)]
    [InlineData("Tên", "0902222222", "Địa chỉ mới", 0, -1)]
    public void Validator_RejectsInvalidCheckout(string name, string phone, string address, decimal tip, int quantity)
    {
        var request = Request() with { RecipientName = name, RecipientPhone = phone, DeliveryAddress = address, TipAmount = tip, Items = new() { new(7, quantity) } };
        Assert.False(new OrderRequestValidator().Validate(request).IsValid);
    }

    [Fact]
    public async Task Tracking_UsesOrderSnapshotAfterProfileChanges()
    {
        _orders.Setup(x => x.GetOrderWithDetailsAsync(50, It.IsAny<CancellationToken>())).ReturnsAsync(new Order {
            Id = 50, UserId = 1, RecipientName = "Người nhận mới", RecipientPhone = "0902222222", DeliveryAddress = "123 Đường mới, Quận 1, TP.HCM"
        });
        Assert.Null(await _service.TrackOrderAsync(50, _user.PhoneNumber));
        var result = await _service.TrackOrderAsync(50, "0902222222");
        Assert.NotNull(result);
        Assert.Equal("Người nhận mới", result.CustomerName);
    }

    [Theory]
    [InlineData(PaymentMethod.COD, OrderStatus.Pending)]
    [InlineData(PaymentMethod.Online, OrderStatus.Cancelled)]
    [InlineData(PaymentMethod.Online, OrderStatus.Completed)]
    public async Task PaymentUrl_RejectsIneligibleOrders(PaymentMethod method, OrderStatus status)
    {
        _orders.Setup(x => x.GetByIdAsync(50, It.IsAny<CancellationToken>())).ReturnsAsync(new Order { Id = 50, UserId = 1, PaymentMethod = method, Status = status });
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.GetPaymentAmountAsync(50, 1));
    }

    [Fact]
    public async Task PaymentUrl_RejectsOtherOwners()
    {
        _orders.Setup(x => x.GetByIdAsync(50, It.IsAny<CancellationToken>())).ReturnsAsync(new Order { Id = 50, UserId = 2 });
        await Assert.ThrowsAsync<NotFoundException>(() => _service.GetPaymentAmountAsync(50, 1));
    }

    [Theory]
    [InlineData(OrderStatus.Cancelled)]
    [InlineData(OrderStatus.Completed)]
    [InlineData(OrderStatus.Shipping)]
    public async Task ConfirmPayment_DoesNotRegressOrderState(OrderStatus status)
    {
        _orders.Setup(x => x.GetByIdAsync(50, It.IsAny<CancellationToken>())).ReturnsAsync(new Order { Id = 50, UserId = 1, PaymentMethod = PaymentMethod.Online, Status = status, TotalAmount = 140000 });
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.ConfirmMockPaymentAsync(50, 1, 140000));
        _orders.Verify(x => x.Update(It.IsAny<Order>()), Times.Never);
    }

    [Fact]
    public async Task ConfirmPayment_AlreadyApprovedIsIdempotent()
    {
        _orders.Setup(x => x.GetByIdAsync(50, It.IsAny<CancellationToken>())).ReturnsAsync(new Order { Id = 50, UserId = 1, PaymentMethod = PaymentMethod.Online, Status = OrderStatus.Approved, TotalAmount = 140000 });
        await _service.ConfirmMockPaymentAsync(50, 1, 140000);
        _orders.Verify(x => x.Update(It.IsAny<Order>()), Times.Never);
    }

    [Fact]
    public async Task CancelOrder_RejectsApprovedStateReadUnderLock()
    {
        _orders.Setup(x => x.GetOrderWithDetailsForUpdateAsync(50, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Order { Id = 50, UserId = 1, Status = OrderStatus.Approved });
        await Assert.ThrowsAsync<InvalidOperationException>(() => _service.CancelUserOrderAsync(50, 1));
        _orders.Verify(x => x.Update(It.IsAny<Order>()), Times.Never);
        _uow.Verify(x => x.RollbackTransactionAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ConfirmPayment_UsesAtomicConditionalUpdate()
    {
        _orders.Setup(x => x.TryApproveOnlinePaymentAsync(50, 1, 140000, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        await _service.ConfirmMockPaymentAsync(50, 1, 140000);
        _orders.Verify(x => x.GetByIdAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
