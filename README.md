# FoodDelivery

FoodDelivery là ứng dụng thương mại điện tử để mua thực phẩm và quản lý giao hàng. Khách có thể chọn sản phẩm theo giá và tồn kho, đặt lịch giao, theo dõi đơn và liên hệ hỗ trợ. Quản trị viên xử lý đơn và điều phối giao hàng từ một giao diện riêng.

## Tính năng

- **Khách hàng** — Duyệt và tìm kiếm sản phẩm, quản lý giỏ hàng, áp dụng voucher và điểm tích lũy, đặt hàng COD, theo dõi đơn, đánh giá sản phẩm đã mua và chat với bộ phận hỗ trợ.
- **Quản trị** — Quản lý sản phẩm, tồn kho, khuyến mãi và khách hàng. Duyệt đơn, phân công shipper, cập nhật giao hàng, theo dõi doanh thu và trả lời yêu cầu hỗ trợ.
- **Xử lý đơn hàng** — Checkout tính lại giá và tồn kho trên máy chủ. Gửi lại cùng nội dung và khóa đặt hàng sẽ trả về đơn đã tạo. Đơn online mới chưa thanh toán hết hạn sau 15 phút và được hủy qua luồng hoàn kho, lượt voucher và điểm đã dùng.
- **Xác thực** — JWT và phân quyền Customer, Admin, Shipper. Khôi phục mật khẩu bằng OTP qua email khi đã cấu hình SMTP.

Thanh toán online hiện dùng mô phỏng trong Development. Chat SignalR chuyển tiếp tin nhắn giữa các kết nối đang hoạt động và không lưu lịch sử.

## Công nghệ và cấu trúc

- [`Frontend_UI/`](Frontend_UI) — React 19, TypeScript, Vite 8, Tailwind CSS, TanStack Query và Zustand.
- [`Backend_API/FoodDelivery.API/`](Backend_API/FoodDelivery.API) — ASP.NET Core 8 Web API, JWT, SignalR và Swagger.
- [`Backend_API/FoodDelivery.Application/`](Backend_API/FoodDelivery.Application) và [`Backend_API/FoodDelivery.Domain/`](Backend_API/FoodDelivery.Domain) — Nghiệp vụ, mô hình dữ liệu và hợp đồng dịch vụ.
- [`Backend_API/FoodDelivery.Infrastructure/`](Backend_API/FoodDelivery.Infrastructure) — EF Core 8, Oracle, migration và tích hợp SMTP, Cloudinary.
- [`Backend_API/FoodDelivery.Tests/`](Backend_API/FoodDelivery.Tests) và [`Frontend_UI/tests/`](Frontend_UI/tests) — Kiểm thử nghiệp vụ và các luồng phía giao diện.

## Chạy cục bộ

Cần .NET 8 SDK, Node.js từ 22.12, npm, PowerShell 7.2 trở lên cho các lệnh bên dưới, và một schema Oracle có quyền chạy migration. Chạy các lệnh từ thư mục gốc của repo.

### 1. Cấu hình API

Lưu chuỗi kết nối Oracle và khóa JWT vào User Secrets của dự án API. Khi được hỏi, nhập chuỗi kết nối theo mẫu `User Id=<user>;Password=<password>;Data Source=<host>:<port>/<service>`.

```powershell
$apiProject = 'Backend_API/FoodDelivery.API'
$oracleConnection = Read-Host 'Chuỗi kết nối Oracle' -MaskInput
$jwtKey = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
@{ 'ConnectionStrings:OracleConnection' = $oracleConnection; 'Jwt:SecretKey' = $jwtKey } |
    ConvertTo-Json -Compress | dotnet user-secrets set --project $apiProject
Remove-Variable oracleConnection, jwtKey
```

Các cấu hình tùy theo tính năng:

- Email và OTP dùng `EmailSettings:Email` và `EmailSettings:Password`.
- Tải ảnh dùng `CloudinarySettings:CloudName`, `CloudinarySettings:ApiKey` và `CloudinarySettings:ApiSecret`.
- Để nạp tài khoản và danh mục mẫu trên schema phát triển, đặt `DemoSeed:Enabled=true` và `DemoSeed:Password` dài tối thiểu 16 ký tự trong User Secrets. Seed chạy khi khởi động API và tạo Admin mẫu `admin@fooddelivery.com` nếu tài khoản chưa tồn tại.

### 2. Cập nhật Oracle và chạy backend

Cài `dotnet-ef` phiên bản 8 nếu máy chưa có, sau đó chạy migration và API.

```powershell
dotnet tool install --global dotnet-ef --version 8.0.3
dotnet ef database update --project Backend_API/FoodDelivery.Infrastructure --startup-project Backend_API/FoodDelivery.API -- --environment Development
dotnet run --project Backend_API/FoodDelivery.API --launch-profile http
```

API chạy tại `http://localhost:5156`. Mở [Swagger](http://localhost:5156/swagger) để xem endpoint. Kiểm tra tiến trình qua `/health/live` và kết nối Oracle qua `/health/ready`.

### 3. Chạy frontend

Mở terminal thứ hai tại thư mục gốc của repo.

```powershell
Set-Location Frontend_UI
npm ci
npm run dev -- --strictPort
```

Mở [FoodDelivery](http://localhost:5173). Nếu đổi địa chỉ API hoặc SignalR, cập nhật `VITE_API_BASE_URL` và `VITE_SIGNALR_HUB_URL` ở frontend. Nếu đổi địa chỉ frontend, cập nhật `AllowedOrigins` và `FrontendUrl` ở API.

## Kiểm thử

```powershell
dotnet test Backend_API/FoodDelivery.Tests
Set-Location Frontend_UI
npm test
npm run build
```

Các ca tích hợp Oracle mặc định được bỏ qua. Để chạy, đặt biến môi trường `FOODDELIVERY_ORACLE_CONCURRENCY_TEST` thành chuỗi kết nối của schema Oracle cục bộ đã chạy migration.
