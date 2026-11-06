using System.Security.Cryptography;
using System.Text;
using FoodDelivery.Application.DTOs.Auth;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Domain.Entities;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace FoodDelivery.Infrastructure.Services;

public class AuthService : IAuthService
{
    private static readonly PasswordHasher<AppUser> PasswordHasher = new(
        Options.Create(new PasswordHasherOptions { IterationCount = 220_000 }));

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

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.AppUsers.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail, ct);

        var verification = VerifyPassword(dto.Password, user?.PasswordHash);
        if (user == null || verification == PasswordVerificationResult.Failed)
        {
            throw new ArgumentException("Email hoặc mật khẩu không chính xác.");
        }

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            var oldHash = user.PasswordHash;
            var sessionVersion = user.SessionVersion;
            var upgradedHash = HashPassword(dto.Password);
            var updated = await _context.AppUsers.Where(account => account.Id == user.Id
                    && account.PasswordHash == oldHash && account.SessionVersion == sessionVersion)
                .ExecuteUpdateAsync(setters => setters.SetProperty(account => account.PasswordHash, upgradedHash), ct);

            if (updated == 0)
            {
                user = await _context.AppUsers.AsNoTracking()
                    .SingleOrDefaultAsync(account => account.Id == user.Id && account.SessionVersion == sessionVersion, ct);
                if (user is null || VerifyPassword(dto.Password, user.PasswordHash) == PasswordVerificationResult.Failed)
                    throw new ArgumentException("Email hoặc mật khẩu không chính xác.");
            }
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

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        if (dto.Password.Length is < 6 or > 100)
            throw new ArgumentException("Mật khẩu cần từ 6 đến 100 ký tự.");

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
            Role = "Customer",
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

    public static string HashPassword(string password) => PasswordHasher.HashPassword(new AppUser(), password);

    public static PasswordVerificationResult VerifyPassword(string password, string? storedHash)
    {
        if (string.IsNullOrWhiteSpace(storedHash)) return PasswordVerificationResult.Failed;

        try
        {
            var hashBytes = Convert.FromBase64String(storedHash);
            // The old format is a 32-byte SHA-256 digest. Identity hashes include version and salt.
            if (hashBytes.Length != 32)
                return PasswordHasher.VerifyHashedPassword(new AppUser(), storedHash, password);

            var legacy = SHA256.HashData(Encoding.UTF8.GetBytes(password + "FoodDelivery_Salt_2026"));
            return CryptographicOperations.FixedTimeEquals(legacy, hashBytes)
                ? PasswordVerificationResult.SuccessRehashNeeded : PasswordVerificationResult.Failed;
        }
        catch (FormatException)
        {
            return PasswordVerificationResult.Failed;
        }
    }
}
