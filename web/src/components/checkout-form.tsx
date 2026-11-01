"use client";

import type { MenuProduct, OrderType, PaymentMethod } from "@cafe/db";
import { getDeliveryFee, type DeliveryPricing } from "@cafe/db/pricing";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import type { OrderExtras } from "@/components/cart-screen";
import { LocationPicker } from "@/components/location-picker";
import { clearCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { Coordinates } from "@/lib/location";
import { PAYMENT_LABELS } from "@/lib/payment";

const PHONE_STORAGE_KEY = "order:phone";

function loadPhone() {
  try {
    return window.localStorage.getItem(PHONE_STORAGE_KEY) ?? "+998 ";
  } catch {
    return "+998 ";
  }
}

function savePhone(phone: string) {
  try {
    window.localStorage.setItem(PHONE_STORAGE_KEY, phone);
  } catch {
    // Saqlab bo'lmadi: keyingi safar raqam qayta yoziladi
  }
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return /^\+?[\d\s()-]+$/.test(phone.trim()) && digits.length >= 9 && digits.length <= 15;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_signature: "Sessiya eskirgan. Mini App'ni yopib, bot orqali qayta oching.",
  cafe_not_ready: "Kafe hozircha buyurtma qabul qilmayapti.",
  cafe_not_found: "Kafe topilmadi.",
  invalid_request: "Ma'lumotlarni tekshirib, qayta yuboring.",
  price_changed: "Narxlar yangilandi. Jamini tekshirib, qayta yuboring.",
};
const DEFAULT_ERROR = "Buyurtma yuborilmadi. Internetni tekshirib, qayta urinib ko'ring.";

export function CheckoutForm({
  slug,
  lines,
  itemsTotal,
  pricing,
  extras,
  isMapOpen,
  onMapOpen,
  onMapClose,
  onPlaced,
}: {
  slug: string;
  lines: { product: MenuProduct; quantity: number }[];
  itemsTotal: number;
  pricing: DeliveryPricing;
  extras: OrderExtras;
  isMapOpen: boolean;
  onMapOpen: () => void;
  onMapClose: () => void;
  onPlaced: (orderId: number) => void;
}) {
  const router = useRouter();
  // Forma ochilganda bir marta yaratiladi: qayta yuborilsa, server buyurtmani ikkilamaydi
  const [requestId] = useState(() => crypto.randomUUID());
  const [type, setType] = useState<OrderType>("delivery");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [phone, setPhone] = useState(loadPhone);
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidField, setInvalidField] = useState<"phone" | "address" | null>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const deliveryFee = getDeliveryFee(type, itemsTotal, pricing);
  const total = itemsTotal + deliveryFee;

  function clearError() {
    setError(null);
    setInvalidField(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!isValidPhone(phone)) {
      setError("Telefon raqamini to'g'ri kiriting, masalan: +998 90 123 45 67");
      setInvalidField("phone");
      phoneRef.current?.focus();
      return;
    }
    const isDelivery = type === "delivery";
    if (isDelivery && !address.trim() && !location) {
      setError("Manzilni yozing yoki xaritadan belgilang.");
      setInvalidField("address");
      // Klaviatura ochilmaydi: mijoz xaritani tanlashi ham mumkin
      addressRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    clearError();
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeSlug: slug,
          initData: window.Telegram?.WebApp.initData ?? "",
          requestId,
          type,
          paymentMethod,
          phone,
          address: isDelivery ? address : null,
          latitude: isDelivery ? (location?.latitude ?? null) : null,
          longitude: isDelivery ? (location?.longitude ?? null) : null,
          comment: extras.comment,
          cutleryCount: extras.cutleryCount,
          items: lines.map(({ product, quantity }) => ({ productId: product.id, quantity })),
          expectedTotal: total,
        }),
      });
      const data = (await response.json()) as {
        orderId?: number;
        error?: string;
        productNames?: string[];
      };

      if (response.ok && data.orderId) {
        savePhone(phone);
        clearCart(slug);
        onPlaced(data.orderId);
        return;
      }

      if (data.error === "unavailable") {
        const names = data.productNames?.join(", ");
        setError(`Tugagan taomlar bor${names ? `: ${names}` : ""}. Savatni tekshirib, qayta yuboring.`);
        router.refresh();
      } else {
        setError(ERROR_MESSAGES[data.error ?? ""] ?? DEFAULT_ERROR);
        if (data.error === "price_changed") router.refresh();
      }
    } catch {
      setError(DEFAULT_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "w-full rounded-xl bg-secondary px-4 py-3 outline-none placeholder:text-hint";
  const invalidClass = "ring-2 ring-destructive";

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-2">
        <div role="radiogroup" aria-label="Buyurtma turi" className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
          {(
            [
              ["delivery", "🚗 Yetkazib berish"],
              ["pickup", "🏃 Olib ketish"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              onClick={() => {
                setType(value);
                clearError();
              }}
              className={`rounded-lg py-2 text-sm font-medium ${type === value ? "bg-button text-button-text" : ""}`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Telefon raqami
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            ref={phoneRef}
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value);
              clearError();
            }}
            aria-invalid={invalidField === "phone"}
            className={`${inputClass} text-base font-normal ${invalidField === "phone" ? invalidClass : ""}`}
          />
        </label>

        {type === "delivery" && (
          <div ref={addressRef} className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              {location ? "Qo'shimcha ma'lumot (ixtiyoriy)" : "Manzil"}
              <textarea
                rows={2}
                maxLength={500}
                value={address}
                onChange={(event) => {
                  setAddress(event.target.value);
                  clearError();
                }}
                aria-invalid={invalidField === "address"}
                placeholder={location ? "Xonadon, qavat, kirish, mo'ljal" : "Ko'cha, uy, xonadon, mo'ljal"}
                className={`${inputClass} resize-none text-base font-normal ${invalidField === "address" ? invalidClass : ""}`}
              />
            </label>
            <button
              type="button"
              onClick={onMapOpen}
              className={`rounded-xl bg-secondary py-3 text-sm font-medium ${invalidField === "address" ? invalidClass : ""}`}
            >
              {location ? "📍 Joy belgilandi (o'zgartirish)" : "🗺 Xaritadan belgilash"}
            </button>
          </div>
        )}

        <section className="flex flex-col gap-2">
          <h3 id="payment-title" className="text-sm font-medium">
            To&apos;lov turi
          </h3>
          <div role="radiogroup" aria-labelledby="payment-title" className="grid grid-cols-2 gap-2">
            {(["cash", "card"] as const).map((method) => (
              <button
                key={method}
                type="button"
                role="radio"
                aria-checked={paymentMethod === method}
                onClick={() => setPaymentMethod(method)}
                className={`rounded-2xl border-2 bg-secondary px-3 py-3 text-left font-medium ${
                  paymentMethod === method ? "border-foreground" : "border-transparent"
                }`}
              >
                {PAYMENT_LABELS[method]}
              </button>
            ))}
          </div>
          <p className="text-sm text-hint">
            {type === "delivery"
              ? "To'lov buyurtmani olganingizda kuryerga qilinadi."
              : "To'lov buyurtmani olib ketayotganda kafeda qilinadi."}
          </p>
        </section>

        <section aria-label="Buyurtma tarkibi" className="flex flex-col gap-1 text-sm">
          <h3 className="font-medium">Buyurtmangiz</h3>
          <ul className="flex flex-col gap-1 text-hint">
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="flex justify-between gap-3">
                <span>
                  {product.name} × {quantity}
                </span>
                <span className="shrink-0">{formatPrice(product.price * quantity)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="flex flex-col gap-3 border-t border-secondary p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {type === "delivery" && pricing.deliveryFee !== null && (
          <dl className="flex flex-col gap-1 text-sm text-hint">
            <div className="flex items-center justify-between">
              <dt>Taomlar</dt>
              <dd>{formatPrice(itemsTotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Yetkazib berish</dt>
              <dd>{deliveryFee > 0 ? formatPrice(deliveryFee) : "Bepul"}</dd>
            </div>
          </dl>
        )}
        <div className="flex items-center justify-between font-semibold">
          <span>Jami</span>
          <span>{formatPrice(total)}</span>
        </div>
        {/* Tugma yonida: forma uzun bo'lsa, ichidagi xabar ekrandan tashqarida qolib ketadi */}
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting || lines.length === 0}
          className="rounded-2xl bg-button py-4 font-semibold text-button-text disabled:opacity-50"
        >
          {isSubmitting ? "Yuborilmoqda..." : "Buyurtmani tasdiqlash"}
        </button>
      </div>

      {isMapOpen && (
        <LocationPicker
          initial={location}
          onBack={onMapClose}
          onConfirm={(picked) => {
            setLocation(picked);
            clearError();
            onMapClose();
          }}
        />
      )}
    </form>
  );
}
