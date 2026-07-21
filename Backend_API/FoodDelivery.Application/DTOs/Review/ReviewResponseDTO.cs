namespace FoodDelivery.Application.DTOs.Review;

public record ReviewResponseDTO(
    int Id,
    int UserId,
    string UserName,
    int Rating,
    string Comment,
    DateTime CreatedAt
);
