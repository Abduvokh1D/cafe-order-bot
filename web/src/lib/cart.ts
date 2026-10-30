import { useSyncExternalStore } from "react";

// Savatda faqat taom id va soni saqlanadi. Nom va narx har doim bazadan kelgan
// menyudan olinadi, shuning uchun narx o'zgarsa savatda eskisi qolib ketmaydi.
export type Cart = Record<number, number>;

export const MAX_QUANTITY = 99;

const EMPTY: Cart = {};
const carts = new Map<string, Cart>();
const listeners = new Set<() => void>();

function storageKey(slug: string) {
  return `cart:${slug}`;
}

function parse(raw: string | null): Cart {
  if (!raw) return EMPTY;
  const cart: Cart = {};
  for (const [id, quantity] of Object.entries(JSON.parse(raw))) {
    if (Number.isInteger(Number(id)) && Number.isInteger(quantity) && (quantity as number) > 0) {
      cart[Number(id)] = Math.min(quantity as number, MAX_QUANTITY);
    }
  }
  return cart;
}

function read(slug: string): Cart {
  let cart = carts.get(slug);
  if (!cart) {
    try {
      cart = parse(window.localStorage.getItem(storageKey(slug)));
    } catch {
      // Xotira yopiq yoki buzilgan: savat bo'sh boshlanadi
      cart = EMPTY;
    }
    carts.set(slug, cart);
  }
  return cart;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCart(slug: string): Cart {
  return useSyncExternalStore(subscribe, () => read(slug), () => EMPTY);
}

/** Taom sonini o'rnatadi; 0 yoki undan kam bo'lsa, taom savatdan o'chiriladi. */
export function setQuantity(slug: string, productId: number, quantity: number) {
  const cart = { ...read(slug) };
  if (quantity > 0) {
    cart[productId] = Math.min(quantity, MAX_QUANTITY);
  } else {
    delete cart[productId];
  }
  carts.set(slug, cart);
  try {
    window.localStorage.setItem(storageKey(slug), JSON.stringify(cart));
  } catch {
    // Saqlab bo'lmadi: savat shu sessiya davomida xotirada ishlaydi
  }
  listeners.forEach((listener) => listener());
}
