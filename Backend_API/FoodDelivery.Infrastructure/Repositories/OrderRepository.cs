using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Enums;
using FoodDelivery.Domain.Interfaces;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Repositories;

public class OrderRepository : GenericRepository<Order>, IOrderRepository
{
    public OrderRepository(AppDbContext context) : base(context)
    {
    }

    public async Task<Order?> GetOrderWithDetailsForUpdateAsync(int orderId, CancellationToken ct = default)
    {
        var rows = await _dbSet.FromSqlInterpolated($"SELECT * FROM \"Orders\" WHERE \"Id\" = {orderId} FOR UPDATE")
            .AsTracking().ToListAsync(ct);
        var order = rows.SingleOrDefault();
        if (order != null)
            await _context.Entry(order).Collection(o => o.OrderDetails).LoadAsync(ct);
        return order;
    }

    public async Task<bool> TryApproveOnlinePaymentAsync(int orderId, int userId, decimal amount, CancellationToken ct = default)
    {
        var updated = await _dbSet.Where(o => o.Id == orderId && o.UserId == userId
            && o.PaymentMethod == PaymentMethod.Online && o.Status == OrderStatus.Pending
            && o.TotalAmount == amount)
            .ExecuteUpdateAsync(setters => setters.SetProperty(o => o.Status, OrderStatus.Approved), ct);
        return updated == 1;
    }

    public async Task<bool> AssignShipperAsync(int orderId, int shipperId, CancellationToken ct = default)
    {
        var order = await _dbSet.FirstOrDefaultAsync(o => o.Id == orderId, ct);
        if (order == null) return false;

        var shipperExists = await _context.AppUsers.AnyAsync(u => u.Id == shipperId, ct);
        if (!shipperExists) return false;

        order.ShipperId = shipperId;
        order.Status = OrderStatus.Shipping;
        _dbSet.Update(order);
        return true;
    }

    public async Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatus status, CancellationToken ct = default)
    {
        var order = await _dbSet.FirstOrDefaultAsync(o => o.Id == orderId, ct);
        if (order == null) return false;

        order.Status = status;
        _dbSet.Update(order);
        return true;
    }

    public async Task<List<Order>> GetUserOrdersAsync(int userId, CancellationToken ct = default)
    {
        return await _dbSet
            .Include(o => o.OrderDetails!)
                .ThenInclude(od => od.Product)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.OrderDate)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<Order?> GetOrderWithDetailsAsync(int orderId, CancellationToken ct = default)
    {
        return await _dbSet
            .Include(o => o.OrderDetails!)
                .ThenInclude(od => od.Product)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);
    }

    public async Task<List<Order>> GetCompletedOrdersInRangeAsync(DateTime startDate, DateTime endDate, CancellationToken ct = default)
    {
        return await _dbSet
            .Where(o => o.Status == OrderStatus.Completed
                     && o.OrderDate >= startDate
                     && o.OrderDate <= endDate)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<List<Order>> GetAllOrdersForStatusStatsAsync(CancellationToken ct = default)
    {
        return await _dbSet
            .Select(o => new Order { Status = o.Status })
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public async Task<List<Order>> GetOrdersWithDetailsAsync(OrderStatus? status = null, CancellationToken ct = default)
    {
        var query = _dbSet
            .Include(o => o.OrderDetails!)
                .ThenInclude(od => od.Product)
            .AsNoTracking();

        if (status.HasValue)
        {
            query = query.Where(o => o.Status == status.Value);
        }

        return await query.OrderByDescending(o => o.OrderDate).ToListAsync(ct);
    }
}
