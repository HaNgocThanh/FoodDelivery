using FoodDelivery.Application.DTOs.Order;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Enums;
using FoodDelivery.Domain.Exceptions;
using FoodDelivery.Domain.Interfaces;

namespace FoodDelivery.Application.Services;

public class OrderService : IOrderService
{
    private readonly IUnitOfWork _unitOfWork;

    public OrderService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<OrderResponseDTO> CreateOrderAsync(OrderRequestDTO request, CancellationToken ct = default)
    {
        if (request.Items == null || !request.Items.Any())
        {
            throw new ArgumentException("Đơn hàng phải chứa ít nhất 1 sản phẩm.");
        }

        // BƯỚC 1: Bắt đầu Giao dịch (Transaction Control)
        await _unitOfWork.BeginTransactionAsync(ct);

        try
        {
            // BƯỚC 2: Thu thập và sắp xếp các Product IDs để khóa dòng (Row-level Locking) chống Deadlock
            var productIds = request.Items.Select(i => i.ProductId).Distinct().OrderBy(id => id).ToList();

            // Khóa các dòng sản phẩm trong Oracle DB bằng SELECT ... FOR UPDATE NOWAIT
            var lockedProducts = await _unitOfWork.Products.GetManyWithLockAsync(productIds, ct);

            var productMap = lockedProducts.ToDictionary(p => p.Id);

            decimal totalAmount = 0;
            var orderDetails = new List<OrderDetail>();
            var responseDetails = new List<OrderDetailResponseDTO>();

            // BƯỚC 3: Trừ hàng trong kho và tính tổng giá trị đơn hàng
            foreach (var item in request.Items)
            {
                if (!productMap.TryGetValue(item.ProductId, out var product))
                {
                    throw new NotFoundException($"Sản phẩm với ID {item.ProductId} không tồn tại.");
                }

                if (!product.IsAvailable || product.StockQuantity < item.Quantity)
                {
                    throw new InvalidOperationException($"Sản phẩm '{product.Name}' không đủ số lượng tồn kho (Hiện có: {product.StockQuantity}, Yêu cầu: {item.Quantity}).");
                }

                // Trừ kho ngay lập tức
                product.StockQuantity -= item.Quantity;
                if (product.StockQuantity == 0)
                {
                    product.IsAvailable = false;
                }
                _unitOfWork.Products.Update(product);

                var lineTotal = product.Price * item.Quantity;
                totalAmount += lineTotal;

                orderDetails.Add(new OrderDetail
                {
                    ProductId = product.Id,
                    Quantity = item.Quantity,
                    UnitPrice = product.Price
                });

                responseDetails.Add(new OrderDetailResponseDTO(
                    product.Id,
                    product.Name,
                    item.Quantity,
                    product.Price,
                    lineTotal
                ));
            }

            // BƯỚC 4: Tạo đối tượng Đơn hàng
            var order = new Order
            {
                UserId = request.UserId,
                PromotionId = request.PromotionId,
                OrderDate = DateTime.UtcNow,
                TotalAmount = totalAmount,
                PaymentMethod = request.PaymentMethod,
                Status = OrderStatus.Pending,
                OrderDetails = orderDetails
            };

            await _unitOfWork.Orders.AddAsync(order, ct);

            // BƯỚC 5: Commit Giao dịch thành công
            await _unitOfWork.CommitTransactionAsync(ct);

            return new OrderResponseDTO(
                order.Id,
                order.UserId,
                order.OrderDate,
                order.TotalAmount,
                order.PaymentMethod,
                order.Status,
                order.PromotionId,
                order.ShipperId,
                responseDetails
            );
        }
        catch (Exception)
        {
            // BƯỚC 6: Rollback toàn bộ Giao dịch nếu gặp bất kỳ lỗi nào (không đủ kho, đụng độ dữ liệu...)
            await _unitOfWork.RollbackTransactionAsync(ct);
            throw;
        }
    }

    public async Task<bool> AssignShipperAsync(int orderId, int shipperId, CancellationToken ct = default)
    {
        var result = await _unitOfWork.Orders.AssignShipperAsync(orderId, shipperId, ct);
        if (!result)
        {
            throw new NotFoundException($"Đơn hàng #{orderId} hoặc Shipper #{shipperId} không tồn tại.");
        }

        await _unitOfWork.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatus status, CancellationToken ct = default)
    {
        await _unitOfWork.BeginTransactionAsync(ct);

        try
        {
            var order = await _unitOfWork.Orders.GetByIdAsync(orderId, ct);
            if (order == null)
            {
                throw new NotFoundException($"Đơn hàng với ID {orderId} không tồn tại.");
            }

            var previousStatus = order.Status;
            order.Status = status;
            _unitOfWork.Orders.Update(order);

            // Khi đơn hàng chuyển sang trạng thái Completed (và chưa từng Completed trước đó)
            if (status == OrderStatus.Completed && previousStatus != OrderStatus.Completed)
            {
                var user = await _unitOfWork.Users.GetByIdAsync(order.UserId, ct);
                if (user != null)
                {
                    // Tính điểm tích lũy: TotalAmount / 10,000
                    int pointsEarned = (int)(order.TotalAmount / 10000m);
                    user.LoyaltyPoints += pointsEarned;

                    // Đánh giá lại Hạng thẻ (MembershipTier)
                    if (user.LoyaltyPoints >= 1000)
                    {
                        user.Tier = MembershipTier.Platinum;
                    }
                    else if (user.LoyaltyPoints >= 500)
                    {
                        user.Tier = MembershipTier.Gold;
                    }
                    else if (user.LoyaltyPoints >= 100)
                    {
                        user.Tier = MembershipTier.Silver;
                    }
                    else
                    {
                        user.Tier = MembershipTier.Standard;
                    }

                    _unitOfWork.Users.Update(user);
                }
            }

            await _unitOfWork.CommitTransactionAsync(ct);
            return true;
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(ct);
            throw;
        }
    }

    public async Task<IEnumerable<OrderResponseDTO>> GetOrdersByStatusAsync(OrderStatus? status = null, CancellationToken ct = default)
    {
        var orders = status.HasValue
            ? await _unitOfWork.Orders.FindAsync(o => o.Status == status.Value, ct)
            : await _unitOfWork.Orders.GetAllAsync(ct);

        var result = new List<OrderResponseDTO>();
        foreach (var order in orders)
        {
            var details = order.OrderDetails != null
                ? order.OrderDetails.Select(od => new OrderDetailResponseDTO(
                    od.ProductId,
                    od.Product?.Name ?? $"Sản phẩm #{od.ProductId}",
                    od.Quantity,
                    od.UnitPrice,
                    od.Quantity * od.UnitPrice
                )).ToList()
                : new List<OrderDetailResponseDTO>();

            result.Add(new OrderResponseDTO(
                order.Id,
                order.UserId,
                order.OrderDate,
                order.TotalAmount,
                order.PaymentMethod,
                order.Status,
                order.PromotionId,
                order.ShipperId,
                details
            ));
        }

        return result;
    }

    public async Task<IEnumerable<OrderResponseDTO>> GetUserOrdersAsync(int userId, CancellationToken ct = default)
    {
        var orders = await _unitOfWork.Orders.GetUserOrdersAsync(userId, ct);

        var result = new List<OrderResponseDTO>();
        foreach (var order in orders)
        {
            var details = order.OrderDetails != null
                ? order.OrderDetails.Select(od => new OrderDetailResponseDTO(
                    od.ProductId,
                    od.Product?.Name ?? $"Sản phẩm #{od.ProductId}",
                    od.Quantity,
                    od.UnitPrice,
                    od.Quantity * od.UnitPrice
                )).ToList()
                : new List<OrderDetailResponseDTO>();

            result.Add(new OrderResponseDTO(
                order.Id,
                order.UserId,
                order.OrderDate,
                order.TotalAmount,
                order.PaymentMethod,
                order.Status,
                order.PromotionId,
                order.ShipperId,
                details
            ));
        }

        return result;
    }

    public async Task<bool> CancelUserOrderAsync(int orderId, int userId, CancellationToken ct = default)
    {
        await _unitOfWork.BeginTransactionAsync(ct);

        try
        {
            var order = await _unitOfWork.Orders.GetOrderWithDetailsAsync(orderId, ct);

            if (order == null)
            {
                throw new NotFoundException($"Đơn hàng với ID #{orderId} không tồn tại.");
            }

            if (order.UserId != userId)
            {
                throw new InvalidOperationException("Bạn không có quyền hủy đơn hàng của người dùng khác.");
            }

            if (order.Status != OrderStatus.Pending)
            {
                throw new InvalidOperationException($"Chỉ có thể hủy đơn hàng khi ở trạng thái Chờ xử lý (Pending). Trạng thái hiện tại: {order.Status}.");
            }

            // Đổi trạng thái sang Cancelled
            order.Status = OrderStatus.Cancelled;
            _unitOfWork.Orders.Update(order);

            // Hoàn số lượng tồn kho cho từng sản phẩm trong đơn hàng
            if (order.OrderDetails != null)
            {
                foreach (var detail in order.OrderDetails)
                {
                    var product = await _unitOfWork.Products.GetByIdAsync(detail.ProductId, ct);
                    if (product != null)
                    {
                        product.StockQuantity += detail.Quantity;
                        product.IsAvailable = true;
                        _unitOfWork.Products.Update(product);
                    }
                }
            }

            await _unitOfWork.CommitTransactionAsync(ct);
            return true;
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(ct);
            throw;
        }
    }
}
