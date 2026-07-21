using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Interfaces;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Oracle.ManagedDataAccess.Client;

namespace FoodDelivery.Infrastructure.Repositories;

public class ProductRepository : GenericRepository<Product>, IProductRepository
{
    public ProductRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<bool> CheckStockAsync(int productId, int requestedQuantity, CancellationToken ct = default)
    {
        var product = await _dbSet.AsNoTracking().FirstOrDefaultAsync(p => p.Id == productId, ct);
        if (product == null) return false;

        return product.IsAvailable && product.StockQuantity >= requestedQuantity;
    }

    public async Task<bool> DeductStockAsync(int productId, int quantity, CancellationToken ct = default)
    {
        var product = await _dbSet.FirstOrDefaultAsync(p => p.Id == productId, ct);
        if (product == null || product.StockQuantity < quantity)
            return false;

        product.StockQuantity -= quantity;
        if (product.StockQuantity == 0)
        {
            product.IsAvailable = false;
        }

        _dbSet.Update(product);
        return true;
    }

    public async Task<Product?> GetByIdWithLockAsync(int productId, CancellationToken ct = default)
    {
        // Oracle SELECT ... FOR UPDATE NOWAIT khóa dòng dữ liệu chống overselling
        var products = await _dbSet
            .FromSqlRaw("SELECT * FROM \"Products\" WHERE \"Id\" = :p0 FOR UPDATE NOWAIT", productId)
            .AsTracking()
            .ToListAsync(ct);

        return products.FirstOrDefault();
    }

    public async Task<List<Product>> GetManyWithLockAsync(IEnumerable<int> productIds, CancellationToken ct = default)
    {
        // Sắp xếp IDs trước khi LOCK để ngăn chặn Deadlock
        var sortedIds = productIds.Distinct().OrderBy(id => id).ToList();
        if (!sortedIds.Any()) return new List<Product>();

        var idList = string.Join(",", sortedIds);
        var sql = $"SELECT * FROM \"Products\" WHERE \"Id\" IN ({idList}) ORDER BY \"Id\" FOR UPDATE NOWAIT";

        return await _dbSet
            .FromSqlRaw(sql)
            .AsTracking()
            .ToListAsync(ct);
    }
}
