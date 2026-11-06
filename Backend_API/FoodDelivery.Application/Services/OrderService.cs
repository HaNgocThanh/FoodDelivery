using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
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

    public async Task<OrderResponseDTO> CreateOrderAsync(OrderRequestDTO request, CancellationToken ct = default,
        Guid? idempotencyKey = null, bool onlineEnabled = false)
    {
        var validation = new FoodDelivery.Application.Validators.OrderRequestValidator().Validate(request);
        if (!validation.IsValid)
            throw new ArgumentException(string.Join(" ", validation.Errors.Select(error => error.ErrorMessage)));

        var checkoutId = idempotencyKey.HasValue ? Digest($"{request.UserId}:{idempotencyKey.Value:N}") : null;
        var fingerprint = checkoutId is null ? null : Digest(JsonSerializer.Serialize(new
        {
            request.PaymentMethod,
            CouponCode = string.IsNullOrWhiteSpace(request.CouponCode) ? null : request.CouponCode.Trim().ToUpperInvariant(),
            request.UsePoints,
            Items = request.Items.OrderBy(item => item.ProductId),
            RecipientName = request.RecipientName.Trim(),
            RecipientPhone = request.RecipientPhone.Trim(),
            DeliveryAddress = request.DeliveryAddress.Trim(),
            request.DeliverySlot,
            DeliveryNotes = string.IsNullOrWhiteSpace(request.DeliveryNotes) ? null : request.DeliveryNotes.Trim(),
            request.LeaveAtDoorstep,
            request.TipAmount
        }));

        if (checkoutId is not null && await FindReplayAsync(request.UserId, checkoutId, fingerprint!, ct) is { } existing)
            return existing;

        if (request.PaymentMethod == PaymentMethod.Online && !onlineEnabled)
            throw new ArgumentException("Thanh toán trực tuyến hiện không khả dụng.");

        try
        {
            return await CreateNewOrderAsync(request, checkoutId, fingerprint, ct);
        }
        catch (DuplicateCheckoutException) when (checkoutId is not null)
        {
            var replay = await FindReplayAsync(request.UserId, checkoutId, fingerprint!, ct);
            return replay ?? throw new ConcurrentWriteException("Đơn hàng đang được xử lý. Vui lòng thử lại cùng yêu cầu.");
        }
    }

    private async Task<OrderResponseDTO?> FindReplayAsync(int userId, string checkoutId, string fingerprint, CancellationToken ct)
    {
        var order = await _unitOfWork.Orders.GetCheckoutOrderAsync(userId, checkoutId, ct);
        if (order is null) return null;
        if (!string.Equals(order.CheckoutFingerprint, fingerprint, StringComparison.Ordinal))
            throw new ConcurrentWriteException("Khóa đặt hàng đã được dùng với nội dung khác.");

        return ToResponse(order);
    }

    private static string Digest(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));

    private async Task<OrderResponseDTO> CreateNewOrderAsync(
        OrderRequestDTO request, string? checkoutId, string? fingerprint, CancellationToken ct)
    {
        // BƯỚC 1: Bắt đầu Giao dịch (Transaction Control)
        await _unitOfWork.BeginTransactionAsync(ct);

        try
        {
            // BƯỚC 2: Thu thập và sắp xếp các Product IDs để khóa dòng (Row-level Locking) chống Deadlock
            var productIds = request.Items.Select(i => i.ProductId).Distinct().OrderBy(id => id).ToList();

            // Khóa các dòng sản phẩm trong Oracle DB bằng SELECT ... FOR UPDATE NOWAIT
            var lockedProducts = await _unitOfWork.Products.GetManyWithLockAsync(productIds, ct);

            var productMap = lockedProducts.ToDictionary(p => p.Id);

            decimal subTotal = 0;
            var orderDetails = new List<OrderDetail>();
            var responseDetails = new List<OrderDetailResponseDTO>();

            // BƯỚC 3: Trừ hàng trong kho và tính tổng giá trị tiền hàng trước giảm giá (SubTotal)
            foreach (var item in request.Items)
            {
                if (!productMap.TryGetValue(item.ProductId, out var product))
                {
                    throw new NotFoundException($"Sản phẩm với ID {item.ProductId} không tồn tại.");
                }

                if (!product.IsAvailable || product.StockQuantity < item.Quantity)
                {
                    throw new InsufficientStockException($"Sản phẩm '{product.Name}' không đủ số lượng tồn kho (Hiện có: {product.StockQuantity}, Yêu cầu: {item.Quantity}).");
                }

                // Trừ kho ngay lập tức
                product.StockQuantity -= item.Quantity;
                if (product.StockQuantity == 0)
                {
                    product.IsAvailable = false;
                }

                var lineTotal = product.Price * item.Quantity;
                subTotal += lineTotal;

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
                    lineTotal,
                    IsReviewed: false
                ));
            }

            // BƯỚC 4: Kiểm tra và tính toán giảm giá (Coupon/Voucher) ở Backend
            decimal discountAmount = 0;
            string? appliedCouponCode = null;
            int? promotionId = null;

            if (!string.IsNullOrWhiteSpace(request.CouponCode))
            {
                // Khóa dòng Promotion trong DB (SELECT ... FOR UPDATE) để đảm bảo concurrency control khi trừ lượt dùng
                var promotion = await _unitOfWork.Promotions.GetByCodeWithLockAsync(request.CouponCode, ct);

                if (promotion == null)
                {
                    throw new NotFoundException($"Mã giảm giá '{request.CouponCode}' không tồn tại.");
                }

                if (!promotion.IsActive)
                {
                    throw new ArgumentException($"Mã giảm giá '{promotion.Code}' đã bị vô hiệu hóa.");
                }

                if (DateTime.UtcNow > promotion.ExpiryDate)
                {
                    throw new ArgumentException($"Mã giảm giá '{promotion.Code}' đã hết hạn sử dụng.");
                }

                if (promotion.CurrentUsage >= promotion.MaxUsage)
                {
                    throw new ArgumentException($"Mã giảm giá '{promotion.Code}' đã hết lượt sử dụng.");
                }

                if (subTotal < promotion.MinOrderAmount)
                {
                    throw new ArgumentException($"Đơn hàng tối thiểu phải từ {promotion.MinOrderAmount:N0} đ mới được áp dụng mã giảm giá này.");
                }

                // Tính toán số tiền được giảm theo loại mã (% hoặc số tiền cố định)
                if (promotion.DiscountType == DiscountType.Percentage)
                {
                    discountAmount = subTotal * (promotion.DiscountValue / 100m);
                    if (promotion.MaxDiscountAmount.HasValue && discountAmount > promotion.MaxDiscountAmount.Value)
                    {
                        discountAmount = promotion.MaxDiscountAmount.Value;
                    }
                }
                else if (promotion.DiscountType == DiscountType.FixedAmount)
                {
                    discountAmount = promotion.DiscountValue;
                }

                appliedCouponCode = promotion.Code.ToUpper();
                promotionId = promotion.Id;

                // Trừ 1 lượt sử dụng của Promotion trong DB
                promotion.CurrentUsage += 1;
            }

            discountAmount = decimal.Round(discountAmount, 2, MidpointRounding.AwayFromZero);

            // BƯỚC 4B: Xử lý điểm tích lũy (nếu khách chọn dùng + tier cho phép)
            int pointsUsed = 0;
            decimal pointDiscount = 0;

            if (request.UsePoints)
            {
                // Khóa dòng User (SELECT ... FOR UPDATE) để chống race condition khi trừ điểm concurrent
                var user = await _unitOfWork.Users.GetByIdWithLockAsync(request.UserId, ct);
                if (user == null)
                {
                    throw new NotFoundException($"Người dùng với ID {request.UserId} không tồn tại.");
                }

                var availablePoints = user.LoyaltyPoints;

                // Xác định tỷ lệ giảm tối đa theo Hạng thẻ (Tier)
                decimal maxDiscountPercent = user.Tier switch
                {
                    MembershipTier.Platinum => 0.20m,
                    MembershipTier.Gold => 0.10m,
                    MembershipTier.Silver => 0.10m,
                    _ => 0m,
                };

                if (maxDiscountPercent <= 0 || availablePoints <= 0)
                {
                    // Không đủ điều kiện dùng điểm → bỏ qua, không lỗi
                }
                else
                {
                    // Tính theo nguyên tắc: 1 điểm = 1000đ; Max points có thể dùng = (SubTotal - CouponDiscount) * tier%
                    var baseAmount = subTotal - discountAmount; // Đơn hàng sau coupon
                    var maxDiscountByTier = baseAmount * maxDiscountPercent;
                    var maxPointsByMoney = (int)Math.Floor(maxDiscountByTier / 1000m);

                    // Lấy số điểm thực tế user có từ DB (trong transaction) — không tin tưởng FE
                    // Áp dụng Math.Min theo yêu cầu nghiệp vụ
                    pointsUsed = Math.Min(availablePoints, maxPointsByMoney);
                    if (pointsUsed < 0) pointsUsed = 0;

                    if (pointsUsed > 0)
                    {
                        pointDiscount = pointsUsed * 1000m;

                        // Trừ điểm thật của User
                        user.LoyaltyPoints -= pointsUsed;
                    }
                }
            }

            // Backend computes all charges; reject a stale client total before committing.
            var shippingFee = subTotal >= 300000m ? 0m : 25000m;
            const decimal toteDeposit = 15000m;
            decimal totalAmount = decimal.Round(Math.Max(subTotal - discountAmount - pointDiscount, 0m)
                + shippingFee + toteDeposit + request.TipAmount, 2, MidpointRounding.AwayFromZero);
            if (totalAmount != request.ExpectedTotalAmount)
                throw new BusinessRuleException("Giá hoặc ưu đãi đã thay đổi. Vui lòng tải lại giỏ hàng và xác nhận tổng tiền mới.");

            // BƯỚC 6: Tạo đối tượng Đơn hàng lưu giữ trạng thái tĩnh (Snapshot)
            var orderedAt = DateTime.UtcNow;
            var order = new Order
            {
                UserId = request.UserId,
                PromotionId = promotionId,
                OrderDate = orderedAt,
                CheckoutRequestId = checkoutId,
                CheckoutFingerprint = fingerprint,
                PaymentExpiresAt = request.PaymentMethod == PaymentMethod.Online ? orderedAt.AddMinutes(15) : null,
                SubTotal = subTotal,
                DiscountAmount = discountAmount,
                AppliedCouponCode = appliedCouponCode,
                PointsUsed = pointsUsed > 0 ? pointsUsed : null,
                PointDiscount = pointDiscount > 0 ? pointDiscount : null,
                TotalAmount = totalAmount,
                RecipientName = request.RecipientName.Trim(),
                RecipientPhone = request.RecipientPhone.Trim(),
                DeliveryAddress = request.DeliveryAddress.Trim(),
                DeliverySlot = request.DeliverySlot,
                DeliveryNotes = request.DeliveryNotes?.Trim(),
                LeaveAtDoorstep = request.LeaveAtDoorstep,
                ShippingFee = shippingFee,
                ToteDeposit = toteDeposit,
                TipAmount = request.TipAmount,
                PaymentMethod = request.PaymentMethod,
                Status = OrderStatus.Pending,
                OrderDetails = orderDetails
            };

            await _unitOfWork.Orders.AddAsync(order, ct);

            // BƯỚC 7: Commit Giao dịch thành công
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

            return ToResponse(order, responseDetails);
        }
        catch (Exception)
        {
            // BƯỚC 8: Rollback toàn bộ Giao dịch nếu gặp bất kỳ lỗi nào
            await _unitOfWork.RollbackTransactionAsync(CancellationToken.None);
            throw;
        }
    }

    public async Task<decimal> GetPaymentAmountAsync(int orderId, int userId, CancellationToken ct = default)
    {
        var order = await _unitOfWork.Orders.GetByIdAsync(orderId, ct);
        if (order == null || order.UserId != userId)
            throw new NotFoundException("Không tìm thấy đơn hàng.");
        if (order.PaymentMethod != PaymentMethod.Online || order.OnlinePaymentConfirmedAt.HasValue ||
            order.Status is not (OrderStatus.Pending or OrderStatus.Approved) ||
            order.PaymentExpiresAt <= DateTime.UtcNow)
            throw new BusinessRuleException("Chỉ có thể thanh toán đơn trực tuyến đang chờ xử lý.");
        return order.TotalAmount;
    }

    public async Task ConfirmMockPaymentAsync(int orderId, int userId, decimal amount, CancellationToken ct = default)
    {
        // Conditional UPDATE prevents a concurrent cancel from being overwritten.
        if (await _unitOfWork.Orders.TryApproveOnlinePaymentAsync(orderId, userId, amount, ct)) return;
        var order = await _unitOfWork.Orders.GetByIdAsync(orderId, ct);
        if (order == null || order.UserId != userId)
            throw new NotFoundException("Không tìm thấy đơn hàng.");
        // Retrying the same verified result is idempotent; never regress later states.
        if (order.PaymentMethod == PaymentMethod.Online && order.TotalAmount == amount &&
            order.Status is (OrderStatus.Approved or OrderStatus.Shipping or OrderStatus.Completed) &&
            order.OnlinePaymentConfirmedAt.HasValue) return;
        throw new BusinessRuleException("Đơn hàng không còn đủ điều kiện xác nhận thanh toán.");
    }

    public async Task<bool> AssignShipperAsync(int orderId, int shipperId, CancellationToken ct = default)
    {
        await _unitOfWork.BeginTransactionAsync(ct);
        Order order;
        bool changed;
        try
        {
            order = await GetLockedOrderAsync(orderId, ct);
            if (order.Status is not (OrderStatus.Approved or OrderStatus.Shipping) || !CanShip(order))
                throw new BusinessRuleException("Chỉ phân công đơn đã duyệt và đủ điều kiện thanh toán.");

            var shipper = await _unitOfWork.Users.GetByIdWithLockAsync(shipperId, ct);
            if (shipper?.Role != "Shipper")
                throw new NotFoundException($"Không tìm thấy nhân viên giao hàng #{shipperId}.");

            changed = order.ShipperId != shipperId || order.Status != OrderStatus.Shipping;
            order.ShipperId = shipperId;
            order.Status = OrderStatus.Shipping;
            await _unitOfWork.CommitTransactionAsync(ct);
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(CancellationToken.None);
            throw;
        }

        if (changed) await NotifyStatusAsync(order, ct);
        return true;
    }

    public Task<bool> UpdateOrderStatusAsync(int orderId, OrderStatus status, CancellationToken ct = default) =>
        ChangeOrderStatusAsync(orderId, status, null, ct);

    public Task<bool> CancelUserOrderAsync(int orderId, int userId, CancellationToken ct = default) =>
        ChangeOrderStatusAsync(orderId, OrderStatus.Cancelled, userId, ct);

    public Task<IReadOnlyList<int>> GetExpiredPaymentOrdersAsync(CancellationToken ct) =>
        _unitOfWork.Orders.GetExpiredPaymentOrdersAsync(DateTime.UtcNow, 50, ct);

    public Task<bool> ExpirePendingPaymentAsync(int orderId, CancellationToken ct) =>
        ChangeOrderStatusAsync(orderId, OrderStatus.Cancelled, null, ct, expiredOnly: true);

    private async Task<bool> ChangeOrderStatusAsync(int orderId, OrderStatus status, int? ownerId, CancellationToken ct,
        bool expiredOnly = false)
    {
        await _unitOfWork.BeginTransactionAsync(ct);
        Order order;
        bool changed;
        try
        {
            order = await GetLockedOrderAsync(orderId, ct);
            if (ownerId.HasValue && order.UserId != ownerId)
                throw new NotFoundException("Không tìm thấy đơn hàng.");

            if (expiredOnly && (order.Status != OrderStatus.Pending || order.PaymentMethod != PaymentMethod.Online ||
                order.OnlinePaymentConfirmedAt.HasValue || !order.PaymentExpiresAt.HasValue || order.PaymentExpiresAt > DateTime.UtcNow))
            {
                await _unitOfWork.CommitTransactionAsync(ct);
                return false;
            }

            changed = order.Status != status;
            if (changed)
            {
                switch (status)
                {
                    case OrderStatus.Approved when !ownerId.HasValue && order.Status == OrderStatus.Pending
                        && order.PaymentMethod == PaymentMethod.COD:
                        break;
                    case OrderStatus.Completed when !ownerId.HasValue && order.Status == OrderStatus.Shipping
                        && order.ShipperId.HasValue && CanShip(order):
                        var buyer = await _unitOfWork.Users.GetByIdWithLockAsync(order.UserId, ct)
                            ?? throw new NotFoundException("Không tìm thấy tài khoản đặt hàng.");
                        CreditPoints(buyer, (int)(order.TotalAmount / 10000m));
                        break;
                    case OrderStatus.Cancelled when order.Status == OrderStatus.Pending ||
                        (!ownerId.HasValue && order.Status == OrderStatus.Approved && order.PaymentMethod == PaymentMethod.COD):
                        await RestoreOrderResourcesAsync(order, ct);
                        break;
                    default:
                        throw new BusinessRuleException("Không thể chuyển trạng thái đơn hàng theo yêu cầu.");
                }

                order.Status = status;
            }

            await _unitOfWork.CommitTransactionAsync(ct);
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(CancellationToken.None);
            throw;
        }

        if (changed && !ownerId.HasValue && !expiredOnly) await NotifyStatusAsync(order, ct);
        return true;
    }

    private async Task<Order> GetLockedOrderAsync(int orderId, CancellationToken ct) =>
        await _unitOfWork.Orders.GetOrderWithDetailsForUpdateAsync(orderId, ct)
            ?? throw new NotFoundException($"Không tìm thấy đơn hàng #{orderId}.");

    private static bool CanShip(Order order) =>
        order.PaymentMethod == PaymentMethod.COD ||
        (order.PaymentMethod == PaymentMethod.Online && order.OnlinePaymentConfirmedAt.HasValue);

    private async Task RestoreOrderResourcesAsync(Order order, CancellationToken ct)
    {
        // Use the same lock order as checkout: products, promotion, buyer.
        var products = await _unitOfWork.Products.GetManyWithLockAsync(
            order.OrderDetails.Select(item => item.ProductId), ct);
        var productsById = products.ToDictionary(product => product.Id);
        foreach (var detail in order.OrderDetails)
        {
            if (!productsById.TryGetValue(detail.ProductId, out var product)) continue;

            if (product.StockQuantity == 0) product.IsAvailable = true;
            product.StockQuantity = checked(product.StockQuantity + detail.Quantity);
        }

        var promotion = order.PromotionId is int promotionId
            ? await _unitOfWork.Promotions.GetByIdWithLockAsync(promotionId, ct)
            : string.IsNullOrWhiteSpace(order.AppliedCouponCode)
                ? null
                : await _unitOfWork.Promotions.GetByCodeWithLockAsync(order.AppliedCouponCode, ct);
        if (promotion is { CurrentUsage: > 0 }) promotion.CurrentUsage--;

        if (order.PointsUsed is > 0)
        {
            var buyer = await _unitOfWork.Users.GetByIdWithLockAsync(order.UserId, ct)
                ?? throw new NotFoundException("Không tìm thấy tài khoản đặt hàng.");
            buyer.LoyaltyPoints = checked(buyer.LoyaltyPoints + order.PointsUsed.Value);
        }
    }

    private static void CreditPoints(AppUser buyer, int points)
    {
        buyer.LoyaltyPoints = checked(buyer.LoyaltyPoints + points);
        buyer.Tier = buyer.LoyaltyPoints switch
        {
            >= 1000 => MembershipTier.Platinum,
            >= 500 => MembershipTier.Gold,
            >= 100 => MembershipTier.Silver,
            _ => MembershipTier.Standard
        };
    }

    private async Task NotifyStatusAsync(Order order, CancellationToken ct)
    {
        try
        {
            var buyer = await _unitOfWork.Users.GetByIdAsync(order.UserId, ct);
            if (buyer != null && !string.IsNullOrWhiteSpace(buyer.Email))
            {
                var body = GenerateOrderStatusHtml(order, order.Status);
                await _emailService.SendEmailAsync(buyer.Email, $"Cập nhật trạng thái đơn hàng #{order.Id}", body);
            }
        }
        catch (Exception error)
        {
            Console.WriteLine($"[EMAIL ERROR] Cập nhật Trạng thái Đơn #{order.Id}: {error.GetType().Name}");
        }
    }

    private static OrderResponseDTO ToResponse(Order order, List<OrderDetailResponseDTO>? details = null)
    {
        details ??= order.OrderDetails.Select(item => new OrderDetailResponseDTO(
            item.ProductId, item.Product?.Name ?? $"Sản phẩm #{item.ProductId}",
            item.Quantity, item.UnitPrice, item.Quantity * item.UnitPrice, item.IsReviewed)).ToList();

        return new OrderResponseDTO(order.Id, order.UserId, order.OrderDate, order.SubTotal,
            order.DiscountAmount, order.AppliedCouponCode, order.PointsUsed, order.PointDiscount,
            order.TotalAmount, order.PaymentMethod, order.Status, order.ShipperId, details,
            order.RecipientName, order.RecipientPhone, order.DeliveryAddress, order.DeliverySlot,
            order.DeliveryNotes, order.LeaveAtDoorstep, order.ShippingFee, order.ToteDeposit,
            order.TipAmount, order.OnlinePaymentConfirmedAt,
            order.PaymentExpiresAt is DateTime expiry ? new DateTimeOffset(DateTime.SpecifyKind(expiry, DateTimeKind.Utc)) : null);
    }


    public async Task<OrderResponseDTO> GetOrderByIdAsync(int orderId, int? ownerId, CancellationToken ct = default)
    {
        var order = await _unitOfWork.Orders.GetOrderWithDetailsAsync(orderId, ct);
        if (order is null || (ownerId.HasValue && order.UserId != ownerId))
            throw new NotFoundException("Không tìm thấy đơn hàng.");

        return ToResponse(order);
    }

    public async Task<IEnumerable<OrderResponseDTO>> GetOrdersByStatusAsync(OrderStatus? status = null, CancellationToken ct = default)
    {
        var orders = await _unitOfWork.Orders.GetOrdersWithDetailsAsync(status, ct);
        return orders.Select(order => ToResponse(order)).ToList();
    }

    public async Task<IEnumerable<OrderResponseDTO>> GetUserOrdersAsync(int userId, CancellationToken ct = default)
    {
        var orders = await _unitOfWork.Orders.GetUserOrdersAsync(userId, ct);
        return orders.Select(order => ToResponse(order)).ToList();
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

        var discountHtml = order.DiscountAmount > 0
            ? $@"<tr>
                    <td colspan='3' style='padding: 6px 10px; font-size: 14px; color: #6b7280; text-align: right;'>Giảm giá ({order.AppliedCouponCode}):</td>
                    <td style='padding: 6px 10px; font-size: 14px; font-weight: bold; color: #ef4444; text-align: right;'>-{order.DiscountAmount.ToString("N0")} đ</td>
                 </tr>"
            : "";

        var pointDiscountHtml = (order.PointDiscount.HasValue && order.PointDiscount.Value > 0)
            ? $@"<tr>
                    <td colspan='3' style='padding: 6px 10px; font-size: 14px; color: #6b7280; text-align: right;'>Trừ điểm tích lũy (×{order.PointsUsed ?? 0} điểm):</td>
                    <td style='padding: 6px 10px; font-size: 14px; font-weight: bold; color: #ef4444; text-align: right;'>-{order.PointDiscount.Value.ToString("N0")} đ</td>
                 </tr>"
            : "";

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
                                <td colspan='3' style='padding: 12px 10px 4px; font-size: 14px; color: #4b5563; text-align: right;'>Tạm tính:</td>
                                <td style='padding: 12px 10px 4px; font-size: 14px; font-weight: bold; color: #374151; text-align: right;'>{order.SubTotal.ToString("N0")} đ</td>
                            </tr>
                            {discountHtml}
                            {pointDiscountHtml}
                            <tr>
                                <td colspan='3' style='padding: 8px 10px 5px; font-size: 14px; color: #111827; font-weight: bold; text-align: right;'>Tổng thanh toán:</td>
                                <td style='padding: 8px 10px 5px; font-size: 18px; font-weight: 800; color: #10b981; text-align: right;'>{order.TotalAmount.ToString("N0")} đ</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style='background-color: #f9fafb; padding: 18px; border-radius: 12px; border: 1px solid #e5e7eb; margin-top: 25px;'>
                        <h3 style='margin: 0 0 10px 0; font-size: 14px; color: #111827; font-weight: bold;'>📍 Địa chỉ giao nhận</h3>
                        <p style='margin: 0; font-size: 13px; color: #4b5563; line-height: 1.4;'>
                            <strong>Người nhận:</strong> {System.Net.WebUtility.HtmlEncode(order.RecipientName ?? user.FullName)}<br/>
                            <strong>Địa chỉ nhận:</strong> {System.Net.WebUtility.HtmlEncode(order.DeliveryAddress ?? string.Join(", ", new[] { user.Address1, user.Address2 }.Where(a => !string.IsNullOrWhiteSpace(a))))}
                        </p>
                        <p style='margin: 5px 0 0 0; font-size: 13px; color: #4b5563;'>
                            <strong>Số điện thoại:</strong> {System.Net.WebUtility.HtmlEncode(order.RecipientPhone ?? user.PhoneNumber)}
                        </p>
                    </div>
                </div>
                <div style='background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb;'>
                    Đây là email tự động từ hệ thống FoodDelivery. Vui lòng không phản hồi lại email này.
                </div>
            </div>";
    }

    public async Task<OrderTrackingDTO?> TrackOrderAsync(int orderId, string phone, CancellationToken ct = default)
    {
        if (orderId <= 0 || string.IsNullOrWhiteSpace(phone))
        {
            return null;
        }

        // Normalize phone: bỏ khoảng trắng, dấu chấm, dấu gạch ngang, dấu + đầu
        var normalizedInput = NormalizePhone(phone);

        var order = await _unitOfWork.Orders.GetOrderWithDetailsAsync(orderId, ct);
        if (order == null)
        {
            return null;
        }

        var user = await _unitOfWork.Users.GetByIdAsync(order.UserId, ct);
        if (user == null)
        {
            return null;
        }

        // Validate phone khớp (so sánh cả 2 normalized để tránh format sai)
        var storedNormalized = NormalizePhone(order.RecipientPhone ?? user.PhoneNumber);
        if (!string.Equals(normalizedInput, storedNormalized, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var items = (order.OrderDetails ?? new List<OrderDetail>())
            .Select(od => new OrderTrackingItemDTO(
                od.ProductId,
                od.Product?.Name ?? $"Sản phẩm #{od.ProductId}",
                od.Quantity,
                od.UnitPrice,
                od.Quantity * od.UnitPrice
            ))
            .ToList();

        return new OrderTrackingDTO(
            order.Id,
            order.OrderDate,
            order.Status.ToString(),
            order.SubTotal,
            order.DiscountAmount,
            order.TotalAmount,
            order.PaymentMethod.ToString(),
            order.RecipientName ?? user.FullName,
            MaskPhone(order.RecipientPhone ?? user.PhoneNumber),
            MaskAddress(order.DeliveryAddress ?? user.Address1, order.DeliveryAddress == null ? user.Address2 : null),
            items
        );
    }

    /// <summary>
    /// Chuẩn hóa số điện thoại để so sánh: bỏ khoảng trắng, dấu chấm, dấu gạch ngang, dấu cộng và mã vùng +84.
    /// </summary>
    private static string NormalizePhone(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        var p = phone.Trim().Replace(" ", "").Replace(".", "").Replace("-", "");
        if (p.StartsWith("+84")) p = "0" + p[3..];
        return p;
    }

    /// <summary>
    /// Mask số điện thoại: 098xxxx123 (chỉ hiện 3 số đầu + 3 số cuối).
    /// </summary>
    private static string MaskPhone(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return string.Empty;
        var normalized = NormalizePhone(phone);
        if (normalized.Length <= 6) return new string('*', normalized.Length);
        return $"{normalized[..3]}****{normalized[^3..]}";
    }

    /// <summary>
    /// Mask địa chỉ: giữ lại phần district/city (từ dấu phẩy cuối cùng trở về sau), ẩn phần số nhà + tên đường.
    /// Ví dụ: "123 Nguyễn Huệ, Quận 1, TP.HCM" → "***Quận 1, TP.HCM".
    /// </summary>
    private static string MaskAddress(string address1, string? address2)
    {
        var full = string.IsNullOrEmpty(address2)
            ? address1
            : $"{address1}, {address2}";

        if (string.IsNullOrWhiteSpace(full)) return string.Empty;

        var parts = full.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length <= 1) return "***";

        // Giữ lại phầnQuận/Huyện + Tỉnh/TP (1-2 phần cuối), ẩn phần đầu
        var keep = parts.Length >= 2 ? parts[^2..] : parts;
        return "***" + string.Join(", ", keep);
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
