using FoodDelivery.Domain.Entities;

namespace FoodDelivery.Domain.Interfaces;

public interface IUserRepository : IGenericRepository<AppUser>
{
    /// <summary>
    /// Lấy User theo ID trong transaction với row-level lock (SELECT ... FOR UPDATE).
    /// Dùng khi cần trừ điểm tích lũy để chống race condition.
    /// </summary>
    Task<AppUser?> GetByIdWithLockAsync(int userId, CancellationToken ct = default);
}
