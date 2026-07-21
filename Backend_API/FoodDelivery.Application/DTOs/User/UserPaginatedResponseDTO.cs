namespace FoodDelivery.Application.DTOs.User;

public record UserPaginatedResponseDTO(
    IEnumerable<UserProfileResponseDTO> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);
