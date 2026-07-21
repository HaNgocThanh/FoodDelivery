namespace FoodDelivery.Application.DTOs.Auth;

public record AuthResponseDTO(
    string Token,
    int UserId,
    string FullName,
    string Email,
    string Role,
    DateTime ExpiresAt
);
