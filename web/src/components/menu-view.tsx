"use client";

import type { CafeMenu, MenuProduct } from "@cafe/db";
import Image from "next/image";
import { useEffect, useState } from "react";
import { MAX_QUANTITY, setQuantity, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export function MenuView({ menu }: { menu: CafeMenu }) {
  const { slug } = menu.cafe;
  const cart = useCart(slug);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Tugagan yoki menyudan olib tashlangan taomlar savat summasiga kirmaydi
  const lines = menu.categories
    .flatMap((category) => category.products)
    .filter((product) => product.isAvailable && cart[product.id] > 0)
    .map((product) => ({ product, quantity: cart[product.id] }));
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);

  return (
    <div className="flex flex-1 flex-col bg-secondary pb-24">
      <header className="sticky top-0 z-10 bg-section shadow-sm">
        <h1 className="px-4 pt-3 text-xl font-semibold">{menu.cafe.name}</h1>
        <nav aria-label="Kategoriyalar" className="flex gap-2 overflow-x-auto px-4 py-3">
          {menu.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() =>
                document.getElementById(`category-${category.id}`)?.scrollIntoView({ behavior: "smooth" })
              }
              className="shrink-0 rounded-full bg-secondary px-4 py-2 text-sm font-medium"
            >
              {category.name}
            </button>
          ))}
        </nav>
      </header>

      {menu.categories.length === 0 && (
        <p className="p-8 text-center text-hint">Menyu hali tayyor emas.</p>
      )}

      {menu.categories.map((category) => (
        <section key={category.id} id={`category-${category.id}`} className="scroll-mt-28 px-4 pt-5">
          <h2 className="pb-3 text-lg font-semibold">{category.name}</h2>
          <ul className="flex flex-col gap-3">
            {category.products.map((product) => (
              <li key={product.id}>
                <ProductCard
                  product={product}
                  quantity={cart[product.id] ?? 0}
                  onChange={(quantity) => setQuantity(slug, product.id, quantity)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="flex w-full items-center justify-between rounded-2xl bg-button px-5 py-4 font-semibold text-button-text shadow-lg"
          >
            <span>Savat · {count} ta</span>
            <span>{formatPrice(total)}</span>
          </button>
        </div>
      )}

      {isCartOpen && (
        <CartSheet
          lines={lines}
          total={total}
          onClose={() => setIsCartOpen(false)}
          onChange={(productId, quantity) => setQuantity(slug, productId, quantity)}
        />
      )}
    </div>
  );
}

function ProductCard({
  product,
  quantity,
  onChange,
}: {
  product: MenuProduct;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <article className="flex gap-3 rounded-2xl bg-section p-3">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-secondary">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            unoptimized
            sizes="96px"
            className={`object-cover ${product.isAvailable ? "" : "grayscale"}`}
          />
        ) : (
          <div aria-hidden className="flex h-full items-center justify-center text-3xl">
            🍽
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="font-medium">{product.name}</h3>
        {product.description && <p className="text-sm text-hint">{product.description}</p>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <span className="font-semibold">{formatPrice(product.price)}</span>
          {!product.isAvailable ? (
            <span className="rounded-lg bg-secondary px-3 py-2 text-sm text-hint">Tugadi</span>
          ) : quantity > 0 ? (
            <QuantityStepper name={product.name} quantity={quantity} onChange={onChange} />
          ) : (
            <button
              type="button"
              onClick={() => onChange(1)}
              aria-label={`${product.name}ni savatga qo'shish`}
              className="rounded-lg bg-button px-4 py-2 text-sm font-medium text-button-text"
            >
              Qo&apos;shish
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function QuantityStepper({
  name,
  quantity,
  onChange,
}: {
  name: string;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  const buttonClass = "size-9 rounded-lg bg-secondary text-lg font-semibold disabled:opacity-40";
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        aria-label={`${name} sonini kamaytirish`}
        className={buttonClass}
      >
        −
      </button>
      <span aria-live="polite" className="min-w-8 text-center font-medium tabular-nums">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= MAX_QUANTITY}
        aria-label={`${name} sonini ko'paytirish`}
        className={buttonClass}
      >
        +
      </button>
    </div>
  );
}

function CartSheet({
  lines,
  total,
  onClose,
  onChange,
}: {
  lines: { product: MenuProduct; quantity: number }[];
  total: number;
  onClose: () => void;
  onChange: (productId: number, quantity: number) => void;
}) {
  // Telegram'ning "Orqaga" tugmasi savatni yopadi
  useEffect(() => {
    const backButton = window.Telegram?.WebApp.BackButton;
    backButton?.show();
    backButton?.onClick(onClose);
    return () => {
      backButton?.offClick(onClose);
      backButton?.hide();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Savat"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85%] flex-col rounded-t-3xl bg-section"
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 className="text-lg font-semibold">Savat</h2>
          <button type="button" onClick={onClose} className="px-2 py-1 text-sm text-hint">
            Yopish
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="px-4 py-10 text-center text-hint">Savat bo&apos;sh.</p>
        ) : (
          <ul className="flex-1 divide-y divide-secondary overflow-y-auto overscroll-contain px-4">
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="flex flex-col gap-2 py-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{product.name}</span>
                  <span className="shrink-0 font-semibold">{formatPrice(product.price * quantity)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <QuantityStepper
                    name={product.name}
                    quantity={quantity}
                    onChange={(next) => onChange(product.id, next)}
                  />
                  <button
                    type="button"
                    onClick={() => onChange(product.id, 0)}
                    aria-label={`${product.name}ni savatdan o'chirish`}
                    className="px-2 py-1 text-sm text-destructive"
                  >
                    O&apos;chirish
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3 border-t border-secondary p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between font-semibold">
            <span>Jami</span>
            <span>{formatPrice(total)}</span>
          </div>
          {/* Buyurtma berish 5-haftada ulanadi */}
          <button
            type="button"
            disabled
            className="rounded-2xl bg-button py-4 font-semibold text-button-text opacity-50"
          >
            Buyurtma berish (tez orada)
          </button>
        </div>
      </div>
    </div>
  );
}
