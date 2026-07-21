import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { CartItem, Product } from '@/types';

interface CartStore {
  items: CartItem[];

  // Actions
  addItem:        (product: Product, quantity: number) => void;
  removeItem:     (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart:      () => void;

  // Computed (stored as functions to avoid stale closure)
  totalItems:  () => number;
  totalPrice:  () => number;
  hasItem:     (productId: number) => boolean;
  getQuantity: (productId: number) => number;
}

export const useCartStore = create<CartStore>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],

        addItem: (product, quantity) => {
          set((state) => {
            const existing = state.items.find((i) => i.productId === product.id);

            if (existing) {
              // Tăng số lượng nhưng không vượt tồn kho
              const newQty = Math.min(
                existing.quantity + quantity,
                product.stockQuantity,
              );
              return {
                items: state.items.map((i) =>
                  i.productId === product.id ? { ...i, quantity: newQty } : i,
                ),
              };
            }

            return {
              items: [
                ...state.items,
                {
                  productId:     product.id,
                  name:          product.name,
                  imageUrl:      product.imageUrl,
                  price:         product.price,
                  quantity:      Math.min(quantity, product.stockQuantity),
                  stockQuantity: product.stockQuantity,
                  isAvailable:   product.isActive && product.stockQuantity > 0,
                },
              ],
            };
          }, false, 'addItem');
        },

        removeItem: (productId) => {
          set(
            (state) => ({ items: state.items.filter((i) => i.productId !== productId) }),
            false,
            'removeItem',
          );
        },

        updateQuantity: (productId, quantity) => {
          set((state) => ({
            items:
              quantity <= 0
                ? state.items.filter((i) => i.productId !== productId)
                : state.items.map((i) =>
                    i.productId === productId ? { ...i, quantity } : i,
                  ),
          }), false, 'updateQuantity');
        },

        clearCart: () => set({ items: [] }, false, 'clearCart'),

        totalItems:  () => get().items.reduce((sum, i) => sum + i.quantity, 0),
        totalPrice:  () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
        hasItem:     (productId) => get().items.some((i) => i.productId === productId),
        getQuantity: (productId) =>
          get().items.find((i) => i.productId === productId)?.quantity ?? 0,
      }),
      {
        name:        'food-cart',              // localStorage key
        partialize:  (state) => ({ items: state.items }), // Chỉ persist items
      },
    ),
    { name: 'CartStore' },
  ),
);
