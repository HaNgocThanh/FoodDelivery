namespace FoodDelivery.Application.DTOs.Question;

public class CreateQuestionDTO
{
    public int ProductId { get; set; }
    public string QuestionText { get; set; } = string.Empty;
}
