using FoodDelivery.Application.DTOs.User;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Enums;
using FoodDelivery.Domain.Exceptions;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _context;

    public UserService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<UserProfileResponseDTO> GetUserProfileAsync(int userId, CancellationToken ct = default)
    {
        var user = await _context.AppUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user == null)
        {
            throw new NotFoundException($"Không tìm thấy người dùng với ID #{userId}.");
        }

        return new UserProfileResponseDTO(
            user.Id,
            user.FullName,
            user.Email,
            user.PhoneNumber,
            user.Address1,
            user.Address2,
            user.LoyaltyPoints,
            user.Tier,
            user.Role ?? "Customer"
        );
    }

    public async Task<UserPaginatedResponseDTO> GetPaginatedUsersAsync(int page = 1, int pageSize = 10, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1) pageSize = 10;

        var query = _context.AppUsers.AsNoTracking();
        var totalCount = await query.CountAsync(ct);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var users = await query
            .OrderByDescending(u => u.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new UserProfileResponseDTO(
                u.Id,
                u.FullName,
                u.Email,
                u.PhoneNumber,
                u.Address1,
                u.Address2,
                u.LoyaltyPoints,
                u.Tier,
                u.Role ?? "Customer"
            ))
            .ToListAsync(ct);

        return new UserPaginatedResponseDTO(
            users,
            totalCount,
            page,
            pageSize,
            totalPages
        );
    }

    public async Task<bool> UpdateUserByAdminAsync(int userId, UpdateUserByAdminDTO dto, CancellationToken ct = default)
    {
        var newVersion = Guid.NewGuid().ToString("N");
        var changePoints = dto.ExpectedLoyaltyPoints != dto.LoyaltyPoints;
        var changeTier = dto.ExpectedTier != dto.Tier;
        var users = _context.AppUsers.Where(user => user.Id == userId);
        if (changePoints && dto.ExpectedLoyaltyPoints.HasValue)
            users = users.Where(user => user.LoyaltyPoints == dto.ExpectedLoyaltyPoints.Value);
        if (changeTier && dto.ExpectedTier.HasValue)
            users = users.Where(user => user.Tier == dto.ExpectedTier.Value);

        var updated = await users
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.SessionVersion, user =>
                    user.Role != dto.Role || user.Email != dto.Email ? newVersion : user.SessionVersion)
                .SetProperty(user => user.ResetPasswordToken, user =>
                    user.Role != dto.Role || user.Email != dto.Email ? null : user.ResetPasswordToken)
                .SetProperty(user => user.FullName, dto.FullName)
                .SetProperty(user => user.Email, dto.Email)
                .SetProperty(user => user.PhoneNumber, dto.PhoneNumber)
                .SetProperty(user => user.Address1, dto.Address1)
                .SetProperty(user => user.Address2, dto.Address2)
                .SetProperty(user => user.LoyaltyPoints, user => changePoints ? dto.LoyaltyPoints : user.LoyaltyPoints)
                .SetProperty(user => user.Tier, user => changeTier ? dto.Tier : user.Tier)
                .SetProperty(user => user.Role, dto.Role), ct);

        if (updated == 0)
        {
            if (await _context.AppUsers.AnyAsync(user => user.Id == userId, ct))
                throw new ConcurrentWriteException("Điểm hoặc hạng thành viên đã thay đổi. Hãy tải lại trước khi lưu.");

            throw new NotFoundException($"Không tìm thấy người dùng với ID #{userId}.");
        }

        return true;
    }

    public async Task<bool> AdminResetUserPasswordAsync(int userId, string newPassword, CancellationToken ct = default)
    {
        var passwordHash = AuthService.HashPassword(newPassword);
        var newVersion = Guid.NewGuid().ToString("N");
        var updated = await _context.AppUsers.Where(user => user.Id == userId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.PasswordHash, passwordHash)
                .SetProperty(user => user.ResetPasswordToken, (string?)null)
                .SetProperty(user => user.ResetPasswordExpiry, (DateTime?)null)
                .SetProperty(user => user.ResetPasswordAttempts, 0)
                .SetProperty(user => user.SessionVersion, newVersion), ct);

        if (updated == 0)
            throw new NotFoundException($"Không tìm thấy người dùng với ID #{userId}.");

        return true;
    }
}
