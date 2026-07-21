using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Interfaces;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Repositories;

public class ReviewRepository : GenericRepository<Review>, IReviewRepository
{
    public ReviewRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<bool> HasUserPurchasedProductAsync(int userId, int productId, CancellationToken ct = default)
    {
        return await _context.OrderDetails
            .AnyAsync(od => od.ProductId == productId && od.Order.UserId == userId, ct);
    }

    public async Task<List<Review>> GetProductReviewsAsync(int productId, CancellationToken ct = default)
    {
        return await _context.Reviews
            .Include(r => r.User)
            .Where(r => r.ProductId == productId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
    }
}
