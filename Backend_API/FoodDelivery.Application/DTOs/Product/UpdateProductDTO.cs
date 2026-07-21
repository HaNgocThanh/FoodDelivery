namespace FoodDelivery.Application.DTOs.Product;

public record UpdateProductDTO(
    string Name,
    string? Description,
    decimal Price,
    string? Origin,
    bool IsHot,
    bool IsAvailable
);
