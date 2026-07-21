namespace FoodDelivery.Application.DTOs.Review;

public class CreateReviewDTO
{
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
}
