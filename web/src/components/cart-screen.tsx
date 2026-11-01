"use client";

import type { MenuProduct } from "@cafe/db";
import type { DeliveryPricing, PromoTerms } from "@cafe/db/pricing";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { CheckoutForm } from "@/components/checkout-form";
import { FreeDeliveryBar, hasFreeDeliveryGoal } from "@/components/free-delivery-bar";
import { BackIcon, ChevronIcon, CutleryIcon, TrashIcon } from "@/components/menu-icons";
import { ProductCard, QuantityStepper } from "@/components/product-card";
import type { Cart } from "@/lib/cart";
import { MAX_COMMENT_LENGTH, MAX_CUTLERY } from "@/lib/cart-limits";
import { formatPrice } from "@/lib/format";

type Step = "cart" | "checkout" | "map";

export type AppliedPromo = { code: string; terms: PromoTerms };
export type OrderExtras = { comment: string; cutleryCount: number; promo: AppliedPromo | null };

function askConfirm(message: string, onConfirmed: () => void) {
  const webApp = window.Telegram?.WebApp;
  if (webApp?.isVersionAtLeast("6.2")) {
    webApp.showConfirm(message, (isConfirmed) => {
      if (isConfirmed) onConfirmed();
    });
  } else if (window.confirm(message)) {
    onConfirmed();
  }
}

export function CartScreen({
  slug,
  cafeName,
  deliveryTime,
  cart,
  lines,
  total,
  pricing,
  cafeAddress,
  closedNotice,
  soldOutNames,
  suggestions,
  extras,
  onExtrasChange,
  onClose,
  onChange,
  onClear,
  onShowOrders,
}: {
  slug: string;
  cafeName: string;
  deliveryTime: string | null;
  cart: Cart;
  lines: { product: MenuProduct; quantity: number }[];
  total: number;
  pricing: DeliveryPricing;
  cafeAddress: string | null;
  closedNotice: string | null;
  soldOutNames: string[];
  suggestions: MenuProduct[];
  extras: OrderExtras;
  onExtrasChange: (extras: OrderExtras) => void;
  onClose: () => void;
  onChange: (productId: number, quantity: number) => void;
  onClear: () => void;
  onShowOrders: (orderId: number) => void;
}) {
  const [step, setStep] = useState<Step>("cart");
  const [placedOrderId, setPlacedOrderId] = useState<number | null>(null);
  const [isCommentOpen, setIsCommentOpen] = useState(extras.comment.length > 0);

  const handleBack = useCallback(() => {
    if (step === "map") {
      setStep("checkout");
    } else if (step === "checkout") {
      setStep("cart");
    } else {
      onClose();
    }
  }, [step, onClose]);

  // Telegram'ning "Orqaga" tugmasi xaritadan formaga, formadan savatga, savatdan menyuga qaytaradi
  useEffect(() => {
    const backButton = window.Telegram?.WebApp.BackButton;
    backButton?.show();
    backButton?.onClick(handleBack);
    return () => {
      backButton?.offClick(handleBack);
      backButton?.hide();
    };
  }, [handleBack]);

  if (placedOrderId !== null) {
    return (
      <div className="fixed inset-0 z-30 flex flex-col justify-end bg-black/50">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Buyurtma yuborildi"
          className="flex flex-col items-center gap-3 rounded-t-3xl bg-background p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center"
        >
          <div aria-hidden className="text-4xl">
            ✅
          </div>
          <h2 className="text-lg font-semibold">Buyurtma №{placedOrderId} yuborildi</h2>
          <p className="text-sm text-hint">Kafe tasdiqlashini kuting.</p>
          <button
            type="button"
            onClick={() => onShowOrders(placedOrderId)}
            className="mt-2 w-full rounded-2xl bg-button py-4 font-semibold text-button-text"
          >
            Buyurtmani kuzatish
          </button>
          <button type="button" onClick={onClose} className="w-full py-2 text-sm font-medium text-hint">
            Yopish
          </button>
        </div>
      </div>
    );
  }

  // Formada jami yetkazish bilan pastda ko'rsatiladi: tepada boshqa summa turmasin
  const subtitle = [step === "cart" ? formatPrice(total) : null, deliveryTime].filter(Boolean).join(" · ");

  return (
    <div role="dialog" aria-modal="true" aria-label="Savat" className="fixed inset-0 z-30 flex flex-col bg-secondary">
      <header className="flex items-center gap-2 bg-background px-2 py-2">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Orqaga"
          className="flex size-11 shrink-0 items-center justify-center rounded-full"
        >
          <BackIcon />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center text-center">
          <h2 className="max-w-full truncate font-bold">{step === "cart" ? cafeName : "Buyurtma berish"}</h2>
          {subtitle && <p className="max-w-full truncate text-xs text-hint">{subtitle}</p>}
        </div>
        {step === "cart" && lines.length > 0 ? (
          <button
            type="button"
            onClick={() => askConfirm("Savat tozalansinmi?", onClear)}
            aria-label="Savatni tozalash"
            className="flex size-11 shrink-0 items-center justify-center rounded-full"
          >
            <TrashIcon />
          </button>
        ) : (
          <span aria-hidden className="size-11 shrink-0" />
        )}
      </header>

      {step === "cart" ? (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pb-24 pt-2">
            {closedNotice && (
              <p role="status" className="rounded-3xl bg-background p-4 text-sm font-medium">
                🔒 {closedNotice}
              </p>
            )}
            <section aria-label="Savatdagi taomlar" className="rounded-3xl bg-background px-4">
              {soldOutNames.length > 0 && (
                <p role="status" className="pt-3 text-sm text-destructive">
                  Tugagan, buyurtmaga kirmaydi: {soldOutNames.join(", ")}
                </p>
              )}
              {lines.length === 0 ? (
                <p className="py-10 text-center text-hint">Savat bo&apos;sh.</p>
              ) : (
                <ul className="divide-y divide-secondary">
                  {lines.map(({ product, quantity }) => (
                    <li key={product.id} className="flex items-center gap-3 py-3">
                      <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary text-2xl">
                        {product.imageUrl ? (
                          <Image src={product.imageUrl} alt="" fill unoptimized sizes="64px" className="object-cover" />
                        ) : (
                          <span aria-hidden>🍽</span>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-sm leading-snug">{product.name}</span>
                        <span className="text-sm font-semibold">{formatPrice(product.price * quantity)}</span>
                      </div>
                      <QuantityStepper
                        name={product.name}
                        quantity={quantity}
                        onChange={(next) => onChange(product.id, next)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {lines.length > 0 && hasFreeDeliveryGoal(pricing) && (
              <section aria-label="Bepul yetkazish" className="rounded-3xl bg-background p-4">
                <FreeDeliveryBar itemsTotal={total} pricing={pricing} />
              </section>
            )}

            {lines.length > 0 && (
              <section aria-label="Qo'shimcha" className="flex flex-col gap-2 rounded-3xl bg-background p-3">
                <div className="flex items-stretch gap-2">
                  <div className="flex shrink-0 items-center gap-1 rounded-2xl bg-secondary pl-3">
                    <CutleryIcon className="size-5" />
                    <QuantityStepper
                      name="Vilka-qoshiq"
                      quantity={extras.cutleryCount}
                      min={0}
                      max={MAX_CUTLERY}
                      onChange={(cutleryCount) => onExtrasChange({ ...extras, cutleryCount })}
                      className=""
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCommentOpen((isOpen) => !isOpen)}
                    aria-expanded={isCommentOpen}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl bg-secondary px-3 text-sm"
                  >
                    <span className={`truncate ${extras.comment ? "" : "text-hint"}`}>{extras.comment || "Izoh yozish"}</span>
                    <ChevronIcon className={`size-4 shrink-0 text-hint ${isCommentOpen ? "rotate-90" : ""}`} />
                  </button>
                </div>
                {isCommentOpen && (
                  <textarea
                    rows={2}
                    maxLength={MAX_COMMENT_LENGTH}
                    value={extras.comment}
                    onChange={(event) => onExtrasChange({ ...extras, comment: event.target.value })}
                    aria-label="Buyurtmaga izoh"
                    placeholder="Masalan: piyozsiz, achchiq bo'lmasin"
                    className="w-full resize-none rounded-2xl bg-secondary px-3 py-2 text-base outline-none placeholder:text-hint"
                  />
                )}
              </section>
            )}

            {suggestions.length > 0 && (
              <section aria-label="Yana nimadir" className="rounded-3xl bg-background p-4">
                <h3 className="pb-3 text-xl font-bold tracking-tight">Yana nimadir?</h3>
                <ul className="grid grid-cols-3 gap-x-2 gap-y-4">
                  {suggestions.map((product) => (
                    <li key={product.id}>
                      <ProductCard
                        product={product}
                        quantity={cart[product.id] ?? 0}
                        onChange={(quantity) => onChange(product.id, quantity)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={lines.length === 0 || closedNotice !== null}
              onClick={() => setStep("checkout")}
              className="pointer-events-auto flex items-center gap-3 rounded-full bg-button py-3 pl-6 pr-3 text-lg font-bold text-button-text shadow-lg disabled:opacity-50"
            >
              Davom etish
              <span className="flex size-7 items-center justify-center rounded-full bg-button-text text-button">
                <ChevronIcon className="size-4" />
              </span>
            </button>
          </div>
        </>
      ) : (
        <CheckoutForm
          slug={slug}
          lines={lines}
          itemsTotal={total}
          pricing={pricing}
          cafeAddress={cafeAddress}
          extras={extras}
          onExtrasChange={onExtrasChange}
          isMapOpen={step === "map"}
          onMapOpen={() => setStep("map")}
          onMapClose={() => setStep("checkout")}
          onPlaced={setPlacedOrderId}
        />
      )}
    </div>
  );
}
