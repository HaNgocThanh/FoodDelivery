using System.Collections.Concurrent;
using System.Globalization;
using System.Security.Claims;
using FoodDelivery.Infrastructure.Data;
using FoodDelivery.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace FoodDelivery.API.Auth;

public sealed class UserSessions
{
    internal sealed record Session(int UserId, string Version, string Role);

    private readonly ConcurrentDictionary<string, Session> _admins = new();
    private readonly ConcurrentDictionary<string, string> _customers = new();

    internal void JoinCustomer(string connectionId, string name) => _customers[connectionId] = name;
    internal bool LeaveCustomer(string connectionId) => _customers.TryRemove(connectionId, out _);
    internal bool TryGetCustomer(string connectionId, out string? name) => _customers.TryGetValue(connectionId, out name);

    internal static Session? FromPrincipal(ClaimsPrincipal? principal)
    {
        if (principal?.Identity?.IsAuthenticated != true ||
            !int.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), NumberStyles.None,
                CultureInfo.InvariantCulture, out var userId) || userId <= 0)
            return null;

        var version = principal.FindFirstValue(TokenService.SessionClaim);
        var role = principal.FindFirstValue(ClaimTypes.Role);
        return string.IsNullOrWhiteSpace(version) || string.IsNullOrWhiteSpace(role)
            ? null : new Session(userId, version, role);
    }

    internal static Task<bool> IsCurrentAsync(AppDbContext context, Session session, CancellationToken ct) =>
        context.AppUsers.AsNoTracking().AnyAsync(user => user.Id == session.UserId
            && (user.SessionVersion ?? TokenService.InitialSessionVersion) == session.Version
            && (user.Role ?? "Customer") == session.Role, ct);

    internal void JoinAdmin(string connectionId, Session session) => _admins[connectionId] = session;
    internal void LeaveAdmin(string connectionId) => _admins.TryRemove(connectionId, out _);

    internal async Task<IReadOnlyList<string>> GetCurrentAdminsAsync(AppDbContext context, CancellationToken ct)
    {
        var connections = _admins.ToArray();
        if (connections.Length == 0) return [];

        var userIds = connections.Select(connection => connection.Value.UserId).Distinct().ToArray();
        var versions = await context.AppUsers.AsNoTracking()
            .Where(user => userIds.Contains(user.Id) && user.Role == "Admin")
            .ToDictionaryAsync(user => user.Id, user => user.SessionVersion ?? TokenService.InitialSessionVersion, ct);

        var recipients = new List<string>();
        foreach (var (connectionId, session) in connections)
        {
            if (versions.TryGetValue(session.UserId, out var version) && version == session.Version)
                recipients.Add(connectionId);
            else
                _admins.TryRemove(new KeyValuePair<string, Session>(connectionId, session));
        }

        return recipients;
    }
}
