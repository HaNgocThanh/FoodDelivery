using System.Data;
using System.Data.Common;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using FoodDelivery.Application.Interfaces;
using FoodDelivery.Application.DTOs.User;
using FoodDelivery.Infrastructure.Data;
using FoodDelivery.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace FoodDelivery.Tests;

public class PasswordRecoveryTests
{
    private const string Address = "customer@example.invalid";

    [Fact]
    public void PasswordHashesUseUniqueSaltAndAcceptLegacyForUpgrade()
    {
        const string password = "test-password";
        var legacy = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(password + "FoodDelivery_Salt_2026")));
        var current = AuthService.HashPassword(password);
        Assert.NotEqual(current, AuthService.HashPassword(password));
        Assert.Equal(PasswordVerificationResult.Success, AuthService.VerifyPassword(password, current));
        Assert.Equal(PasswordVerificationResult.SuccessRehashNeeded, AuthService.VerifyPassword(password, legacy));
        Assert.Equal(PasswordVerificationResult.Failed, AuthService.VerifyPassword("incorrect", legacy));
        Assert.Equal(PasswordVerificationResult.Failed, AuthService.VerifyPassword(password, "bad data"));
    }

    [Fact]
    public async Task IssueStoresDigestAndCooldownPreventsSendingAnotherCode()
    {
        var command = new RecoveryCommands();
        await using var db = OpenContext(command);
        var mail = new Mock<IEmailService>();
        var recovery = new PasswordRecoveryService(db, mail.Object, Configuration());

        command.AffectedRows = 0;
        await recovery.SendCodeAsync(Address, default);
        mail.Verify(service => service.SendEmailAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);

        command.AffectedRows = 1;
        await recovery.SendCodeAsync(Address, default);
        Assert.Contains("WHERE", command.UpdateSql);
        Assert.Contains("\"ResetPasswordExpiry\"", command.WhereSql);
        Assert.Contains("\"SessionVersion\"", command.WhereSql);
        Assert.DoesNotContain("\"PasswordHash\"", command.UpdateSql);
        mail.Verify(service => service.SendEmailAsync(Address, It.IsAny<string>(),
            It.IsRegex("<strong>[0-9]{6}</strong>")), Times.Once);
        Assert.Matches("^v1:[A-F0-9]{24}:[A-F0-9]{64}$", command.ChallengeParameter!);
    }

    [Fact]
    public async Task WrongCodeOnlyIncrementsAttemptsAndSuccessRequiresSameActiveChallenge()
    {
        var command = new RecoveryCommands();
        await using var db = OpenContext(command);
        var mail = new Mock<IEmailService>();
        string? code = null;
        mail.Setup(service => service.SendEmailAsync(Address, It.IsAny<string>(), It.IsAny<string>()))
            .Callback<string, string, string>((_, _, body) => code = Regex.Match(body, @"<strong>([0-9]{6})</strong>").Groups[1].Value)
            .Returns(Task.CompletedTask);
        var recovery = new PasswordRecoveryService(db, mail.Object, Configuration());
        await recovery.SendCodeAsync(Address, default);
        Assert.NotNull(code);
        command.Challenge = command.ChallengeParameter;

        var wrong = code == "000000" ? "000001" : "000000";
        Assert.False(await recovery.ResetAsync(Address, wrong, "new-password", default));
        Assert.Contains("\"ResetPasswordAttempts\"", command.SetSql);
        Assert.DoesNotContain("\"PasswordHash\"", command.SetSql);
        AssertActiveChallengeGuard(command);

        Assert.True(await recovery.ResetAsync(Address, code, "new-password", default));
        Assert.Contains("\"PasswordHash\"", command.SetSql);
        Assert.Contains("\"SessionVersion\"", command.SetSql);
        Assert.Contains("\"ResetPasswordToken\"", command.SetSql);
        AssertActiveChallengeGuard(command);

        command.AffectedRows = 0; // Another request consumed the challenge before the guarded write.
        Assert.False(await recovery.ResetAsync(Address, code, "new-password", default));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("123456")]
    public async Task MissingOrLegacyChallengeCannotChangePassword(string? challenge)
    {
        var command = new RecoveryCommands { Challenge = challenge };
        await using var db = OpenContext(command);
        var recovery = new PasswordRecoveryService(db, Mock.Of<IEmailService>(), Configuration());
        Assert.False(await recovery.ResetAsync(Address, "123456", "new-password", default));
        Assert.Empty(command.UpdateSql);
    }

    [Fact]
    public async Task AdminCredentialChangesUpdateSessionInTheSameCommand()
    {
        var command = new RecoveryCommands();
        await using var db = OpenContext(command);
        var users = new UserService(db);

        await users.UpdateUserByAdminAsync(1, new UpdateUserByAdminDTO
        {
            Role = "Customer",
            Email = Address
        });
        Assert.Contains("CASE", command.SetSql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("\"Role\"", command.SetSql);
        Assert.Contains("\"SessionVersion\"", command.SetSql);
        Assert.DoesNotContain("\"PasswordHash\"", command.SetSql);

        await users.AdminResetUserPasswordAsync(1, "new-password");
        Assert.Contains("\"PasswordHash\"", command.SetSql);
        Assert.Contains("\"SessionVersion\"", command.SetSql);
        Assert.Contains("\"ResetPasswordToken\"", command.SetSql);
        Assert.DoesNotContain("\"Role\"", command.SetSql);
    }

    private static void AssertActiveChallengeGuard(RecoveryCommands command)
    {
        Assert.Contains("\"ResetPasswordToken\"", command.WhereSql);
        Assert.Contains("\"ResetPasswordExpiry\"", command.WhereSql);
        Assert.Contains("\"ResetPasswordAttempts\"", command.WhereSql);
        Assert.Contains("\"SessionVersion\"", command.WhereSql);
    }

    private static IConfiguration Configuration() =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:SecretKey"] = Convert.ToHexString(RandomNumberGenerator.GetBytes(32))
        }).Build();

    private static AppDbContext OpenContext(RecoveryCommands command) => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseOracle("User Id=test;Password=test;Data Source=localhost:1521/XEPDB1;")
            .AddInterceptors(command).Options);

    private sealed class RecoveryCommands : DbCommandInterceptor, IDbConnectionInterceptor
    {
        public string? Challenge { get; set; }
        public string? ChallengeParameter { get; private set; }
        public string UpdateSql { get; private set; } = "";
        public string WhereSql => UpdateSql[UpdateSql.IndexOf("WHERE", StringComparison.Ordinal)..];
        public string SetSql => UpdateSql[..UpdateSql.IndexOf("WHERE", StringComparison.Ordinal)];
        public int AffectedRows { get; set; } = 1;

        public ValueTask<InterceptionResult> ConnectionOpeningAsync(DbConnection connection, ConnectionEventData eventData,
            InterceptionResult result, CancellationToken cancellationToken = default) =>
            ValueTask.FromResult(InterceptionResult.Suppress());

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command,
            CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            var rows = new DataTable();
            rows.Columns.Add("Id", typeof(int));
            rows.Columns.Add("Email", typeof(string));
            rows.Columns.Add("SessionVersion", typeof(string));
            if (command.CommandText.Contains("\"ResetPasswordToken\"", StringComparison.Ordinal))
            {
                rows.Columns.Add("ResetPasswordToken", typeof(string));
                if (Challenge is not null)
                    rows.Rows.Add(1, Address, DBNull.Value, Challenge);
            }
            else
            {
                rows.Rows.Add(1, Address, DBNull.Value);
            }

            return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(rows.CreateDataReader()));
        }

        public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(DbCommand command,
            CommandEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            UpdateSql = command.CommandText;
            ChallengeParameter = command.Parameters.Cast<DbParameter>().Select(parameter => parameter.Value)
                .OfType<string>().FirstOrDefault(value => value.StartsWith("v1:", StringComparison.Ordinal));
            return ValueTask.FromResult(InterceptionResult<int>.SuppressWithResult(AffectedRows));
        }
    }
}
