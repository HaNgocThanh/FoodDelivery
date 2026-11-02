# Đồng bộ danh sách và tìm kiếm — 02/11/2026

Phạm vi: `/products`, `/search`, thành phần catalog dùng chung và đồng bộ từ khóa header với route. Trang chủ giữ bố cục đã được duyệt. Mốc trước khi triển khai: `11eb20d`.

## Thay đổi

- Hai trang dùng chung CatalogPage, ProductCard, xử lý chọn số lượng/thêm giỏ và stylesheet storefront; loại các bản thẻ hàng khác nhau.
- Type catalog chuyển về `src/types/catalog.ts`; export tương thích ở page cũ được giữ. Store giỏ chỉ đổi đường dẫn import type, không đổi nghiệp vụ.
- Thay bộ lọc/chứng nhận/nông trại/giờ thu hoạch minh họa bằng danh mục và khoảng giá có API thật. Sắp xếp theo giá/tên thật; mặc định giữ thứ tự API.
- Bộ lọc và sắp xếp lưu trong URL; giá 0 vẫn được gửi, khoảng giá đảo bị chặn, Back/tải lại khôi phục lựa chọn và từ khóa header.
- Desktop có sidebar; tablet/mobile mở bộ lọc inline. Card action xếp dọc ở các kích thước hẹp để giữ khoảng cách và nhãn dễ đọc.

## Kiểm tra

- Build thành công; 7 test frontend qua (4 test cache/session hiện có và 3 test mới về query URL, giá 0/giá không hợp lệ và sắp xếp không sửa mảng cache).
- Lint không có lỗi mới; còn 3 cảnh báo cũ ở ProfilePage, ReviewModal và CustomerLiveChat.
- Detector chạy một lần trên UI thay đổi, kết quả `[]`.
- 30 kiểm tra trình duyệt được ghi trong `.impeccable/review/catalog/checks.json`: tìm từ header; danh mục; khoảng giá thật; sắp xếp; chặn giá đảo; giá 0; xóa chip; Back/tải lại; mở/áp dụng bộ lọc mobile; hàng hết/giới hạn tồn; đồng bộ với trang chủ; giỏ nhận đúng đơn giá và thành tiền; lỗi API và Thử lại; từ khóa dài; không tràn ngang ở 5 kích thước cho mỗi trang.
- Dữ liệu kiểm thử: catalog Oracle hiện có 8 sản phẩm; khoảng 100.000–150.000đ trả 5; tìm “Rau” trả 2; giá 0–0 không có kết quả. Thêm 2 ba rọi heo: đơn giá150.000đ, thành tiền300.000đ. Đã xóa món thử khỏi giỏ.
- API được tạm dừng rồi khởi động lại để kiểm tra lỗi/khôi phục; API và Vite được để chạy phục vụ xem bản local. Máy nay đã có ASP.NET Core Runtime8.0.33, API chạy bằng runtime8 bình thường.
- Ảnh toàn trang từ đầu tài liệu ở 320/390/768/1280/1440px cho cả hai route; đối chiếu trang chủ1440/390px. Ảnh empty/error/filter mở/từ khóa dài cũng được lưu và kiểm tra.
- Không tạo/thay raster; ảnh hero đã có nguồn nhúng, ảnh sản phẩm lấy từ API. Không sửa backend, checkout, thanh toán hay giao diện chi tiết trong bước này.

## Review

Reviewer độc lập đã xem đủ16 ảnh, xác nhận bố cục/thao tác và hồi quy trang chủ phù hợp. Phát hiện duy nhất: tài liệu DESIGN.md chưa cập nhật phạm vi tìm kiếm/catalog. Documenter đã cập nhật DESIGN.md và sidecar; reviewer chấm lỗi tài liệu đã giải quyết, disposition `ship` cho mục sửa này, giữ nguyên kết quả review thị giác trước đó.

Giới hạn: catalog hiện có 8 sản phẩm nên nút Xem thêm (trên12 sản phẩm) được kiểm tra trong mã nguồn, chưa có dữ liệu thật để kích hoạt qua trình duyệt. Bóng tròn nhiều màu trong ảnh local là TanStack devtools chỉ có trong Development.
