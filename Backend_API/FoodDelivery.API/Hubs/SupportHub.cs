using System.Security.Claims;
using FoodDelivery.API.Auth;
using FoodDelivery.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace FoodDelivery.API.Hubs;

// Support messages are routed only to active connections and are not persisted.
public class SupportHub(AppDbContext context, UserSessions sessions, ILogger<SupportHub> logger) : Hub
{
    private const string Accepted = "accepted";
    private const string Unavailable = "unavailable";

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        sessions.LeaveAdmin(Context.ConnectionId);
        try
        {
            await LeaveCustomerGroup();
        }
        finally
        {
            await base.OnDisconnectedAsync(exception);
        }
    }

    [Authorize(Roles = "Admin")]
    public async Task JoinAdminGroup()
    {
        var session = await RequireCurrentAdminAsync();
        sessions.JoinAdmin(Context.ConnectionId, session);
        await Clients.Caller.SendAsync("ReceiveMessage", "🔔 Hệ thống",
            "Đã kết nối hỗ trợ. Đang chờ tin nhắn từ khách hàng.", "system", "system");
    }

    public async Task JoinCustomerGroup(string senderName)
    {
        var name = senderName?.Trim();
        if (string.IsNullOrEmpty(name) || name.Length > 80 || !name.Any(char.IsLetterOrDigit))
            throw new HubException("Tên hiển thị không hợp lệ.");

        sessions.JoinCustomer(Context.ConnectionId, name);
        await Clients.Caller.SendAsync("ReceiveMessage", "🛟 Hỗ trợ",
            $"Xin chào {name}! Bạn có thể gửi câu hỏi tại đây.", "system", "system");
    }

    public async Task<string> SendMessageToAdmin(string message)
    {
        var text = ValidateMessage(message);
        if (!sessions.TryGetCustomer(Context.ConnectionId, out var senderName))
            throw new HubException("Hãy mở phiên chat trước khi gửi.");

        var recipients = await sessions.GetCurrentAdminsAsync(context, Context.ConnectionAborted);
        if (recipients.Count == 0)
            return Unavailable;

        await Clients.Clients(recipients).SendAsync("ReceiveMessage", senderName, text,
            Context.ConnectionId, "customer", Context.ConnectionAborted);
        return Accepted;
    }

    [Authorize(Roles = "Admin")]
    public async Task<string> ReplyToClient(string connectionId, string message)
    {
        await RequireCurrentAdminAsync();
        var text = ValidateMessage(message);
        if (string.IsNullOrWhiteSpace(connectionId) || !sessions.TryGetCustomer(connectionId, out _))
            return Unavailable;

        var senderName = Context.User?.FindFirstValue(ClaimTypes.Name) ?? "Hỗ trợ";
        await Clients.Client(connectionId).SendAsync("ReceiveMessage", senderName, text,
            Context.ConnectionId, "admin", Context.ConnectionAborted);

        await NotifyAdminsAsync("[Admin] " + senderName, text, connectionId, "admin");
        return Accepted;
    }

    public async Task LeaveCustomerGroup()
    {
        if (sessions.LeaveCustomer(Context.ConnectionId))
            await NotifyAdminsAsync("🔔 Hệ thống", "Khách đã ngắt kết nối.", Context.ConnectionId, "system");
    }

    private static string ValidateMessage(string message)
    {
        var text = message?.Trim();
        if (string.IsNullOrEmpty(text) || text.Length > 2000)
            throw new HubException("Tin nhắn cần có từ 1 đến 2000 ký tự.");

        return text;
    }

    private async Task<UserSessions.Session> RequireCurrentAdminAsync()
    {
        var session = UserSessions.FromPrincipal(Context.User);
        if (session is null || session.Role != "Admin" ||
            !await UserSessions.IsCurrentAsync(context, session, Context.ConnectionAborted))
        {
            sessions.LeaveAdmin(Context.ConnectionId);
            Context.Abort();
            throw new HubException("Phiên quản trị đã hết hạn.");
        }

        return session;
    }

    private async Task NotifyAdminsAsync(string sender, string message, string connectionId, string kind)
    {
        try
        {
            var recipients = await sessions.GetCurrentAdminsAsync(context, CancellationToken.None);
            if (recipients.Count > 0)
                await Clients.Clients(recipients).SendAsync("ReceiveMessage", sender, message, connectionId, kind);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Không thể đồng bộ sự kiện chat với danh sách quản trị.");
        }
    }
}
