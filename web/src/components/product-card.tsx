"use client";

import type { MenuProduct } from "@cafe/db";
import Image from "next/image";
import { MinusIcon, PlusIcon } from "@/components/menu-icons";
import { MAX_QUANTITY } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export function QuantityStepper({
  name,
  quantity,
  onChange,
  min = 0,
  max = MAX_QUANTITY,
  className = "bg-secondary",
}: {
  name: string;
  quantity: number;
  onChange: (quantity: number) => void;
  /** Shundan pastga tushirib bo'lmaydi. Savatda 1 dan kamaytirish taomni olib tashlaydi. */
  min?: number;
  max?: number;
  className?: string;
}) {
  const buttonClass = "flex size-9 shrink-0 items-center justify-center rounded-full disabled:opacity-30";
  return (
    <div className={`flex items-center rounded-full ${className}`}>
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        disabled={quantity <= min}
        aria-label={`${name} sonini kamaytirish`}
        className={buttonClass}
      >
        <MinusIcon className="size-4" />
      </button>
      <span aria-live="polite" className="min-w-5 text-center text-sm font-semibold tabular-nums">
        {quantity}
      </span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        disabled={quantity >= max}
        aria-label={`${name} sonini ko'paytirish`}
        className={buttonClass}
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}

export function ProductCard({
  product,
  quantity,
  onChange,
}: {
  product: MenuProduct;
  quantity: number;
  onChange: (quantity: number) => void;
}) {
  return (
    <article className="flex flex-col gap-2">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-secondary">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, 240px"
            className={`object-cover ${product.isAvailable ? "" : "opacity-60 grayscale"}`}
          />
        ) : (
          <div aria-hidden className={`flex h-full items-center justify-center text-5xl ${product.isAvailable ? "" : "opacity-40"}`}>
            🍽
          </div>
        )}
        {!product.isAvailable ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-background px-3 py-2 text-sm font-medium text-hint shadow">
            Tugadi
          </span>
        ) : quantity > 0 ? (
          <QuantityStepper
            name={product.name}
            quantity={quantity}
            onChange={onChange}
            className="absolute inset-x-1.5 bottom-1.5 justify-between bg-background shadow"
          />
        ) : (
          <button
            type="button"
            onClick={() => onChange(1)}
            aria-label={`${product.name}ni savatga qo'shish`}
            className="absolute bottom-1.5 right-1.5 flex size-9 items-center justify-center rounded-full bg-background shadow"
          >
            <PlusIcon className="size-5" />
          </button>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-1">
        <span className="font-bold">{formatPrice(product.price)}</span>
        <h3 className="text-sm leading-snug">{product.name}</h3>
        {product.description && <p className="line-clamp-2 text-xs leading-snug text-hint">{product.description}</p>}
      </div>
    </article>
  );
}
