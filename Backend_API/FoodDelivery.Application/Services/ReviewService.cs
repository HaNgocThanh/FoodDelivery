using FoodDelivery.Application.DTOs.Review;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Enums;
using FoodDelivery.Domain.Exceptions;
using FoodDelivery.Domain.Interfaces;

namespace FoodDelivery.Application.Services;

public class ReviewService : IReviewService
{
    private readonly IUnitOfWork _unitOfWork;
    private const int PointsPerReview = 10;

    public ReviewService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<ReviewDto> CreateReviewAsync(CreateReviewRequest request, int userId, CancellationToken ct = default)
    {
        if (request.Rating < 1 || request.Rating > 5)
        {
            throw new ArgumentException("Rating phải từ 1 đến 5 sao.");
        }

        if (string.IsNullOrWhiteSpace(request.Comment))
        {
            throw new ArgumentException("Comment không được để trống.");
        }

        await _unitOfWork.BeginTransactionAsync(ct);

        try
        {
            // Bước 1: Lấy Order kèm OrderDetails
            var order = await _unitOfWork.Orders.GetOrderWithDetailsAsync(request.OrderId, ct)
                ?? throw new NotFoundException($"Đơn hàng #{request.OrderId} không tồn tại.");

            // Bước 2: Kiểm tra Order thuộc về User đang đăng nhập
            if (order.UserId != userId)
            {
                throw new ForbiddenException("Bạn không có quyền đánh giá đơn hàng này.");
            }

            // Bước 3: Kiểm tra Order đã Completed chưa
            if (order.Status != OrderStatus.Completed)
            {
                throw new InvalidOperationException("Chỉ có thể đánh giá đơn hàng đã hoàn tất.");
            }

            // Bước 4: Tìm OrderDetail tương ứng với ProductId
            var orderDetail = order.OrderDetails
                .FirstOrDefault(od => od.ProductId == request.ProductId)
                ?? throw new NotFoundException($"Sản phẩm #{request.ProductId} không có trong đơn hàng #{request.OrderId}.");

            // Bước 5: Kiểm tra đã đánh giá chưa (chống spam)
            if (orderDetail.IsReviewed)
            {
                throw new InvalidOperationException("Sản phẩm này trong đơn hàng đã được đánh giá.");
            }

            // Bước 6: Tạo Review
            var review = new Review
            {
                ProductId = request.ProductId,
                UserId = userId,
                OrderId = request.OrderId,
                Rating = request.Rating,
                Comment = request.Comment,
                CreatedAt = DateTime.UtcNow
            };

            await _unitOfWork.Reviews.AddAsync(review, ct);

            // Bước 7: Đánh dấu OrderDetail đã đánh giá
            orderDetail.IsReviewed = true;

            // Bước 8: Cộng 10 điểm LoyaltyPoints cho User
            var user = await _unitOfWork.Users.GetByIdAsync(userId, ct)
                ?? throw new NotFoundException("Không tìm thấy người dùng.");

            user.LoyaltyPoints += PointsPerReview;

            // Bước 9: Commit transaction
            await _unitOfWork.CommitTransactionAsync(ct);

            return new ReviewDto(
                review.Id,
                review.ProductId,
                review.UserId,
                review.OrderId,
                review.Rating,
                review.Comment,
                review.CreatedAt
            );
        }
        catch
        {
            await _unitOfWork.RollbackTransactionAsync(ct);
            throw;
        }
    }
}
