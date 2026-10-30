import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useCartStore } from '../stores/useCartStore';
import type { ProductItem } from '../pages/ProductManagementPage';

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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể thêm sản phẩm. Vui lòng thử lại.');
    } finally {
      setAddingId(null);
    }
  };

  if (!catalog.isPending && !catalog.isError && suggestions.length === 0 && !error) return null;
  return (
    <section aria-label="Sản phẩm mua thêm" className="rounded-xl border border-emerald-100 bg-emerald-50 p-6 space-y-4">
      <h3 className="text-lg font-bold text-slate-900">Bạn muốn mua thêm món nào?</h3>
      {catalog.isPending && <p role="status" className="text-sm text-slate-600">Đang tải sản phẩm...</p>}
      {catalog.isError && <div className="text-sm text-red-700" role="alert">
        Không tải được sản phẩm mua thêm. <button type="button" onClick={() => void catalog.refetch()} className="underline">Thử lại</button>
      </div>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {suggestions.map(product => <article key={product.id} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3">
          {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-24 w-full object-cover rounded-lg" />}
          <h4 className="text-sm font-bold text-slate-900">{product.name}</h4>
          <p className="text-sm font-bold text-emerald-700 tabular-nums">{product.price.toLocaleString('vi-VN')} đ</p>
          <button type="button" disabled={addingId !== null} onClick={() => void addProduct(product.id)}
            aria-label={'Thêm ' + product.name + ' vào giỏ'}
            className="mt-auto rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-sm font-bold text-white inline-flex justify-center items-center gap-1 disabled:opacity-50">
            {addingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Thêm
          </button>
        </article>)}
      </div>
    </section>
  );
}
