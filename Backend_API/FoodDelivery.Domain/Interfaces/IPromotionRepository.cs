using FoodDelivery.Domain.Entities;

namespace FoodDelivery.Domain.Interfaces;

public interface IPromotionRepository : IGenericRepository<Promotion>
{
    Task<Promotion?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<Promotion?> GetByCodeWithLockAsync(string code, CancellationToken ct = default);
}
