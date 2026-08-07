namespace FoodDelivery.Application.DTOs.Review;

public class CreateReviewRequest
{
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
}
