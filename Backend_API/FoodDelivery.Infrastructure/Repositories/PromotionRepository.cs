using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Interfaces;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Repositories;

public class PromotionRepository : GenericRepository<Promotion>, IPromotionRepository
{
    public PromotionRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Promotion?> GetByCodeAsync(string code, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;

        var normalizedCode = code.Trim().ToUpper();
        return await _dbSet.FirstOrDefaultAsync(p => p.Code.ToUpper() == normalizedCode, ct);
    }

    public async Task<Promotion?> GetByIdWithLockAsync(int id, CancellationToken ct = default)
    {
        var rows = await _dbSet.FromSqlInterpolated($"SELECT * FROM \"Promotions\" WHERE \"Id\" = {id} FOR UPDATE")
            .AsTracking().ToListAsync(ct);
        return rows.SingleOrDefault();
    }

    public async Task<Promotion?> GetByCodeWithLockAsync(string code, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;

        var normalizedCode = code.Trim().ToUpper();
        var rows = await _dbSet.FromSqlInterpolated(
                $"SELECT * FROM \"Promotions\" WHERE UPPER(\"Code\") = {normalizedCode} FOR UPDATE")
            .AsTracking().ToListAsync(ct);
        return rows.FirstOrDefault();
    }
}
