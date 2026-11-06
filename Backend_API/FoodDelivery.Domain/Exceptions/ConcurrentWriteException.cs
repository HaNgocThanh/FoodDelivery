namespace FoodDelivery.Domain.Exceptions;

public sealed class ConcurrentWriteException(string message) : Exception(message);
