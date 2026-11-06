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

    public Task<Order?> GetCheckoutOrderAsync(int userId, string checkoutId, CancellationToken ct) =>
        _dbSet.AsNoTracking().Include(order => order.OrderDetails).ThenInclude(item => item.Product)
            .SingleOrDefaultAsync(order => order.UserId == userId && order.CheckoutRequestId == checkoutId, ct);

    public async Task<IReadOnlyList<int>> GetExpiredPaymentOrdersAsync(DateTime now, int take, CancellationToken ct) =>
        await _dbSet.AsNoTracking()
            .Where(order => order.Status == OrderStatus.Pending && order.PaymentMethod == PaymentMethod.Online
                && order.OnlinePaymentConfirmedAt == null && order.PaymentExpiresAt <= now)
            .OrderBy(order => order.PaymentExpiresAt).ThenBy(order => order.Id)
            .Select(order => order.Id).Take(take).ToListAsync(ct);

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
        // The deadline is stored as a UTC TIMESTAMP without a time zone.
        var updated = await _context.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE "Orders"
            SET "Status" = {OrderStatus.Approved.ToString()}, "OnlinePaymentConfirmedAt" = SYS_EXTRACT_UTC(SYSTIMESTAMP)
            WHERE "Id" = {orderId} AND "UserId" = {userId}
              AND "PaymentMethod" = {PaymentMethod.Online.ToString()} AND "OnlinePaymentConfirmedAt" IS NULL
              AND "Status" IN ({OrderStatus.Pending.ToString()}, {OrderStatus.Approved.ToString()})
              AND "TotalAmount" = {amount}
              AND ("PaymentExpiresAt" IS NULL OR "PaymentExpiresAt" > SYS_EXTRACT_UTC(SYSTIMESTAMP))
            """, ct);
        return updated == 1;
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
            .AsNoTracking()
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
