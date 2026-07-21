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

            // BƯỚC 3: Duyệt từng sản phẩm trong DTO, kiểm tra tồn kho và trừ kho
            foreach (var item in request.Items)
            {
                if (!productMap.TryGetValue(item.ProductId, out var product))
                {
                    throw new NotFoundException($"Sản phẩm với ID {item.ProductId} không tồn tại.");
                }

                if (!product.IsAvailable || product.StockQuantity < item.Quantity)
                {
                    throw new InsufficientStockException(
                        $"Sản phẩm '{product.Name}' (ID: {product.Id}) chỉ còn {product.StockQuantity} trong kho, không đủ số lượng yêu cầu: {item.Quantity}.");
                }

                // Trừ số lượng tồn kho (bảo vệ chuẩn ACID)
                product.StockQuantity -= item.Quantity;
                if (product.StockQuantity == 0)
                {
                    product.IsAvailable = false;
                }

                _unitOfWork.Products.Update(product);

                decimal subtotal = product.Price * item.Quantity;
                totalAmount += subtotal;

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
                    subtotal
                ));
            }

            // BƯỚC 3.5: Áp dụng Mã khuyến mãi (nếu có)
            if (request.PromotionId.HasValue && request.PromotionId.Value > 0)
            {
                var promotion = await _unitOfWork.Promotions.GetByIdAsync(request.PromotionId.Value, ct);
                if (promotion == null)
                {
                    throw new NotFoundException($"Mã khuyến mãi với ID {request.PromotionId} không tồn tại.");
                }

                if (!promotion.IsActive)
                {
                    throw new ArgumentException("Mã khuyến mãi này đã bị vô hiệu hóa.");
                }

                if (DateTime.UtcNow > promotion.ExpiryDate)
                {
                    throw new ArgumentException("Mã khuyến mãi này đã hết hạn sử dụng.");
                }

                if (promotion.CurrentUsage >= promotion.MaxUsage)
                {
                    throw new ArgumentException("Mã khuyến mãi này đã hết lượt sử dụng.");
                }

                // Trừ tiền tổng đơn dựa trên phần trăm giảm giá
                decimal discountAmount = totalAmount * (promotion.DiscountPercentage / 100m);
                totalAmount = Math.Max(0, totalAmount - discountAmount);

                // Tăng lượt sử dụng của Mã khuyến mãi lên 1
                promotion.CurrentUsage += 1;
                _unitOfWork.Promotions.Update(promotion);
            }

            // BƯỚC 4: Tạo thực thể Đơn hàng (Order Aggregate)
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
        var result = await _unitOfWork.Orders.UpdateOrderStatusAsync(orderId, status, ct);
        if (!result)
        {
            throw new NotFoundException($"Đơn hàng với ID {orderId} không tồn tại.");
        }

        await _unitOfWork.SaveChangesAsync(ct);
        return true;
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
}
