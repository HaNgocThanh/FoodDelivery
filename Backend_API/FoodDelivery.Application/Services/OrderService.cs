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
    private readonly IEmailService _emailService;

    public OrderService(IUnitOfWork unitOfWork, IEmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _emailService = emailService;
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

            // Gửi Email HTML Xác nhận Đặt hàng thành công
            try
            {
                var user = await _unitOfWork.Users.GetByIdAsync(request.UserId, ct);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    var htmlBody = GenerateOrderSuccessHtml(order, user, productMap);
                    await _emailService.SendEmailAsync(user.Email, "Xác nhận đặt hàng thành công", htmlBody);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EMAIL ERROR] Đơn hàng #{order.Id}: {ex.Message}");
            }

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

        // Gửi email thông báo trạng thái "Đang giao hàng (Shipping)" khi phân công shipper
        try
        {
            var order = await _unitOfWork.Orders.GetByIdAsync(orderId, ct);
            if (order != null)
            {
                var user = await _unitOfWork.Users.GetByIdAsync(order.UserId, ct);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    var htmlBody = GenerateOrderStatusHtml(order, OrderStatus.Shipping);
                    await _emailService.SendEmailAsync(user.Email, $"Cập nhật trạng thái đơn hàng #{order.Id}", htmlBody);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EMAIL ERROR] Phân công Shipper Đơn #{orderId}: {ex.Message}");
        }

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

            // Gửi Email HTML thông báo cập nhật trạng thái đơn hàng
            try
            {
                var user = await _unitOfWork.Users.GetByIdAsync(order.UserId, ct);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    var htmlBody = GenerateOrderStatusHtml(order, status);
                    await _emailService.SendEmailAsync(user.Email, $"Cập nhật trạng thái đơn hàng #{order.Id}", htmlBody);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EMAIL ERROR] Cập nhật Trạng thái Đơn #{order.Id}: {ex.Message}");
            }
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
        var orders = await _unitOfWork.Orders.GetOrdersWithDetailsAsync(status, ct);

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

    private string GenerateOrderSuccessHtml(Order order, AppUser user, Dictionary<int, Product> productMap)
    {
        var itemsHtml = "";
        foreach (var detail in order.OrderDetails)
        {
            var productName = productMap.TryGetValue(detail.ProductId, out var p) ? p.Name : $"Sản phẩm #{detail.ProductId}";
            itemsHtml += $@"
                <tr>
                    <td style='padding: 12px 10px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151;'>{productName}</td>
                    <td style='padding: 12px 10px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; text-align: center;'>{detail.Quantity}</td>
                    <td style='padding: 12px 10px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #374151; text-align: right;'>{detail.UnitPrice.ToString("N0")} đ</td>
                    <td style='padding: 12px 10px; border-bottom: 1px solid #e5e7eb; font-size: 14px; font-weight: bold; color: #111827; text-align: right;'>{(detail.Quantity * detail.UnitPrice).ToString("N0")} đ</td>
                </tr>";
        }

        return $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>
                <div style='background-color: #10b981; padding: 30px 20px; text-align: center; color: #ffffff;'>
                    <h1 style='margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;'>Đặt hàng thành công!</h1>
                    <p style='margin: 8px 0 0; font-size: 14px; opacity: 0.9;'>Cảm ơn bạn đã lựa chọn mua sắm tại FoodDelivery</p>
                </div>
                <div style='padding: 24px;'>
                    <p style='font-size: 16px; color: #111827; margin-top: 0;'>Chào <strong>{user.FullName}</strong>,</p>
                    <p style='font-size: 14px; color: #4b5563; line-height: 1.5;'>Chúng tôi đã ghi nhận đơn hàng của bạn. Dưới đây là thông tin chi tiết hóa đơn:</p>
                    
                    <table style='width: 100%; border-collapse: collapse; margin: 20px 0;'>
                        <thead>
                            <tr style='background-color: #f9fafb;'>
                                <th style='padding: 10px; text-align: left; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;'>Sản phẩm</th>
                                <th style='padding: 10px; text-align: center; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;'>SL</th>
                                <th style='padding: 10px; text-align: right; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;'>Đơn giá</th>
                                <th style='padding: 10px; text-align: right; font-size: 11px; font-weight: bold; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb;'>Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan='3' style='padding: 20px 10px 5px; font-size: 14px; color: #4b5563; text-align: right;'>Tổng cộng:</td>
                                <td style='padding: 20px 10px 5px; font-size: 18px; font-weight: 800; color: #10b981; text-align: right;'>{order.TotalAmount.ToString("N0")} đ</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style='background-color: #f9fafb; padding: 18px; border-radius: 12px; border: 1px solid #e5e7eb; margin-top: 25px;'>
                        <h3 style='margin: 0 0 10px 0; font-size: 14px; color: #111827; font-weight: bold;'>📍 Địa chỉ giao nhận</h3>
                        <p style='margin: 0; font-size: 13px; color: #4b5563; line-height: 1.4;'>
                            <strong>Địa chỉ nhận:</strong> {user.Address1}{(string.IsNullOrEmpty(user.Address2) ? "" : $", {user.Address2}")}
                        </p>
                        <p style='margin: 5px 0 0 0; font-size: 13px; color: #4b5563;'>
                            <strong>Số điện thoại:</strong> {user.PhoneNumber}
                        </p>
                    </div>
                </div>
                <div style='background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;'>
                    Đây là email tự động từ hệ thống FoodDelivery. Vui lòng không phản hồi lại email này.
                </div>
            </div>";
    }

    private string GenerateOrderStatusHtml(Order order, OrderStatus status)
    {
        string statusText = "";
        string statusColor = "";
        string statusDesc = "";

        switch (status)
        {
            case OrderStatus.Approved:
                statusText = "Đã được xác nhận (Approved)";
                statusColor = "#3b82f6"; // Xanh dương
                statusDesc = "Đơn hàng của bạn đã được xác nhận thanh toán thành công và đang được chuẩn bị món ăn tại bếp.";
                break;
            case OrderStatus.Shipping:
                statusText = "Đang giao hàng (Shipping)";
                statusColor = "#f97316"; // Cam
                statusDesc = "Shipper của chúng tôi đã nhận món ăn từ nhà hàng và đang nhanh chóng vận chuyển đến địa chỉ của bạn.";
                break;
            case OrderStatus.Completed:
                statusText = "Giao hàng thành công (Completed)";
                statusColor = "#10b981"; // Xanh lá
                statusDesc = "Đơn hàng của bạn đã được giao thành công. Chúc bạn có một bữa ăn ngon miệng và vui vẻ!";
                break;
            case OrderStatus.Cancelled:
                statusText = "Đã bị hủy (Cancelled)";
                statusColor = "#ef4444"; // Đỏ
                statusDesc = "Đơn hàng của bạn đã bị hủy bỏ trên hệ thống. Nếu có thắc mắc, vui lòng phản hồi tới tổng đài hỗ trợ.";
                break;
            default:
                statusText = $"Trạng thái: {status}";
                statusColor = "#6b7280"; // Xám
                statusDesc = $"Đơn hàng của bạn đã được cập nhật sang trạng thái: {status}.";
                break;
        }

        return $@"
            <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);'>
                <div style='background-color: {statusColor}; padding: 25px; text-align: center; color: #ffffff;'>
                    <h1 style='margin: 0; font-size: 20px; font-weight: bold;'>Cập nhật trạng thái Đơn hàng #{order.Id}</h1>
                </div>
                <div style='padding: 24px;'>
                    <p style='font-size: 16px; color: #111827; margin-top: 0;'>Xin chào,</p>
                    <p style='font-size: 14px; color: #4b5563; line-height: 1.5;'>
                        Tiến độ đơn hàng <strong style='color: #f97316;'>#{order.Id}</strong> của bạn đã có cập nhật mới:
                    </p>
                    <div style='margin: 20px 0; padding: 15px; border-radius: 12px; background-color: #f9fafb; border-left: 5px solid {statusColor}; font-size: 16px; font-weight: bold; color: {statusColor};'>
                        {statusText}
                    </div>
                    <p style='font-size: 14px; color: #4b5563; line-height: 1.5;'>
                        {statusDesc}
                    </p>
                    <div style='margin-top: 25px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af;'>
                        Đây là email tự động từ hệ thống FoodDelivery. Vui lòng không phản hồi lại email này.
                    </div>
                </div>
            </div>";
    }
}
