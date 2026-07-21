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
}
