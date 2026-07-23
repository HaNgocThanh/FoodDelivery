import { Utensils, Mail, Phone, MapPin } from 'lucide-react';

/**
 * Footer – Tách từ HomePage.tsx.
 * Theo ui-design-system: footer dùng nền tối (slate-900) để tạo tương phản
 * với page nền sáng (slate-50).
 */
export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Cột 1: Thương hiệu */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-gradient-to-tr from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center shadow-md shadow-emerald-500/30">
              <Utensils className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-extrabold text-white">
              Food<span className="text-emerald-400">Delivery</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed">
            Thực phẩm tươi sạch mỗi ngày, giao hàng nhanh tận nhà. Cam kết nguồn
            gốc rõ ràng, chống đụng độ đơn hàng bằng lock cơ sở dữ liệu.
          </p>
        </div>

        {/* Cột 2: Liên kết nhanh */}
        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
            Liên kết nhanh
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/" className="hover:text-emerald-400 transition-colors">
                Trang chủ
              </a>
            </li>
            <li>
              <a href="/products" className="hover:text-emerald-400 transition-colors">
                Sản phẩm
              </a>
            </li>
            <li>
              <a href="/cart" className="hover:text-emerald-400 transition-colors">
                Giỏ hàng
              </a>
            </li>
            <li>
              <a href="/checkout" className="hover:text-emerald-400 transition-colors">
                Thanh toán
              </a>
            </li>
          </ul>
        </div>

        {/* Cột 3: Hỗ trợ */}
        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
            Hỗ trợ
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/admin/support" className="hover:text-emerald-400 transition-colors">
                Chăm sóc khách hàng
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                Chính sách đổi trả
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-emerald-400 transition-colors">
                Điều khoản sử dụng
              </a>
            </li>
          </ul>
        </div>

        {/* Cột 4: Liên hệ */}
        <div>
          <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">
            Liên hệ
          </h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
              <span>123 Nguyễn Văn Cừ, Long Biên, Hà Nội</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Hotline: 1900 6868</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>cskh@fooddelivery.vn</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar – giữ nguyên credit gốc */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-slate-500">
          <p className="font-semibold text-slate-400">
            FoodDelivery E-Commerce System &copy; 2026
          </p>
          <p className="mt-1">
            Cơ sở dữ liệu Oracle 19c &bull; ASP.NET Core 8 &bull; Clean
            Architecture &bull; React SPA Zustand
          </p>
        </div>
      </div>
    </footer>
  );
}
