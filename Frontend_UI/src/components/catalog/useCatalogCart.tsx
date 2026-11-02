import { useEffect, useRef, useState } from 'react';
import { useCartStore } from '../../stores/useCartStore';
import type { ProductItem } from '../../types/catalog';
import { ProductCard } from './ProductCard';

export function useCatalogCart() {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [addedId, setAddedId] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const items = useCartStore((state) => state.items);
  const addToCart = useCartStore((state) => state.addToCart);
  useEffect(() => () => { if (feedbackTimer.current) clearTimeout(feedbackTimer.current); }, []);
  const getProductSelection = (product: ProductItem) => {
    const inCart = items.find((item) => item.id === product.id)?.quantity ?? 0;
    const remaining = Math.max(0, product.stockQuantity - inCart);
    const quantity = Math.max(1, Math.min(quantities[product.id] ?? 1, remaining));
    return { quantity, remaining, added: addedId === product.id,
      onStep: (delta: number) => setQuantities((prev) => ({ ...prev, [product.id]: Math.max(1, Math.min(remaining, quantity + delta)) })),
      onAdd: () => {
        if (!product.isAvailable || remaining <= 0) return;
        addToCart(product, quantity);
        setAddedId(product.id);
        setAnnouncement(`Đã thêm ${quantity} ${product.name} vào giỏ hàng.`);
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => setAddedId(null), 1800);
      } };
  };
  const renderProduct = (product: ProductItem, featured = false) => <ProductCard key={product.id} product={product} featured={featured} {...getProductSelection(product)} />;
  return { renderProduct, getProductSelection, announcement };
}
