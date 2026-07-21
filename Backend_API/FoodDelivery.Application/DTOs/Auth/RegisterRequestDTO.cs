namespace FoodDelivery.Application.DTOs.Auth;

public record RegisterRequestDTO(
    string FullName,
    string Email,
    string Password,
    string PhoneNumber,
    string Address1,
    string? Address2,
    string Role = "Customer"
);
