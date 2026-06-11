import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '../lib/types';

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  add: (item: CartItem) => void;
  remove: (productId: string, color?: string) => void;
  setQty: (productId: string, color: string | undefined, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  subtotal: () => number;
  count: () => number;
}

const sameLine = (a: CartItem, productId: string, color?: string) =>
  a.productId === productId && a.color === color;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => sameLine(i, item.productId, item.color));
          if (existing) {
            return {
              items: s.items.map((i) =>
                sameLine(i, item.productId, item.color) ? { ...i, quantity: i.quantity + item.quantity } : i
              ),
              isOpen: true,
            };
          }
          return { items: [...s.items, item], isOpen: true };
        }),
      remove: (productId, color) =>
        set((s) => ({ items: s.items.filter((i) => !sameLine(i, productId, color)) })),
      setQty: (productId, color, qty) =>
        set((s) => ({
          items: s.items.map((i) => (sameLine(i, productId, color) ? { ...i, quantity: Math.max(1, qty) } : i)),
        })),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'nora_cart' }
  )
);
