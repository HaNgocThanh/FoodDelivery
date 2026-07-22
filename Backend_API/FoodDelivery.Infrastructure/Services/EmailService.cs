using FoodDelivery.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using MimeKit;
using MailKit.Net.Smtp;
using MailKit.Security;
using System.Threading.Tasks;

namespace FoodDelivery.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;

    public EmailService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string body)
    {
        var emailSettings = _configuration.GetSection("EmailSettings");
        var host = emailSettings["Host"] ?? "smtp.gmail.com";
        var port = int.Parse(emailSettings["Port"] ?? "587");
        var fromEmail = emailSettings["Email"] ?? "hangocthanh1906@gmail.com";
        var password = emailSettings["Password"] ?? "cwsw gbvk dace sgua";

        var emailMessage = new MimeMessage();
        emailMessage.From.Add(new MailboxAddress("FoodDelivery", fromEmail));
        emailMessage.To.Add(new MailboxAddress(toEmail, toEmail));
        emailMessage.Subject = subject;

        var bodyBuilder = new BodyBuilder { HtmlBody = body };
        emailMessage.Body = bodyBuilder.ToMessageBody();

        using var client = new SmtpClient();
        
        // Kết nối tới SMTP Server Gmail qua cổng 587 với TLS
        await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
        
        // Xác thực
        await client.AuthenticateAsync(fromEmail, password);
        
        // Gửi email
        await client.SendAsync(emailMessage);
        
        // Ngắt kết nối
        await client.DisconnectAsync(true);
    }
}
