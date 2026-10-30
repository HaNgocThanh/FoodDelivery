using FluentValidation;
using FoodDelivery.Application.DTOs.Order;

namespace FoodDelivery.Application.Validators;

public class OrderRequestValidator : AbstractValidator<OrderRequestDTO>
{
    public OrderRequestValidator()
    {
        RuleFor(x => x.UserId).GreaterThan(0);
        RuleFor(x => x.PaymentMethod).IsInEnum();
        RuleFor(x => x.RecipientName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.RecipientPhone).NotEmpty().MaximumLength(20)
            .Matches(@"^\+?[0-9][0-9 .()\-]{6,19}$");
        RuleFor(x => x.DeliveryAddress).NotEmpty().MaximumLength(1000);
        RuleFor(x => x.DeliverySlot).Must(x => x is "slot-a" or "slot-b" or "slot-c");
        RuleFor(x => x.DeliveryNotes).MaximumLength(500);
        RuleFor(x => x.TipAmount).InclusiveBetween(0m, 1000000m).PrecisionScale(18, 2, true);
        RuleFor(x => x.ExpectedTotalAmount).GreaterThanOrEqualTo(0m).PrecisionScale(18, 2, true);
        RuleFor(x => x.Items).NotEmpty();
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(x => x.ProductId).GreaterThan(0);
            item.RuleFor(x => x.Quantity).GreaterThan(0);
        });
        RuleFor(x => x.Items).Must(items => items == null || items.Select(i => i.ProductId).Distinct().Count() == items.Count)
            .WithMessage("Mỗi sản phẩm chỉ được xuất hiện một lần trong đơn hàng.");
    }
}
