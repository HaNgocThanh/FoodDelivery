using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Interfaces;
using FoodDelivery.Infrastructure.Data;

namespace FoodDelivery.Infrastructure.Repositories;

public class CategoryRepository : GenericRepository<Category>, ICategoryRepository
{
    public CategoryRepository(AppDbContext context) : base(context)
    {
    }
}
