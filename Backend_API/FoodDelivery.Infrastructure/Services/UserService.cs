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
        var user = await _context.AppUsers.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null)
        {
            throw new NotFoundException($"Không tìm thấy người dùng với ID #{userId}.");
        }

        user.FullName = dto.FullName;
        user.Email = dto.Email;
        user.PhoneNumber = dto.PhoneNumber;
        user.Address1 = dto.Address1;
        user.Address2 = dto.Address2;
        user.LoyaltyPoints = dto.LoyaltyPoints;
        user.Tier = dto.Tier;
        user.Role = dto.Role;

        _context.AppUsers.Update(user);
        await _context.SaveChangesAsync(ct);
        return true;
    }
}
