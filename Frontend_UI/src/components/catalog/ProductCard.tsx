import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ImageOff, Minus, Plus, ShoppingCart } from 'lucide-react';
import type { ProductItem } from '../../types/catalog';
import '../../styles/shop.css';

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

export function ProductCard({ product, quantity, remaining, added, featured, onStep, onAdd }: ProductCardProps) {
  const available = product.isAvailable && product.stockQuantity > 0;
  const canAdd = available && remaining > 0;
  return <article data-testid={`product-card-${product.id}`} className={`shop-product${featured ? ' shop-product-featured' : ''}`}>
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
        <button type="button" data-testid={`button-add-to-cart-${product.id}`} className={`shop-add${added ? ' is-added' : ''}`} disabled={!canAdd}
          aria-label={`${canAdd ? 'Thêm vào giỏ' : available ? 'Đã đủ tồn kho trong giỏ' : 'Hết hàng'}: ${product.name}`} onClick={onAdd}>
          {added ? <Check size={18} /> : <ShoppingCart size={18} />}<span>{added ? 'Đã thêm' : !available ? 'Hết hàng' : !remaining ? 'Đủ trong giỏ' : 'Thêm'}</span>
        </button>
      </div>
    </div>
  </article>;
}

export function ProductSkeletons({ count }: { count: number }) {
  return <>{Array.from({ length: count }, (_, i) => <div className="shop-product shop-loading" key={i} aria-hidden="true"><div /><div /><div /></div>)}</>;
}

