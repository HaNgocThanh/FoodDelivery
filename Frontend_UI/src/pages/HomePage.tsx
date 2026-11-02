import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, RefreshCw } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useCatalogCart } from '../components/catalog/useCatalogCart';
import { ProductSkeletons } from '../components/catalog/ProductCard';
import type { ProductItem, CategoryItem } from '../types/catalog';
import groceriesPhoto from '../assets/home-groceries.jpg';
import '../styles/shop.css';

export type { CategoryItem } from '../types/catalog';
export default function HomePage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const { renderProduct, announcement } = useCatalogCart();
  const categories = useQuery<CategoryItem[]>({ queryKey: ['categories'], queryFn: () => axiosClient.get<CategoryItem[], CategoryItem[]>('/api/categories'), retry: 1 });
  // Keep featured products stable while category controls filter the catalog below.
  const catalog = useQuery<ProductItem[]>({ queryKey: ['products', null], queryFn: () => axiosClient.get<ProductItem[], ProductItem[]>('/api/products'), retry: 1 });
  const products = catalog.data ?? [];
  const visibleProducts = selectedCategoryId === null ? products : products.filter((p) => p.categoryId === selectedCategoryId);
  const featuredProducts = products.filter((p) => p.isAvailable && p.stockQuantity > 0).toSorted((a, b) => Number(b.isHot) - Number(a.isHot)).slice(0, 2);
  return <div className="shop-home">
    <div className={`shop-opening${featuredProducts.length || catalog.isPending ? '' : ' shop-opening-solo'}`}>
      <section className="shop-hero" aria-labelledby="home-heading">
        <div className="shop-hero-copy"><h1 id="home-heading">Tươi mỗi ngày.<br />Ngon từng bữa.</h1><p>Thực phẩm cho bữa cơm nhà.</p>
          <a className="shop-cta" href="#seasonal-curation">Mua sắm ngay <ArrowRight size={19} /></a></div>
        <img className="shop-hero-photo" src={groceriesPhoto} alt="" width="1200" height="900" fetchPriority="high" />
      </section>
      {catalog.isPending ? <div className="shop-featured" aria-label="Đang tải sản phẩm"><ProductSkeletons count={2} /></div>
        : featuredProducts.length > 0 ? <div className="shop-featured" aria-label="Sản phẩm nổi bật">{featuredProducts.map((p) => renderProduct(p, true))}</div> : null}
    </div>
    <section id="seasonal-curation" className="shop-catalog" aria-labelledby="catalog-heading" aria-busy={catalog.isFetching}>
      <div className="shop-catalog-heading"><h2 id="catalog-heading">Chọn món cho hôm nay</h2>{catalog.isSuccess && <span>{visibleProducts.length} sản phẩm</span>}</div>
      <div className="shop-category-row" aria-label="Lọc danh mục">
        <button className={selectedCategoryId === null ? 'is-selected' : ''} aria-pressed={selectedCategoryId === null} onClick={() => setSelectedCategoryId(null)}>Tất cả</button>
        {categories.data?.map((category) => <button key={category.id} className={selectedCategoryId === category.id ? 'is-selected' : ''} aria-pressed={selectedCategoryId === category.id} onClick={() => setSelectedCategoryId(category.id)}>{category.name}</button>)}
        {categories.isError && <button className="shop-category-retry" onClick={() => void categories.refetch()}><RefreshCw size={15} /> Tải lại danh mục</button>}
      </div>
      {catalog.isError ? <div className="shop-state" role="alert"><h3>Chưa tải được sản phẩm</h3><p>Vui lòng thử lại để xem giá và tồn kho.</p><button onClick={() => void catalog.refetch()} disabled={catalog.isFetching}><RefreshCw size={17} />{catalog.isFetching ? 'Đang tải…' : 'Thử lại'}</button></div>
        : catalog.isPending ? <div className="shop-grid" aria-label="Đang tải sản phẩm"><ProductSkeletons count={4} /></div>
          : !visibleProducts.length ? <div className="shop-state"><h3>Chưa có sản phẩm</h3><p>{selectedCategoryId === null ? 'Bạn ghé lại sau nhé.' : 'Hãy thử xem danh mục khác.'}</p>{selectedCategoryId !== null && <button onClick={() => setSelectedCategoryId(null)}>Xem tất cả</button>}</div>
            : <div className="shop-grid">{visibleProducts.map((p) => renderProduct(p))}</div>}
    </section>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </div>;
}
