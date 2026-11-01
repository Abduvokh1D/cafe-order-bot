import type { DeliveryPricing } from "@cafe/db/pricing";
import { formatPrice } from "@/lib/format";

/** Bepul yetkazishgacha qancha qolgani. Kafe narx yoki chegara kiritmagan bo'lsa, ko'rsatilmaydi. */
export function hasFreeDeliveryGoal({ deliveryFee, freeDeliveryFrom }: DeliveryPricing) {
  return Boolean(deliveryFee) && freeDeliveryFrom !== null;
}

export function FreeDeliveryBar({ itemsTotal, pricing }: { itemsTotal: number; pricing: DeliveryPricing }) {
  const goal = pricing.freeDeliveryFrom;
  if (goal === null || !hasFreeDeliveryGoal(pricing)) return null;

  const remaining = goal - itemsTotal;
  const percent = Math.min(100, Math.round((itemsTotal / goal) * 100));
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-center text-sm font-medium">
        {remaining > 0 ? `Yana ${formatPrice(remaining)} qo'shing, yetkazish bepul bo'ladi` : "🎉 Yetkazish bepul"}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-button" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
