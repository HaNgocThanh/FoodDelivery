namespace FoodDelivery.Application.DTOs.Review;

public record ReviewDto(
    int Id,
    int ProductId,
    int UserId,
    int? OrderId,
    int Rating,
    string Comment,
    DateTime CreatedAt
);
