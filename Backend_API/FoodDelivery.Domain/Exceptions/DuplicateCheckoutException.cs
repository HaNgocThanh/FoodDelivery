namespace FoodDelivery.Domain.Exceptions;

public sealed class DuplicateCheckoutException(Exception cause)
    : Exception("A checkout with this key already exists.", cause);
