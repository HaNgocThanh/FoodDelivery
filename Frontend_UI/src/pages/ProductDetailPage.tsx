import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Minus, Plus, RefreshCw, ShoppingCart, Star } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useAuthStore } from '../stores/useAuthStore';
import { ProductPhoto } from '../components/catalog/ProductCard';
import { ProductCommunity, type CommunityTab } from '../components/catalog/ProductCommunity';
import { useCatalogCart } from '../components/catalog/useCatalogCart';
import type { ProductDetailItem } from '../types/productDetail';
import { parseProductId } from '../utils/productDetail';
import { formatCurrency } from '../utils/formatCurrency';
import './ProductDetailPage.css';

export type { ProductDetailItem, ReviewItem } from '../types/productDetail';

function ProductView({ product }: { product: ProductDetailItem }) {
  const { getProductSelection, announcement } = useCatalogCart();
  const selection = getProductSelection(product);
  const userId = useAuthStore((state) => state.user?.id);
  const [activeTab, setActiveTab] = useState<CommunityTab>('reviews');
  const available = product.isAvailable && product.stockQuantity > 0;
  const canAdd = available && selection.remaining > 0;
  const reviewsCount = product.reviews?.length ?? 0;
  return <>
    <section className="detail-overview" aria-labelledby="product-heading">
      <div className="detail-photo"><ProductPhoto key={product.id} product={product} priority /></div>
      <div className="detail-buy">
        <h1 id="product-heading">{product.name}</h1>
        <a className="detail-review-link" href="#reviews-section" onClick={() => setActiveTab('reviews')}>
          <Star size={16} aria-hidden="true" />{reviewsCount > 0 ? `${product.averageRating.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}/5 · ${reviewsCount} đánh giá` : 'Chưa có đánh giá'}
        </a>
        <p className="detail-price">{formatCurrency(product.price)}</p>
        <p className={`detail-availability${available ? '' : ' is-unavailable'}`}>{available ? `Còn ${product.stockQuantity} sản phẩm` : 'Tạm hết hàng'}</p>
        <dl className="detail-facts">
          {product.origin && <div><dt>Xuất xứ</dt><dd>{product.origin}</dd></div>}
          {product.categoryName && <div><dt>Danh mục</dt><dd><Link to={`/products?categoryId=${product.categoryId}`}>{product.categoryName}</Link></dd></div>}
        </dl>
        <div className="detail-purchase-actions">
          <div className="shop-quantity" aria-label={`Số lượng ${product.name}`}><button aria-label="Giảm số lượng" disabled={!canAdd || selection.quantity <= 1} onClick={() => selection.onStep(-1)}><Minus size={18} /></button><span>{selection.quantity}</span><button aria-label="Tăng số lượng" disabled={!canAdd || selection.quantity >= selection.remaining} onClick={() => selection.onStep(1)}><Plus size={18} /></button></div>
          <button data-testid={`button-add-to-cart-${product.id}`} className={`shop-add detail-add${selection.added ? ' is-added' : ''}`} disabled={!canAdd} onClick={selection.onAdd}>
            {selection.added ? <Check size={20} /> : <ShoppingCart size={20} />}<span>{selection.added ? 'Đã thêm vào giỏ' : !available ? 'Hết hàng' : !selection.remaining ? 'Đã đủ trong giỏ' : 'Thêm vào giỏ'}</span>
          </button>
        </div>
        {canAdd && <p className="detail-subtotal">Tạm tính <strong>{formatCurrency(product.price * selection.quantity)}</strong></p>}
        {!selection.remaining && available && <p className="detail-cart-note">Số lượng trong giỏ đã đạt tồn kho hiện tại. <Link to="/cart">Xem giỏ hàng</Link></p>}
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
      </div>
    </section>
    <section id="dossier" className="detail-description" aria-labelledby="description-heading"><h2 id="description-heading">Thông tin sản phẩm</h2>
      {(product.description?.length ?? 0) > 360 ? <details><summary>Xem mô tả</summary><p>{product.description}</p></details> : <p>{product.description || 'Chưa có mô tả cho sản phẩm này.'}</p>}
    </section>
    <ProductCommunity key={`${product.id}:${userId ?? 'guest'}`} product={product} activeTab={activeTab} onTabChange={setActiveTab} />
  </>;
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const productId = parseProductId(slug);
  const product = useQuery<ProductDetailItem>({
    queryKey: ['productDetail', productId],
    queryFn: ({ signal }) => axiosClient.get<ProductDetailItem, ProductDetailItem>(`/api/products/${productId}`, { signal }),
    enabled: productId !== null,
    retry: 1,
  });
  return <div className="product-detail-page" data-testid="product-detail-page">
    <Link className="detail-back" to="/products"><ArrowLeft size={17} />Sản phẩm</Link>
    {productId === null ? <section className="shop-state" role="alert"><h1>Mã sản phẩm không hợp lệ</h1><p>Chọn một sản phẩm từ danh sách để tiếp tục.</p><Link className="detail-return" to="/products">Xem sản phẩm</Link></section>
      : product.isPending ? <div className="detail-loading" role="status"><p>Đang tải sản phẩm…</p><div className="detail-loading-layout" aria-hidden="true"><div /><div /></div></div>
        : product.isError || !product.data ? <section className="shop-state" role="alert"><h1>{/không tìm thấy|không tồn tại/iu.test(product.error?.message ?? '') ? 'Không tìm thấy sản phẩm' : 'Chưa tải được sản phẩm'}</h1><p>Vui lòng thử lại hoặc chọn sản phẩm khác.</p><div className="detail-error-actions"><button disabled={product.isFetching} onClick={() => void product.refetch()}><RefreshCw size={16} />{product.isFetching ? 'Đang tải…' : 'Thử lại'}</button><Link className="detail-return" to="/products">Xem sản phẩm</Link></div></section>
          : <ProductView key={productId} product={product.data} />}
  </div>;
}
