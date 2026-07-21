using FoodDelivery.Application.DTOs.Category;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Interfaces;

namespace FoodDelivery.Application.Services;

public class CategoryService : ICategoryService
{
    private readonly IUnitOfWork _unitOfWork;

    public CategoryService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<CategoryResponseDTO>> GetAllCategoriesAsync(CancellationToken ct = default)
    {
        var categories = await _unitOfWork.Categories.GetAllAsync(ct);
        return categories.Select(c => new CategoryResponseDTO(c.Id, c.Name, c.Description));
    }
}
