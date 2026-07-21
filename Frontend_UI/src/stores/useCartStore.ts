import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProductItem } from '../pages/ProductManagementPage';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  stockQuantity: number;
  origin?: string;
  categoryName?: string;
}

interface CartStoreState {
  items: CartItem[];
  addToCart: (product: ProductItem, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  getTotalOriginalPrice: () => number;
  getTotalItemsCount: () => number;
}

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      items: [],

      addToCart: (product: ProductItem, quantity = 1) => {
        if (product.stockQuantity <= 0 || !product.isAvailable) return;

        const currentItems = get().items;
        const existingItem = currentItems.find((i) => i.id === product.id);

        if (existingItem) {
          const newQuantity = Math.min(
            existingItem.quantity + quantity,
            product.stockQuantity
          );

          set({
            items: currentItems.map((i) =>
              i.id === product.id ? { ...i, quantity: newQuantity } : i
            ),
          });
        } else {
          set({
            items: [
              ...currentItems,
              {
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: Math.min(quantity, product.stockQuantity),
                stockQuantity: product.stockQuantity,
                origin: product.origin,
              },
            ],
          });
        }
      },

      updateQuantity: (productId: number, quantity: number) => {
        const currentItems = get().items;
        if (quantity <= 0) {
          set({ items: currentItems.filter((i) => i.id !== productId) });
          return;
        }

        set({
          items: currentItems.map((i) => {
            if (i.id === productId) {
              const safeQty = Math.min(quantity, i.stockQuantity);
              return { ...i, quantity: safeQty };
            }
            return i;
          }),
        });
      },

      removeFromCart: (productId: number) => {
        set({ items: get().items.filter((i) => i.id !== productId) });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalOriginalPrice: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getTotalItemsCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'fooddelivery_cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
