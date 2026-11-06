namespace FoodDelivery.Domain.Exceptions;

public sealed class BusinessRuleException(string message) : InvalidOperationException(message);
