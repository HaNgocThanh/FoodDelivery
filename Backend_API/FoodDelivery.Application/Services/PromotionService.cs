using FoodDelivery.Application.DTOs.Promotion;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Domain.Enums;
using FoodDelivery.Domain.Exceptions;
using FoodDelivery.Domain.Interfaces;

namespace FoodDelivery.Application.Services;

public class PromotionService : IPromotionService
{
    private readonly IUnitOfWork _unitOfWork;

    public PromotionService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<PromotionResponseDTO>> GetAllPromotionsAsync(CancellationToken ct = default)
    {
        var promotions = await _unitOfWork.Promotions.GetAllAsync(ct);
        return promotions.Select(MapToDTO);
    }

    public async Task<ValidatePromotionResponseDTO> ValidatePromotionAsync(string code, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Mã khuyến mãi không được để trống.");
        }

        var promotion = await _unitOfWork.Promotions.GetByCodeAsync(code, ct);
        if (promotion == null)
        {
            throw new NotFoundException("Mã khuyến mãi không tồn tại.");
        }

        if (!promotion.IsActive)
        {
            throw new ArgumentException("Mã khuyến mãi này đã bị vô hiệu hóa.");
        }

        if (DateTime.UtcNow > promotion.ExpiryDate)
        {
            throw new ArgumentException("Mã khuyến mãi này đã hết hạn sử dụng.");
        }

        if (promotion.CurrentUsage >= promotion.MaxUsage)
        {
            throw new ArgumentException("Mã khuyến mãi này đã hết lượt sử dụng.");
        }

        string descMessage = promotion.DiscountType == DiscountType.Percentage
            ? $"Áp dụng thành công mã {promotion.Code}! Giảm {promotion.DiscountValue}%"
            : $"Áp dụng thành công mã {promotion.Code}! Giảm {promotion.DiscountValue:N0} đ";

        return new ValidatePromotionResponseDTO(
            promotion.Id,
            promotion.Code,
            promotion.DiscountType,
            promotion.DiscountValue,
            promotion.MaxDiscountAmount,
            promotion.MinOrderAmount,
            true,
            descMessage
        );
    }

    public async Task<PromotionResponseDTO> CreatePromotionAsync(CreatePromotionDTO dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Code))
            throw new ArgumentException("Mã khuyến mãi không được để trống.");

        if (dto.DiscountType == DiscountType.Percentage && (dto.DiscountValue <= 0 || dto.DiscountValue > 100))
            throw new ArgumentException("Phần trăm giảm giá phải từ 1% đến 100%.");

        if (dto.DiscountType == DiscountType.FixedAmount && dto.DiscountValue <= 0)
            throw new ArgumentException("Số tiền giảm giá phải lớn hơn 0.");

        if (dto.MinOrderAmount < 0)
            throw new ArgumentException("Giá trị đơn tối thiểu không được âm.");

        if (dto.MaxDiscountAmount.HasValue && dto.MaxDiscountAmount.Value <= 0)
            throw new ArgumentException("Số tiền giảm giá tối đa phải lớn hơn 0.");

        if (dto.MaxUsage <= 0)
            throw new ArgumentException("Số lượt sử dụng tối đa phải lớn hơn 0.");

        var existing = await _unitOfWork.Promotions.GetByCodeAsync(dto.Code, ct);
        if (existing != null)
            throw new ArgumentException($"Mã khuyến mãi '{dto.Code.ToUpper()}' đã tồn tại.");

        var promotion = new Promotion
        {
            Code = dto.Code.Trim().ToUpper(),
            DiscountType = dto.DiscountType,
            DiscountValue = dto.DiscountValue,
            MaxDiscountAmount = dto.MaxDiscountAmount,
            MinOrderAmount = dto.MinOrderAmount,
            MaxUsage = dto.MaxUsage,
            CurrentUsage = 0,
            ExpiryDate = dto.ExpiryDate,
            IsActive = dto.IsActive
        };

        await _unitOfWork.Promotions.AddAsync(promotion, ct);
        await _unitOfWork.SaveChangesAsync(ct);

        return MapToDTO(promotion);
    }

    private static PromotionResponseDTO MapToDTO(Promotion p) => new(
        p.Id,
        p.Code,
        p.DiscountType,
        p.DiscountValue,
        p.MaxDiscountAmount,
        p.MinOrderAmount,
        p.MaxUsage,
        p.CurrentUsage,
        p.ExpiryDate,
        p.IsActive,
        DateTime.UtcNow > p.ExpiryDate
    );
}
