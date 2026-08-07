namespace FoodDelivery.Domain.Entities;

public class OrderDetail
{
    public int OrderId { get; set; }
    public int ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public bool IsReviewed { get; set; } = false;

    // Navigation properties
    public Order? Order { get; set; }
    public Product? Product { get; set; }
}
