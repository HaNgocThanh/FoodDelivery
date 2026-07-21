using FoodDelivery.Domain.Entities;

namespace FoodDelivery.Domain.Interfaces;

public interface IReviewRepository : IGenericRepository<Review>
{
    Task<bool> HasUserPurchasedProductAsync(int userId, int productId, CancellationToken ct = default);
    Task<List<Review>> GetProductReviewsAsync(int productId, CancellationToken ct = default);
}
