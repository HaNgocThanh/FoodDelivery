using FoodDelivery.Application.DTOs.User;

namespace FoodDelivery.Application.Interfaces;

public interface IUserService
{
    Task<UserProfileResponseDTO> GetUserProfileAsync(int userId, CancellationToken ct = default);
    Task<UserPaginatedResponseDTO> GetPaginatedUsersAsync(int page = 1, int pageSize = 10, CancellationToken ct = default);
    Task<bool> UpdateUserByAdminAsync(int userId, UpdateUserByAdminDTO dto, CancellationToken ct = default);
}
