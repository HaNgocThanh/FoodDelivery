# Kế hoạch đồng bộ frontend FoodDelivery

Trạng thái: kế hoạch triển khai, 30/10/2026. Chuẩn thị giác: trang chủ đã được người dùng chấp nhận và `DESIGN.md`. Phương pháp: code-first, xem bản chạy thật theo từng đợt.

## Mục tiêu và phạm vi

Khách đi từ trang chủ → tìm hàng → xem sản phẩm → giỏ → thanh toán → theo dõi đơn mà không thấy thay đổi thương hiệu hoặc cách sử dụng. Giữ FoodDelivery, Inter, emerald/amber, nền sáng, ảnh thật và nội dung tiếng Việt ngắn.

Ưu tiên toàn bộ trang khách hàng đang có route. Quản trị nằm ở đợt riêng sau luồng khách hàng: cùng màu, chữ và thành phần cơ bản, nhưng bố cục tập trung vào dữ liệu và thao tác quản lý. Trang chủ là chuẩn đối chiếu, không thiết kế lại.

Kế hoạch dựa trên route/component hiện tại trong mã nguồn và kết quả kiểm tra trang chủ, tìm kiếm, giỏ trước đó. Đây không phải báo cáo đã kiểm thử trực quan lại toàn bộ trang có đăng nhập/quản trị.

## Quy tắc xuyên suốt

- Mỗi trang có một tiêu đề rõ, tối đa một câu dẫn khi cần; không có khối quảng bá dài hoặc nhãn trang trí trước tiêu đề.
- Emerald cho hành động thường dùng và giá; amber cho hành động chính của bước mua hàng. Đỏ dành cho lỗi/xóa, màu trạng thái có ý nghĩa nhất quán.
- Inter, chữ phụ dễ đọc; nút bo 8px, thẻ khoảng 12–16px, đường viền nhẹ. Không dùng lại bộ font Syne/Hanken và nút cam tròn lớn của giao diện cũ trên các trang được chuyển đổi.
- Sản phẩm có ảnh, tên, giá, tồn kho và hành động. Thiếu dữ liệu thì hiển thị trạng thái tương ứng; không điền dữ liệu thương mại minh họa.
- Nội dung bắt buộc để hiểu phí, giao hàng, thanh toán và lỗi phải được giữ. Giảm chữ bằng bỏ lặp, nhóm thông tin và mở rộng theo nhu cầu.
- Chỉ giữ bộ lọc và khả năng có dữ liệu/API thực. Đánh giá thật vẫn được giữ; chứng nhận, nông trại, khung giao, combo và số đo minh họa phải được rà riêng.
- Giữ hợp đồng API, phân quyền, route công khai, dữ liệu đơn hàng và các bản sửa P1/P2. Mọi thay đổi nghiệp vụ phát hiện trong quá trình làm được ghi riêng với bằng chứng.

## Đợt 0 — Chuẩn dùng chung và mốc đối chiếu

1. Tách phần trang chủ đã chấp nhận thành mốc commit riêng, không gộp thay đổi backend ngoài phạm vi.
2. Chụp trạng thái ban đầu của từng route chuẩn bị làm, xác nhận dữ liệu thật và luồng hiện có.
3. Tách `ProductCard`, ảnh sản phẩm, định dạng tiền và điều khiển số lượng từ trang chủ để dùng chung. Chuyển type sản phẩm/danh mục về nơi dùng chung thay vì import từ page.
4. Chuẩn hóa thành phần lặp: khung trang, tiêu đề, nút, trường nhập/lỗi, badge trạng thái, loading/error/empty, tóm tắt tiền đơn. Tận dụng thành phần đã có; không tạo thư viện lớn trước nhu cầu.
5. Mở rộng token cho các trang chuyển đổi; không thay hàng loạt CSS toàn cục làm lệch những trang chưa xử lý. Giữ header/footer và vị trí chat mobile đã kiểm tra.

Hoàn thành khi: trang chủ không đổi bố cục, thành phần dùng chung dùng được trên trang tiếp theo, build và kiểm thử nền qua.

## Đợt 1 — Tìm và chọn hàng

### 1. Danh sách sản phẩm — `/products`

Nguồn: `ProductListPage.tsx`.

- Tiêu đề “Sản phẩm”, số lượng kết quả và danh mục gọn; bỏ nhãn quảng bá phía trên.
- Dùng chung thẻ sản phẩm với trang chủ: cùng ảnh, chữ, giá, tồn kho, số lượng và phản hồi thêm giỏ.
- Desktop lưới bốn cột khi đủ rộng; mobile hai cột, tên dài không làm lệch nút.
- Giữ lọc danh mục, đường dẫn chi tiết và trạng thái tải/lỗi/trống; có nút thử lại.

Nghiệm thu: cùng một sản phẩm thể hiện nhất quán ở trang chủ và danh sách; hết hàng/đủ tồn trong giỏ không thêm vượt.

### 2. Kết quả tìm kiếm — `/search`

Nguồn: `SearchPage.tsx`.

- Mở đầu “Kết quả cho …”, số kết quả, sắp xếp và vùng hàng hóa; bỏ phần giới thiệu thu hoạch dài.
- Giữ tìm theo từ khóa, danh mục, khoảng giá; sắp xếp giá có hành vi kiểm chứng được. Đồng bộ trạng thái bộ lọc với URL và nút quay lại.
- Rà các bộ lọc nông trại, chứng nhận, lịch giao và đánh giá đang dùng giá trị mặc định hoặc minh họa. Chỉ đưa lên giao diện những bộ lọc có thể lọc thật; không giữ nút tạo cảm giác đã áp dụng khi kết quả không đổi.
- Desktop bộ lọc gọn ở cạnh lưới; mobile bảng lọc mở theo nhu cầu, có Áp dụng/Xóa lọc và trạng thái đã chọn.
- Dùng cùng thẻ sản phẩm; có gợi ý xóa bộ lọc khi không có kết quả.

Nghiệm thu: từ khóa từ header, tổ hợp bộ lọc, xóa lọc, back/forward và thêm giỏ hoạt động; không tạo đánh giá/nông trại giả.

### 3. Chi tiết sản phẩm — `/products/:slug`

Nguồn: `ProductDetailPage.tsx`.

- Desktop: ảnh trái; tên, giá, tồn kho, xuất xứ có dữ liệu, số lượng và thêm giỏ ở phải. Mobile ảnh → thông tin mua → mô tả/đánh giá.
- Rút nội dung về thông tin sản phẩm, mô tả và đánh giá thật. Phần dài dùng mở rộng; không lặp lời quảng bá ở nhiều vùng.
- Rà gallery, gói đăng ký định kỳ, combo giá cố định, chỉ số nông trại và chứng nhận đang được dựng trong UI. Giữ những khả năng có luồng thật; loại nội dung minh họa khỏi vùng mua hàng nếu chưa có dữ liệu hỗ trợ.
- Giữ gửi/đọc đánh giá và điều kiện đăng nhập; lỗi không tìm thấy sản phẩm có hành động quay lại danh sách.

Nghiệm thu: sản phẩm có/không ảnh, tên dài, mô tả trống, không đánh giá, hết hàng, ID không hợp lệ; số lượng và giá vào giỏ đúng.

## Đợt 2 — Giỏ và đặt hàng

### 4. Giỏ hàng — `/cart`

Nguồn: `CartPage.tsx`, `CartAddons.tsx`.

- Tiêu đề “Giỏ hàng”; mỗi dòng có ảnh nhỏ, tên, đơn giá, số lượng, thành tiền và xóa.
- Desktop danh sách + tóm tắt tiền bên phải; mobile xếp dọc, hành động “Thanh toán” dễ tìm và không che sản phẩm/chat.
- Giữ phí/tiền cọc và nhãn “ước tính” đúng tính toán hiện tại. Không dùng nội dung “khóa tồn kho”, lịch xe, bảo chứng hoặc giảm phát thải nếu chưa có cơ chế/dữ liệu tương ứng.
- Bỏ các nút thanh toán nhanh mang tên khác nhưng chỉ dẫn cùng một bước, nếu không có phương thức độc lập.
- Sản phẩm mua thêm giữ API thật và bước kiểm tra lại chi tiết trước thêm; trình bày cùng hệ thẻ mới.

Nghiệm thu: giỏ trống, đổi số lượng, xóa món, giới hạn tồn kho, gợi ý mua thêm, tổng ước tính và chuyển checkout.

### 5. Thanh toán — `/checkout`, `/checkout-form`

Nguồn: hai page wrapper và thành phần thực `components/CheckoutForm.tsx`.

- Cùng một giao diện cho hai route đang dùng chung form; giữ URL hoạt động, không tạo hai trải nghiệm khác nhau.
- Nhóm ngắn: Người nhận → Giao hàng → Thanh toán. Tóm tắt tiền rõ các khoản hàng, phí, cọc, giảm giá/điểm và tip nếu áp dụng.
- Địa chỉ và lựa chọn giao hàng gọn; thông tin giải thích chỉ đặt cạnh trường liên quan. Tip giữ tính tự chọn.
- Nút “Đặt hàng” nổi bật; trạng thái đang gửi, thất bại và thành công rõ. Phương thức hiển thị theo API; mock online được nhận diện là thử nghiệm khi có.
- Giữ snapshot người nhận, lựa chọn giao hàng, expected total, xác thực tồn kho, xử lý lỗi và chống gửi lặp đã có; không chỉ thay vỏ page wrapper rồi bỏ sót form bên trong.

Nghiệm thu: khách/đã đăng nhập, dữ liệu form không mất khi lỗi, COD, mock online Development, tổng thay đổi, sản phẩm hết hàng, API lỗi, thao tác gửi lặp và đặt thành công.

### 6. Kết quả thanh toán — `/payment-result`

Nguồn: `PaymentResultPage.tsx` và trạng thái thành công COD trong `CheckoutForm.tsx`.

- Một trạng thái chính, mã đơn và hành động phù hợp: xem đơn, quay lại mua hoặc thử thanh toán lại khi hợp lệ.
- Phân biệt đang xác minh, thành công, thất bại/hủy và chưa xác định; không kết luận đã trả tiền từ query string.
- Giữ xác minh backend, chữ ký/phiên mock và kiểm tra trạng thái đơn đã có.

Nghiệm thu: tải lại trang, link thiếu/sai tham số, đơn chưa thanh toán và kết quả thành công thật đều có thông báo đúng.

## Đợt 3 — Theo dõi sau mua

### 7. Tra cứu đơn — `/track-order`

Nguồn: `TrackOrderPage.tsx`, `track/OrderStatusStepper.tsx`, `OrderDeliveryDetails.tsx`.

- Form ngắn với thông tin xác thực hiện có; kết quả nhấn mã đơn và trạng thái trước.
- Timeline chỉ phản ánh trạng thái thật; thông tin người nhận, giao hàng và tiền đơn chia khối dễ quét.
- Thông báo không tìm thấy/sai thông tin đủ để khôi phục thao tác, giữ giới hạn dữ liệu được API cho phép xem.

Nghiệm thu: thông tin đúng/sai, đơn không tồn tại, các trạng thái giao/hủy và lỗi kết nối.

### 8. Đơn hàng của tôi — `/my-orders`, `/account/orders`

Nguồn: `OrdersPage.tsx` chỉ export lại `MyOrdersPage.tsx`; thiết kế một lần cho cả hai route.

- Danh sách tóm tắt: mã đơn, ngày, số món, tổng và badge tiếng Việt. Chi tiết mở khi người dùng cần.
- Hủy đơn, đánh giá và yêu cầu hỗ trợ nằm đúng đơn và đúng điều kiện; rút các thông báo song ngữ/lặp.
- Đồng bộ trạng thái và chi tiết giao hàng với trang tra cứu; giữ cache theo tài khoản.

Nghiệm thu: chưa có đơn, nhiều đơn, mở chi tiết, hủy hợp lệ/không hợp lệ, đánh giá và đổi tài khoản.

## Đợt 4 — Tài khoản và hỗ trợ

### 9. Đăng nhập — `/login`

- Form gọn trên nền sáng, một tiêu đề; bỏ cột quảng bá lớn. Email, mật khẩu, hiện/ẩn mật khẩu, quên mật khẩu và đăng ký rõ ràng.
- Giữ xác thực, thông báo lỗi và điều hướng theo vai trò đang có.

### 10. Đăng ký — `/register`

- Dùng cùng khung/form với đăng nhập; giữ trường bắt buộc, hướng dẫn mật khẩu và lỗi theo từng trường.
- Không thêm tuyên bố quyền lợi hoặc điều khoản chưa có nội dung thật.

### 11. Quên mật khẩu — `/forgot-password`

- Một ô email, hướng dẫn ngắn và trạng thái gửi rõ; đồng nhất khung xác thực.
- Giữ cách chuyển sang bước đặt lại hiện có và hành vi bảo mật của API.

### 12. Đặt lại mật khẩu — `/reset-password`

- Đổi nền tối sang cùng hệ sáng; các trường mã/token và mật khẩu trình bày theo luồng thật.
- Có trạng thái link/mã không hợp lệ, đang gửi và thành công; giữ token/validation.

### 13. Hồ sơ — `/account/profile`

Nguồn: `ProfilePage.tsx` và các form liên quan.

- Điều hướng gọn cho Thông tin / Địa chỉ / Mật khẩu; mobile không tràn tab.
- Hạng thành viên và điểm thật được giữ như thông tin phụ, không làm lu mờ form chính.
- Nút lưu gần form đang sửa, lỗi theo trường, thành công rõ; giữ quyền tài khoản và chính sách cache.

### 14. Chat và các hộp thoại liên quan

- Đồng bộ màu/font cho chat hỗ trợ, đánh giá, hỗ trợ đơn và xác nhận hủy/xóa được dùng trong các trang trên.
- Giữ vị trí nút chat trong hàng tìm kiếm mobile; không che nút đặt hàng.
- Kiểm tra focus, Escape, tên truy cập và đóng/mở; giữ SignalR và nghiệp vụ gửi tin hiện có.

Nghiệm thu đợt: đăng nhập sai/đúng, đăng ký lỗi, quên/đặt lại mật khẩu, sửa hồ sơ/địa chỉ, đổi mật khẩu và đăng xuất; kiểm tra không lẫn dữ liệu tài khoản.

## Đợt 5 — Quản trị

Làm sau luồng khách hàng; dùng chung màu/chữ/control nhưng giữ mật độ phù hợp quản lý. Bắt đầu từ `components/AdminLayout.tsx`, rồi lần lượt:

1. `/admin/dashboard`: KPI lấy dữ liệu thật, nhãn ngắn, biểu đồ/bảng dễ đọc; có loading/error/empty.
2. `/admin/orders`: trạng thái và chi tiết tiền/giao hàng rõ, bộ lọc gọn, hành động đổi trạng thái theo điều kiện thật.
3. `/admin/products`: bảng + tìm/lọc, ảnh thu nhỏ, tồn kho; form thêm/sửa nhóm hợp lý, xử lý upload và lỗi trường rõ.
4. `/admin/promotions`: ưu tiên mã, hiệu lực, điều kiện và cách tính thật; form ngắn, giải thích cạnh trường liên quan.
5. `/admin/users`: vai trò, trạng thái và tìm kiếm rõ; thao tác nhạy cảm có xác nhận đúng ngữ cảnh, giữ phân quyền.
6. `/admin/support`: danh sách hội thoại + vùng chat, trạng thái kết nối rõ; mobile chuyển giữa hai vùng thay vì ép hai cột.

Nghiệm thu: kiểm tra bằng tài khoản đúng vai trò và tài khoản không có quyền; tìm/lọc, phân trang nếu có, modal/form, lưu/hủy/lỗi và các hành động quản trị thật.

## Cách triển khai và điều kiện hoàn tất mỗi đợt

1. Chốt cấu trúc ngắn theo chuẩn đã có, xây trực tiếp trên app. Không tổ chức lại vòng chọn thương hiệu cho từng trang.
2. Mỗi trang hoặc nhóm gắn chặt có commit riêng; ghi rõ phần UI và phần sửa hành vi phát hiện thêm.
3. Kiểm tra desktop/mobile ở 320, 390, 768, 1280 và 1440px; tên dài, ảnh hỏng, dữ liệu trống, tải và lỗi. Kiểm tra bàn phím/focus, tương phản và vùng bấm phù hợp.
4. Build, lint và kiểm thử phù hợp thay đổi; giữ bộ test hồi quy P1/P2. Với checkout/payment/cache, kiểm tra luồng thật và chạy test liên quan; không viết test chỉ để kiểm tra class CSS.
5. Chụp ảnh và review kết quả so với trang chủ, sửa theo một danh sách lỗi rõ. Cập nhật DESIGN.md/sidecar khi thật sự thêm quy tắc dùng chung.
6. Cuối cùng chạy xuyên suốt: tìm → xem → thêm giỏ → sửa giỏ → đặt → kết quả → tra cứu/đơn của tôi; kiểm tra đổi tài khoản và luồng quản trị riêng.

Điều kiện môi trường: frontend và API/Oracle phải hoạt động ổn định. Máy hiện thiếu ASP.NET Core Runtime 8; cách roll-forward đang dùng để chạy tạm không được coi là thay đổi nghiệp vụ của đợt thiết kế.

## Thứ tự bắt đầu đề xuất

Đợt 0 → Danh sách + Tìm kiếm → Chi tiết → Giỏ → Checkout + Kết quả → Tra cứu + Đơn của tôi → Xác thực + Hồ sơ + Hộp thoại → Quản trị → Kiểm thử xuyên suốt.

Quyết định mở: thời điểm đưa đợt quản trị vào triển khai; các khả năng minh họa phát hiện khi rà từng trang có thể cần một quyết định sản phẩm riêng nếu muốn xây thành tính năng thật.
