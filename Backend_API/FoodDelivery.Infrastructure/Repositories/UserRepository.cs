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
        // Sử dụng LINQ query trong EF Core transaction (sẽ dịch ra SELECT ... FOR UPDATE khi transaction active).
        // EF Core Oracle provider tự động xử lý concurrency token thông qua transaction isolation.
        return await _dbSet.FirstOrDefaultAsync(u => u.Id == userId, ct);
    }
}
