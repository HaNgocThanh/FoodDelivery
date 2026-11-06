using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace FoodDelivery.Infrastructure.Services;

public sealed class PasswordRecoveryService(AppDbContext context, IEmailService email, IConfiguration configuration)
{
    private const int MaxAttempts = 5;
    private const string FormatPrefix = "v1:";
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan ResendInterval = TimeSpan.FromMinutes(1);

    public async Task SendCodeAsync(string address, CancellationToken ct)
    {
        var account = await context.AppUsers.AsNoTracking()
            .Where(user => user.Email.ToLower() == address)
            .Select(user => new { user.Id, user.Email, user.SessionVersion })
            .FirstOrDefaultAsync(ct);
        if (account is null) return;

        var code = RandomNumberGenerator.GetInt32(1_000_000).ToString("D6", CultureInfo.InvariantCulture);
        var nonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(12));
        var challenge = FormatPrefix + nonce + ":" + Digest(account.Id, nonce, code);
        var now = DateTime.UtcNow;
        var expiresAt = now + Lifetime;
        var resendBefore = expiresAt - ResendInterval;
        var updated = await context.AppUsers
            .Where(user => user.Id == account.Id && user.Email == account.Email
                && user.SessionVersion == account.SessionVersion
                && (user.ResetPasswordExpiry == null || user.ResetPasswordExpiry <= resendBefore))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.ResetPasswordToken, challenge)
                .SetProperty(user => user.ResetPasswordExpiry, expiresAt)
                .SetProperty(user => user.ResetPasswordAttempts, 0), ct);
        if (updated == 0) return;

        await email.SendEmailAsync(account.Email, "Mã đặt lại mật khẩu FoodDelivery",
            $"<p>Mã đặt lại mật khẩu của bạn là <strong>{code}</strong>.</p>" +
            "<p>Mã có hiệu lực trong 15 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>");
    }

    public async Task<bool> ResetAsync(string address, string code, string newPassword, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var account = await context.AppUsers.AsNoTracking()
            .Where(user => user.Email.ToLower() == address && user.ResetPasswordExpiry > now
                && user.ResetPasswordAttempts < MaxAttempts)
            .Select(user => new { user.Id, user.Email, user.SessionVersion, user.ResetPasswordToken })
            .FirstOrDefaultAsync(ct);
        var challenge = account?.ResetPasswordToken;
        // Reject plaintext codes issued before deployment.
        if (account is null || challenge is null || challenge.Length != 92 ||
            !challenge.StartsWith(FormatPrefix, StringComparison.Ordinal) || challenge[27] != ':')
            return false;

        var nonce = challenge.Substring(3, 24);
        var digest = Digest(account.Id, nonce, code);
        var verified = CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(challenge[28..]), Encoding.ASCII.GetBytes(digest));
        var passwordHash = verified ? AuthService.HashPassword(newPassword) : null;
        var checkedAt = DateTime.UtcNow;
        var activeChallenge = context.AppUsers.Where(user => user.Id == account.Id
            && user.Email == account.Email && user.SessionVersion == account.SessionVersion
            && user.ResetPasswordToken == challenge && user.ResetPasswordExpiry > checkedAt
            && user.ResetPasswordAttempts < MaxAttempts);

        if (!verified)
        {
            await activeChallenge.ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.ResetPasswordAttempts, user => user.ResetPasswordAttempts + 1), ct);
            return false;
        }

        var newVersion = Guid.NewGuid().ToString("N");
        var updated = await activeChallenge.ExecuteUpdateAsync(setters => setters
            .SetProperty(user => user.PasswordHash, passwordHash)
            .SetProperty(user => user.ResetPasswordToken, (string?)null)
            .SetProperty(user => user.ResetPasswordAttempts, 0)
            .SetProperty(user => user.SessionVersion, newVersion), ct);
        return updated == 1;
    }

    private string Digest(int userId, string nonce, string code)
    {
        var secret = configuration["Jwt:SecretKey"] ?? throw new InvalidOperationException("Jwt:SecretKey is required.");
        var payload = FormattableString.Invariant($"fooddelivery:password-reset:v1:{userId}:{nonce}:{code}");
        return Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(payload)));
    }
}
