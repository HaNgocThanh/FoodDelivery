using System.Security.Cryptography;
using System.Text;
using FoodDelivery.Application.DTOs.Auth;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly ITokenService _tokenService;

    public AuthService(AppDbContext context, ITokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

    public async Task<AuthResponseDTO> LoginAsync(LoginRequestDTO dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
        {
            throw new ArgumentException("Vui lòng nhập đầy đủ Email và Mật khẩu.");
        }

        var normalizedEmail = dto.Email.Trim().ToLower();
        var user = await _context.AppUsers
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, ct);

        if (user == null || !VerifyPassword(dto.Password, user.PasswordHash))
        {
            throw new ArgumentException("Email hoặc mật khẩu không chính xác.");
        }

        var (token, expiresAt) = _tokenService.GenerateToken(user);

        return new AuthResponseDTO(
            token,
            user.Id,
            user.FullName,
            user.Email,
            user.Role ?? "Customer",
            expiresAt
        );
    }

    public async Task<AuthResponseDTO> RegisterAsync(RegisterRequestDTO dto, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(dto.FullName))
        {
            throw new ArgumentException("Vui lòng điền đầy đủ Họ tên, Email và Mật khẩu.");
        }

        var normalizedEmail = dto.Email.Trim().ToLower();
        var existingUser = await _context.AppUsers
            .AnyAsync(u => u.Email.ToLower() == normalizedEmail, ct);

        if (existingUser)
        {
            throw new ArgumentException($"Email '{dto.Email}' đã được đăng ký sử dụng.");
        }

        var user = new AppUser
        {
            FullName = dto.FullName.Trim(),
            Email = normalizedEmail,
            PhoneNumber = dto.PhoneNumber?.Trim() ?? string.Empty,
            Address1 = dto.Address1?.Trim() ?? string.Empty,
            Address2 = dto.Address2?.Trim(),
            PasswordHash = HashPassword(dto.Password),
            Role = string.IsNullOrWhiteSpace(dto.Role) ? "Customer" : dto.Role,
            LoyaltyPoints = 0
        };

        await _context.AppUsers.AddAsync(user, ct);
        await _context.SaveChangesAsync(ct);

        var (token, expiresAt) = _tokenService.GenerateToken(user);

        return new AuthResponseDTO(
            token,
            user.Id,
            user.FullName,
            user.Email,
            user.Role ?? "Customer",
            expiresAt
        );
    }

    public static string HashPassword(string password)
    {
        if (string.IsNullOrEmpty(password)) return string.Empty;
        using var sha256 = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(password + "FoodDelivery_Salt_2026");
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    public static bool VerifyPassword(string password, string? storedHash)
    {
        if (string.IsNullOrEmpty(storedHash)) return false;
        var hash = HashPassword(password);
        return hash == storedHash;
    }
}
