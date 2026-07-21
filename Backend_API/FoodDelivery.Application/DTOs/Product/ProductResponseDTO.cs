namespace FoodDelivery.Application.DTOs.Product;

public record ProductResponseDTO(
    int Id,
    int CategoryId,
    string? CategoryName,
    string Name,
    string? Description,
    decimal Price,
    int StockQuantity,
    string? Origin,
    bool IsHot,
    bool IsAvailable
);
