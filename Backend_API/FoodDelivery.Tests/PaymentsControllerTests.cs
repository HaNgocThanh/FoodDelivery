using System.Security.Claims;
using System.Text.Json;
using FoodDelivery.API.Controllers;
using FoodDelivery.Application.Interfaces;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace FoodDelivery.Tests;

public class PaymentsControllerTests
{
    private readonly Mock<IOrderService> _orders = new();
    private readonly IDataProtectionProvider _protection = new EphemeralDataProtectionProvider();

    private PaymentsController Controller(string environment = "Development", int userId = 1)
    {
        var env = Mock.Of<IWebHostEnvironment>(e => e.EnvironmentName == environment);
        return new PaymentsController(_orders.Object, env, _protection, new ConfigurationBuilder().Build()) {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, userId.ToString()) }, "test"))
            }}
        };
    }

    private string Ticket(int order = 50, int user = 1, int minutes = 15) => _protection.CreateProtector("FoodDelivery.MockPayment.v1")
        .Protect(JsonSerializer.Serialize(new MockPaymentTicket(order, user, 140000, DateTimeOffset.UtcNow.AddMinutes(minutes))));

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public async Task MockEndpoints_AreDisabledOutsideDevelopment(string environment)
    {
        var controller = Controller(environment);
        Assert.IsType<NotFoundResult>(await controller.GetMockPaymentUrl(new(50), default));
        Assert.IsType<NotFoundResult>(await controller.ConfirmMockPayment(new(50, Ticket()), default));
        _orders.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task MockUrl_UsesAmountFromServerAndCreatesProtectedResult()
    {
        _orders.Setup(x => x.GetPaymentAmountAsync(50, 1, default)).ReturnsAsync(140000);
        var result = Assert.IsType<OkObjectResult>(await Controller().GetMockPaymentUrl(new(50), default));
        var response = Assert.IsType<MockPaymentResponseDTO>(result.Value);
        Assert.Contains("paymentToken=", response.PayUrl);
        Assert.Contains("orderId=50", response.PayUrl);
    }

    [Theory]
    [InlineData(50, 2, 15)]
    [InlineData(50, 1, -1)]
    [InlineData(51, 1, 15)]
    public async Task Confirm_RejectsWrongUserExpiredOrMismatchedOrder(int order, int user, int minutes)
    {
        Assert.IsType<BadRequestObjectResult>(await Controller().ConfirmMockPayment(new(50, Ticket(order, user, minutes)), default));
        _orders.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Confirm_RejectsForgedToken()
    {
        Assert.IsType<BadRequestObjectResult>(await Controller().ConfirmMockPayment(new(50, "forged-token"), default));
        _orders.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Confirm_UsesVerifiedOrderUserAndAmount()
    {
        Assert.IsType<OkObjectResult>(await Controller().ConfirmMockPayment(new(50, Ticket()), default));
        _orders.Verify(x => x.ConfirmMockPaymentAsync(50, 1, 140000, default), Times.Once);
    }

    [Fact]
    public void LegacyPaySuccess_DoesNotChangeOrder()
    {
        var result = Assert.IsType<ObjectResult>(new OrdersController(_orders.Object).PaySuccess(50));
        Assert.Equal(410, result.StatusCode);
        _orders.VerifyNoOtherCalls();
    }
}
