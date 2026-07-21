namespace FoodDelivery.Application.DTOs.Statistics;

public record RevenueByDayDTO(
    string Date,
    decimal Revenue,
    int OrderCount
);
