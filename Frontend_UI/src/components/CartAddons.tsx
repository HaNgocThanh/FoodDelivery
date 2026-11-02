import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProductPhoto } from './catalog/ProductCard';
import { formatCurrency } from '../utils/formatCurrency';
import axiosClient from '../api/axiosClient';
import { useCartStore } from '../stores/useCartStore';
import type { ProductItem } from '../types/catalog';

export function CartAddons() {
  const items = useCartStore(state => state.items);
  const addToCart = useCartStore(state => state.addToCart);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const catalog = useQuery({
    queryKey: ['products', 'cart-addons'],
    queryFn: ({ signal }) => axiosClient.get<ProductItem[], ProductItem[]>('/api/products', { signal }),
    enabled: items.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const suggestions = (catalog.data ?? []).filter(product =>
    product.isAvailable && product.stockQuantity > 0 && !items.some(item => item.id === product.id)
  ).slice(0, 3);

  const addProduct = async (id: number) => {
    if (addingId !== null) return;
    setAddingId(id);
    setError(null);
    try {
      // Re-read the product; prices and stock in recommendations may have changed.
      const product = await axiosClient.get<ProductItem, ProductItem>('/api/products/' + id);
      const currentQuantity = useCartStore.getState().items.find(item => item.id === id)?.quantity ?? 0;
      if (!product.isAvailable || product.stockQuantity <= currentQuantity) {
        setError('Sản phẩm vừa hết hàng hoặc đã đạt số lượng tối đa trong giỏ.');
        await catalog.refetch();
        return;
      }
      addToCart(product, 1);
    } catch {
      setError('Không thể thêm sản phẩm. Vui lòng thử lại.');
    } finally {
      setAddingId(null);
    }
  };

  if (!catalog.isPending && !catalog.isError && suggestions.length === 0 && !error) return null;
  return <section aria-label="Sản phẩm mua thêm" className="cart-addons">
    <div className="cart-addons-heading"><h2>Bạn có thể mua thêm</h2><Link to="/products">Xem tất cả</Link></div>
    {catalog.isPending && <p role="status" className="cart-addons-status">Đang tải sản phẩm...</p>}
    {catalog.isError && <div className="cart-addons-error" role="alert">Không tải được sản phẩm mua thêm.<button type="button" onClick={() => void catalog.refetch()}>Thử lại</button></div>}
    {error && <p role="alert" className="cart-addons-error">{error}</p>}
    <div className="cart-addon-grid">{suggestions.map(product => <article key={product.id} className="cart-addon">
      <Link to={`/products/${product.id}`} className="cart-addon-photo" tabIndex={-1} aria-hidden="true"><ProductPhoto product={product} /></Link>
      <h3><Link to={`/products/${product.id}`}>{product.name}</Link></h3><strong>{formatCurrency(product.price)}</strong>
      <button type="button" disabled={addingId !== null} onClick={() => void addProduct(product.id)} aria-label={`Thêm ${product.name} vào giỏ`}>
        {addingId === product.id ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />} Thêm
      </button>
    </article>)}</div>
  </section>;
}
