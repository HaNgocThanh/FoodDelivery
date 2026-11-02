import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * PublicLayout – Bao bọc mọi page của khách hàng (không áp dụng cho admin).
 * - Render Header with search and customer support
 * - Render children trong `<main>` để giữ semantic HTML
 * - Render Footer
 *
 * QUAN TRỌNG: search input state được quản lý ở đây để Header có thể
 * navigate đi kèm. Mọi page bên trong đều có thể search từ header.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  const location = useLocation();
  const [searchDraft, setSearchDraft] = useState<{ key: string; value: string } | null>(null);
  const routeKeyword = location.pathname === '/search' || location.pathname === '/products'
    ? new URLSearchParams(location.search).get('keyword') ?? '' : '';
  const searchInput = searchDraft?.key === location.key ? searchDraft.value : routeKeyword;
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <Header
        searchInput={searchInput}
        onSearchInputChange={(value) => setSearchDraft({ key: location.key, value })}
        onSearchSubmit={handleSearch}
      />
      <main className="flex-1 w-full">{children}</main>
      <Footer />
    </div>
  );
}
