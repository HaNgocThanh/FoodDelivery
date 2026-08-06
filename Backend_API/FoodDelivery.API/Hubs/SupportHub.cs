using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace FoodDelivery.API.Hubs;

/// <summary>
/// SignalR Hub cho chat hỗ trợ khách hàng thời gian thực giữa Customer và Admin.
///
/// Contract (phải khớp với Frontend `AdminLiveChat.jsx` và `CustomerLiveChat.jsx`):
/// ----------------------------------------------------------------------
///  - Client → Server:
///       JoinAdminGroup()                    : Admin đăng ký nhận broadcast từ khách
///       JoinCustomerGroup(string senderName): Khách đăng ký nhận phản hồi từ Admin
///       SendMessageToAdmin(string message)  : Khách gửi tin nhắn (tới tất cả Admin)
///       ReplyToClient(string connectionId, string message): Admin phản hồi tới 1 khách
///       LeaveCustomerGroup()                : Khách ngắt kết nối chủ động
///
///  - Server → Client (broadcast):
///       ReceiveMessage(senderName, message, connectionId)
///                                              : phát cho group khi có tin nhắn mới
///
/// Tin nhắn KHÔNG lưu DB theo yêu cầu (chỉ forward realtime).
/// Khi server restart, toàn bộ lịch sử chat bị mất.
/// </summary>
[AllowAnonymous]
public class SupportHub : Hub
{
    private const string AdminGroup = "admin-group";
    private const string CustomerGroupPrefix = "customer-group:"; // customer-group:{connectionId}

    public override async Task OnConnectedAsync()
    {
        // Tự động join 1 group riêng theo connectionId để Admin có thể target riêng khách này
        // (cho tính năng "trả lời cá nhân" tương lai — ngoài broadcast group)
        await Groups.AddToGroupAsync(Context.ConnectionId, CustomerGroupPrefix + Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, CustomerGroupPrefix + Context.ConnectionId);
        // Thông báo cho admin biết khách vừa thoát
        await Clients.Group(AdminGroup).SendAsync(
            "ReceiveMessage",
            "🔔 Hệ thống",
            $"Khách ({Context.ConnectionId[..Math.Min(8, Context.ConnectionId.Length)]}…) đã ngắt kết nối.",
            Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Admin đăng ký nhận broadcast tin nhắn từ tất cả khách.
    /// </summary>
    public async Task JoinAdminGroup()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, AdminGroup);
        await Clients.Caller.SendAsync(
            "ReceiveMessage",
            "🔔 Hệ thống",
            "Bạn đã vào group Admin. Đang chờ tin nhắn từ khách hàng...",
            "system");
    }

    /// <summary>
    /// Khách hàng đăng ký nhóm của mình + thông báo tên hiển thị.
    /// </summary>
    public async Task JoinCustomerGroup(string senderName)
    {
        if (string.IsNullOrWhiteSpace(senderName))
            senderName = "Khách hàng";

        // Lưu tên vào Connection metadata (để Admin broadcast lại còn biết tên)
        var cid = Context.ConnectionId;
        await Clients.Group(AdminGroup).SendAsync(
            "ReceiveMessage",
            "🔔 Hệ thống",
            $"Khách \"{senderName}\" vừa mở cửa sổ chat. ID: {cid[..Math.Min(8, cid.Length)]}…",
            cid);

        await Clients.Caller.SendAsync(
            "ReceiveMessage",
            "🛟 Hỗ trợ",
            $"Xin chào {senderName}! Bạn có thể nhắn tin ở đây, đội ngũ Admin sẽ phản hồi sớm nhất.",
            "system");
    }

    /// <summary>
    /// Khách gửi tin nhắn tới Admin (broadcast cho group Admin).
    /// </summary>
    public async Task SendMessageToAdmin(string message)
    {
        if (string.IsNullOrWhiteSpace(message)) return;

        var cid = Context.ConnectionId;
        // Lấy tên hiển thị từ claim nếu user đã đăng nhập, fallback "Khách hàng"
        var senderName = Context.User?.FindFirst(ClaimTypes.Name)?.Value
                         ?? Context.User?.Identity?.Name
                         ?? "Khách hàng";

        await Clients.Group(AdminGroup).SendAsync("ReceiveMessage", senderName, message, cid);
    }

    /// <summary>
    /// Admin phản hồi lại một khách cụ thể theo connectionId.
    /// </summary>
    public async Task ReplyToClient(string connectionId, string message)
    {
        if (string.IsNullOrWhiteSpace(connectionId) || string.IsNullOrWhiteSpace(message))
            return;

        var senderName = Context.User?.FindFirst(ClaimTypes.Name)?.Value
                         ?? Context.User?.Identity?.Name
                         ?? "Admin (Hỗ trợ)";

        // Gửi tới group riêng của khách đó (đảm bảo chỉ khách đó nhận)
        await Clients.Group(CustomerGroupPrefix + connectionId).SendAsync(
            "ReceiveMessage", senderName, message, Context.ConnectionId);

        // Echo lại cho chính Admin (để các Admin khác cũng thấy được cuộc hội thoại)
        await Clients.Group(AdminGroup).SendAsync(
            "ReceiveMessage", "[Admin] " + senderName, message, connectionId);
    }

    /// <summary>
    /// Khách ngắt kết nối chủ động.
    /// </summary>
    public async Task LeaveCustomerGroup()
    {
        await OnDisconnectedAsync(null);
    }
}
