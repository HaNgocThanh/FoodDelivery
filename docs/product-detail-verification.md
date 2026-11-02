# Trang chi tiết sản phẩm — 02/11/2026

## Phạm vi và dữ liệu

- Đã push hai commit trang chủ/catalog `11eb20d`, `b72af4b` lên origin/main trước khi triển khai bước này.
- Trang chi tiết đổi sang cùng hệ trắng/emerald/amber và Inter, ảnh thật và thông tin mua rõ. Mô tả dài mở theo nhu cầu; đánh giá và hỏi đáp dùng API hiện có.
- Bỏ gallery minh họa, giá gạch giả, giảm giá định kỳ, combo không có luồng thật, hồ sơ nông trại/chứng nhận và các cam kết giao hàng được dựng trong JSX cũ.
- ProductPhoto, định dạng tiền và lựa chọn số lượng dùng chung với catalog. Dùng cùng logic trừ số lượng đã có trong giỏ để giới hạn mua.
- Giữ endpoint đánh giá, hỏi đáp, lịch sử mua theo tài khoản. Form đánh giá cần đơn Completed chứa sản phẩm; backend vẫn quyết định quyền ghi. Cộng đồng được remount theo sản phẩm/tài khoản để không giữ draft/feedback của phiên cũ.
- Không đổi backend, checkout, dữ liệu sản phẩm, tài khoản hay đơn hàng. Ảnh sản phẩm từ API; không tạo raster mới.

## Kiểm tra đã thực hiện

- Build qua; 10 test frontend qua, gồm 3 test mới cho ID route và điều kiện đánh giá với enum/string Completed, sai sản phẩm và trạng thái đơn chưa hoàn tất.
- Lint chỉ còn 3 cảnh báo cũ ở ProfilePage, ReviewModal, CustomerLiveChat. Detector chạy một lần, kết quả `[]`.
- 28 kiểm tra trình duyệt, lưu tại `.impeccable/review/detail/checks.json`: tab bằng phím mũi tên/Home; ba đánh giá thật; hướng dẫn đăng nhập; hỏi đáp trống/có dữ liệu; tồn kho hai; tạm tính; thêm hai vào giỏ; khóa thêm/tăng; hàng hết; ID chữ; ID không tồn tại; lỗi API và khôi phục bằng Thử lại; link danh mục và danh sách→chi tiết; không tràn ngang ở320/390/768/1280/1440px; hồi quy trang chủ/catalog.
- Thêm2ba rọi heo kiểm tra đơn giá150.000đ, thành tiền300.000đ trong giỏ; đã xóa món thử. Không gửi đánh giá/câu hỏi mới hoặc sửa dữ liệu tài khoản.
- Bản hiện tại có ảnh và câu hỏi/phản hồi thật của Táo Ambrosia, đánh giá của thịt bò. Không thay nội dung người dùng.
- Bộ ảnh hiện tại: detail-1440/1280/768/390/320; qa-mobile; qa-existing; sold-out; invalid; missing; error; home-regression; catalog-regression. Đã kiểm tra toàn bộ ảnh, đúng route và không có trạng thái trắng/đang tải.
- API được tạm dừng/khởi động lại để kiểm tra lỗi; đang để Vite/API local chạy phục vụ xem kết quả.

## Giới hạn bằng chứng

Lượt browser thực hiện với khách chưa đăng nhập. Điều kiện đủ quyền đánh giá được kiểm thử bằng unit test; chưa gửi form đánh giá/hỏi đáp có đăng nhập trong lượt này. Trường hợp không ảnh và mô tả dài được kiểm tra từ thành phần dùng chung/mã nguồn; không sửa catalog để tạo dữ liệu thử.

Documenter đã cập nhật DESIGN.md/sidecar và xác thực JSON/narrative. Reviewer độc lập xem đủ13ảnh và mã nguồn, disposition `ship` cho phần mở rộng trang chi tiết; không có material fix. Phạm vi chưa thử gửi form có đăng nhập được giữ rõ trong kết luận review.
