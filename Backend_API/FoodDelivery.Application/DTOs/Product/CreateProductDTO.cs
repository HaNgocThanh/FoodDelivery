namespace FoodDelivery.Application.DTOs.Product;

public record CreateProductDTO(
    int CategoryId,
    string Name,
    string? Description,
    decimal Price,
    int StockQuantity,
    string? Origin,
    bool IsHot
);
