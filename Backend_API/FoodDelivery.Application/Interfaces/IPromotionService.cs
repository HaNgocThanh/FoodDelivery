using FoodDelivery.Application.DTOs.Promotion;

namespace FoodDelivery.Application.Interfaces;

public interface IPromotionService
{
    Task<IEnumerable<PromotionResponseDTO>> GetAllPromotionsAsync(CancellationToken ct = default);
    Task<ValidatePromotionResponseDTO> ValidatePromotionAsync(string code, CancellationToken ct = default);
    Task<PromotionResponseDTO> CreatePromotionAsync(CreatePromotionDTO dto, CancellationToken ct = default);
}
