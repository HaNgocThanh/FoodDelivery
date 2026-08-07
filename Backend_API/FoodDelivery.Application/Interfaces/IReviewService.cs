using FoodDelivery.Application.DTOs.Review;

namespace FoodDelivery.Application.Interfaces;

public interface IReviewService
{
    Task<ReviewDto> CreateReviewAsync(CreateReviewRequest request, int userId, CancellationToken ct = default);
}
