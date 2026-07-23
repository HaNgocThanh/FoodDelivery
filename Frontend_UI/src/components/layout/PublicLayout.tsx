import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * PublicLayout – Bao bọc mọi page của khách hàng (không áp dụng cho admin).
 * - Render Header (sticky, light, backdrop-blur)
 * - Render children trong `<main>` để giữ semantic HTML
 * - Render Footer (dark slate-900)
 *
 * QUAN TRỌNG: search input state được quản lý ở đây để Header có thể
 * navigate đi kèm. Mọi page bên trong đều có thể search từ header.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  const [searchInput, setSearchInput] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      <Header
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearch}
      />
      <main className="flex-1 w-full">{children}</main>
      <Footer />
    </div>
  );
}
