using FoodDelivery.Domain.Entities;

namespace FoodDelivery.Domain.Interfaces;

public interface IProductRepository : IGenericRepository<Product>
{
    Task<bool> CheckStockAsync(int productId, int requestedQuantity, CancellationToken ct = default);
    Task<bool> DeductStockAsync(int productId, int quantity, CancellationToken ct = default);
    Task<Product?> GetByIdWithLockAsync(int productId, CancellationToken ct = default);
    Task<List<Product>> GetManyWithLockAsync(IEnumerable<int> productIds, CancellationToken ct = default);
}
