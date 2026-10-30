"use client";

import type { MenuProduct, OrderType } from "@cafe/db";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { clearCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import { isLocationSupported, requestLocation, type Coordinates } from "@/lib/location";

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
  total,
  onPlaced,
}: {
  slug: string;
  lines: { product: MenuProduct; quantity: number }[];
  total: number;
  onPlaced: (orderId: number) => void;
}) {
  const router = useRouter();
  // Forma ochilganda bir marta yaratiladi: qayta yuborilsa, server buyurtmani ikkilamaydi
  const [requestId] = useState(() => crypto.randomUUID());
  const [type, setType] = useState<OrderType>("delivery");
  const [phone, setPhone] = useState(loadPhone);
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [canLocate, setCanLocate] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    void isLocationSupported().then((supported) => {
      if (isActive) setCanLocate(supported);
    });
    return () => {
      isActive = false;
    };
  }, []);

  async function handleLocation() {
    setIsLocating(true);
    setError(null);
    try {
      setLocation(await requestLocation());
    } catch {
      setError("Lokatsiyani olib bo'lmadi. Manzilni yozib qoldiring.");
    } finally {
      setIsLocating(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    if (!isValidPhone(phone)) {
      setError("Telefon raqamini to'g'ri kiriting, masalan: +998 90 123 45 67");
      return;
    }
    const isDelivery = type === "delivery";
    if (isDelivery && !address.trim() && !location) {
      setError(canLocate ? "Manzilni yozing yoki lokatsiyani yuboring." : "Manzilni yozing.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeSlug: slug,
          initData: window.Telegram?.WebApp.initData ?? "",
          requestId,
          type,
          phone,
          address: isDelivery ? address : null,
          latitude: isDelivery ? (location?.latitude ?? null) : null,
          longitude: isDelivery ? (location?.longitude ?? null) : null,
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

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
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
              onClick={() => setType(value)}
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
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={`${inputClass} text-base font-normal`}
          />
        </label>

        {type === "delivery" && (
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              {location ? "Qo'shimcha ma'lumot (ixtiyoriy)" : "Manzil"}
              <textarea
                rows={2}
                maxLength={500}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder={location ? "Xonadon, qavat, kirish, mo'ljal" : "Ko'cha, uy, xonadon, mo'ljal"}
                className={`${inputClass} resize-none text-base font-normal`}
              />
            </label>
            {canLocate && (
              <button
                type="button"
                onClick={handleLocation}
                disabled={isLocating}
                className="rounded-xl bg-secondary py-3 text-sm font-medium disabled:opacity-50"
              >
                {isLocating
                  ? "Lokatsiya aniqlanmoqda..."
                  : location
                    ? "📍 Lokatsiya qo'shildi (yangilash)"
                    : "📍 Lokatsiyani yuborish"}
              </button>
            )}
          </div>
        )}

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

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-secondary p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between font-semibold">
          <span>Jami</span>
          <span>{formatPrice(total)}</span>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || lines.length === 0}
          className="rounded-2xl bg-button py-4 font-semibold text-button-text disabled:opacity-50"
        >
          {isSubmitting ? "Yuborilmoqda..." : "Buyurtmani tasdiqlash"}
        </button>
      </div>
    </form>
  );
}
