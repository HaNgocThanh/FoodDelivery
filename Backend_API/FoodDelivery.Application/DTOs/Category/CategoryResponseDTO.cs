namespace FoodDelivery.Application.DTOs.Category;

public record CategoryResponseDTO(
    int Id,
    string Name,
    string? Description
);
