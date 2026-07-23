namespace FoodDelivery.Application.DTOs.Support;

public class CreateTicketDTO
{
    public int? OrderId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
