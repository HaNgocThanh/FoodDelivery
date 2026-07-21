using FoodDelivery.Application.DTOs.Category;

namespace FoodDelivery.Application.Interfaces;

public interface ICategoryService
{
    Task<IEnumerable<CategoryResponseDTO>> GetAllCategoriesAsync(CancellationToken ct = default);
}
