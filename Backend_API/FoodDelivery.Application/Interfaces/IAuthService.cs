using FoodDelivery.Application.DTOs.Auth;

namespace FoodDelivery.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDTO> LoginAsync(LoginRequestDTO dto, CancellationToken ct = default);
    Task<AuthResponseDTO> RegisterAsync(RegisterRequestDTO dto, CancellationToken ct = default);
}
