import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ImageOff, Minus, Plus, RefreshCw, ShoppingCart } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useCartStore } from '../stores/useCartStore';
import type { ProductItem } from './ProductManagementPage';
import groceriesPhoto from '../assets/home-groceries.jpg';
import './HomePage.css';

export interface CategoryItem { id: number; name: string; description?: string; }
const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

function ProductPhoto({ product, priority = false }: { product: ProductItem; priority?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return product.imageUrl && failedUrl !== product.imageUrl ? (
    <img src={product.imageUrl} alt={product.name} loading={priority ? 'eager' : 'lazy'} width="400" height="300" onError={() => setFailedUrl(product.imageUrl || null)} />
  ) : <div className="shop-photo-empty"><ImageOff aria-hidden="true" /><span>Chưa có ảnh</span></div>;
}

interface ProductCardProps {
  product: ProductItem; quantity: number; remaining: number; added: boolean; featured?: boolean;
  onStep: (delta: number) => void; onAdd: () => void;
}

function ProductCard({ product, quantity, remaining, added, featured, onStep, onAdd }: ProductCardProps) {
  const available = product.isAvailable && product.stockQuantity > 0;
  const canAdd = available && remaining > 0;
  return <article className={`shop-product${featured ? ' shop-product-featured' : ''}`}>
    <Link className="shop-product-photo" to={`/products/${product.id}`} tabIndex={-1} aria-hidden="true">
      <ProductPhoto product={product} priority={featured} />
      {!available && <span className="shop-sold-out">Hết hàng</span>}
    </Link>
    <div className="shop-product-body">
      <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3>
      <strong className="shop-price">{currency.format(product.price)}</strong>
      <span className="shop-stock">{available ? `Còn ${product.stockQuantity} sản phẩm` : 'Tạm hết hàng'}</span>
      <div className="shop-product-actions">
        <div className="shop-quantity" aria-label={`Số lượng ${product.name}`}>
          <button type="button" aria-label="Giảm số lượng" disabled={!canAdd || quantity <= 1} onClick={() => onStep(-1)}><Minus size={16} /></button><span>{quantity}</span>
          <button type="button" aria-label="Tăng số lượng" disabled={!canAdd || quantity >= remaining} onClick={() => onStep(1)}><Plus size={16} /></button>
        </div>
        <button type="button" className={`shop-add${added ? ' is-added' : ''}`} disabled={!canAdd}
          aria-label={`${canAdd ? 'Thêm vào giỏ' : available ? 'Đã đủ tồn kho trong giỏ' : 'Hết hàng'}: ${product.name}`} onClick={onAdd}>
          {added ? <Check size={18} /> : <ShoppingCart size={18} />}<span>{added ? 'Đã thêm' : !available ? 'Hết hàng' : !remaining ? 'Đủ trong giỏ' : 'Thêm'}</span>
        </button>
      </div>
    </div>
  </article>;
}

function ProductSkeletons({ count }: { count: number }) {
  return <>{Array.from({ length: count }, (_, i) => <div className="shop-product shop-loading" key={i} aria-hidden="true"><div /><div /><div /></div>)}</>;
}

export default function HomePage() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [addedId, setAddedId] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addToCart);
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);
  const categories = useQuery<CategoryItem[]>({ queryKey: ['categories'], queryFn: () => axiosClient.get<CategoryItem[], CategoryItem[]>('/api/categories'), retry: 1 });
  // Keep featured products stable while category controls filter the catalog below.
  const catalog = useQuery<ProductItem[]>({ queryKey: ['products', null], queryFn: () => axiosClient.get<ProductItem[], ProductItem[]>('/api/products'), retry: 1 });
  const products = catalog.data ?? [];
  const visibleProducts = selectedCategoryId === null ? products : products.filter((p) => p.categoryId === selectedCategoryId);
  const featuredProducts = products.filter((p) => p.isAvailable && p.stockQuantity > 0).toSorted((a, b) => Number(b.isHot) - Number(a.isHot)).slice(0, 2);
  const renderProduct = (product: ProductItem, featured = false) => {
    const inCart = items.find((item) => item.id === product.id)?.quantity ?? 0;
    const remaining = Math.max(0, product.stockQuantity - inCart);
    const quantity = Math.max(1, Math.min(quantities[product.id] ?? 1, remaining));
    return <ProductCard key={product.id} product={product} featured={featured} quantity={quantity} remaining={remaining} added={addedId === product.id}
      onStep={(delta) => setQuantities((prev) => ({ ...prev, [product.id]: Math.max(1, Math.min(remaining, quantity + delta)) }))}
      onAdd={() => {
        if (!product.isAvailable || remaining <= 0) return;
        addToCart(product, quantity);
        setAddedId(product.id);
        setAnnouncement(`Đã thêm ${quantity} ${product.name} vào giỏ hàng.`);
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => setAddedId(null), 1800);
      }} />;
  };
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
