using FoodDelivery.Domain.Entities;

namespace FoodDelivery.Application.Interfaces;

public interface ITokenService
{
    (string token, DateTime expiresAt) GenerateToken(AppUser user);
}
