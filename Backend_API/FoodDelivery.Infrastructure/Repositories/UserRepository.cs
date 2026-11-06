using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Interfaces;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Repositories;

public class UserRepository : GenericRepository<AppUser>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<AppUser?> GetByIdWithLockAsync(int userId, CancellationToken ct = default)
    {
        var rows = await _dbSet.FromSqlInterpolated($"SELECT * FROM \"AppUsers\" WHERE \"Id\" = {userId} FOR UPDATE")
            .AsTracking().ToListAsync(ct);
        return rows.SingleOrDefault();
    }
}
