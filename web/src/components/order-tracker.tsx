"use client";

import { useEffect } from "react";
import { BackIcon, CheckIcon } from "@/components/menu-icons";
import { formatDateTime, formatTime } from "@/lib/day";
import { formatPrice } from "@/lib/format";
import { getCurrentStep, getOrderSteps, isActiveOrder, type LoadedOrder, type OrderStep } from "@/lib/order-progress";
import { PAYMENT_LABELS } from "@/lib/payment";

const MINUTE_MS = 60_000;

/** Bosqichlar chizig'i. Joriy bo'lak buyurtma hali davom etayotganini ko'rsatib miltillaydi. */
export function ProgressBar({
  order,
  doneClass,
  restClass,
}: {
  order: LoadedOrder;
  doneClass: string;
  restClass: string;
}) {
  const steps = getOrderSteps(order.type);
  const currentIndex = steps.findIndex((step) => step.status === order.status);
  return (
    <div aria-hidden className="flex gap-1">
      {steps.map((step, index) => (
        <span
          key={step.status}
          className={`h-1.5 flex-1 rounded-full ${index <= currentIndex ? doneClass : restClass} ${
            index === currentIndex && isActiveOrder(order.status) ? "motion-safe:animate-pulse" : ""
          }`}
        />
      ))}
    </div>
  );
}

// Taxminiy vaqt faqat kafe vaqt kiritgan bo'lsa va u hali o'tib ketmagan bo'lsa ko'rsatiladi
function getEta(order: LoadedOrder, minMinutes: number | null, maxMinutes: number | null, checkedAt: number) {
  if (order.type !== "delivery" || !isActiveOrder(order.status) || !minMinutes || !maxMinutes) return null;
  const createdAt = new Date(order.createdAt).getTime();
  const latest = createdAt + maxMinutes * MINUTE_MS;
  if (latest < checkedAt) return null;
  return `${formatTime(new Date(createdAt + minMinutes * MINUTE_MS))}–${formatTime(new Date(latest))}`;
}

export function OrderTracker({
  order,
  checkedAt,
  deliveryMinMinutes,
  deliveryMaxMinutes,
  onClose,
}: {
  order: LoadedOrder;
  checkedAt: number;
  deliveryMinMinutes: number | null;
  deliveryMaxMinutes: number | null;
  onClose: () => void;
}) {
  const current = getCurrentStep(order);
  const isActive = isActiveOrder(order.status);
  const isCancelled = order.status === "cancelled";
  const eta = getEta(order, deliveryMinMinutes, deliveryMaxMinutes, checkedAt);

  // Telegram'ning "Orqaga" tugmasi ham buyurtmalar ro'yxatiga qaytaradi
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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Buyurtma №${order.id}`}
      className="fixed inset-0 z-30 flex flex-col overflow-y-auto overscroll-contain bg-secondary"
    >
      <div className={isActive ? "bg-button text-button-text" : "bg-background"}>
        <header className="flex items-center gap-2 px-2 py-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Orqaga"
            className="flex size-11 shrink-0 items-center justify-center rounded-full"
          >
            <BackIcon />
          </button>
          <div className="min-w-0">
            <h1 className="truncate font-bold">Buyurtma №{order.id}</h1>
            <p className="truncate text-xs opacity-70">{formatDateTime(new Date(order.createdAt))}</p>
          </div>
        </header>

        {/* Holat o'zgarganda ekran o'quvchi dasturlar ham aytib beradi */}
        <section aria-live="polite" className="flex flex-col gap-3 px-5 pb-6 pt-3">
          <div aria-hidden className="text-5xl leading-none">
            {current.icon}
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{current.title}</h2>
            <p className="pt-1 opacity-80">{current.hint}</p>
          </div>
          {eta && (
            <p className="text-sm">
              Taxminiy vaqt: <span className="font-bold tabular-nums">{eta}</span>
            </p>
          )}
          {!isCancelled && (
            <ProgressBar
              order={order}
              doneClass={isActive ? "bg-button-text" : "bg-button"}
              restClass={isActive ? "bg-button-text/20" : "bg-secondary"}
            />
          )}
        </section>
      </div>

      <div className="flex flex-col gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
        {!isCancelled && (
          <section aria-label="Buyurtma bosqichlari" className="rounded-3xl bg-background p-5">
            <ol>
              {getOrderSteps(order.type).map((step, index, steps) => (
                <TimelineStep
                  key={step.status}
                  step={step}
                  state={
                    index < steps.findIndex((item) => item.status === order.status)
                      ? "done"
                      : step.status === order.status
                        ? isActive
                          ? "current"
                          : "done"
                        : "next"
                  }
                  isLast={index === steps.length - 1}
                />
              ))}
            </ol>
            <p className="pt-3 text-xs text-hint">
              Oxirgi o&apos;zgarish: {formatTime(new Date(order.updatedAt))}.{isActive && " Holat o'zi yangilanadi."}
            </p>
          </section>
        )}

        <section aria-label="Buyurtma tarkibi" className="flex flex-col gap-3 rounded-3xl bg-background p-5">
          <h3 className="text-lg font-bold tracking-tight">Buyurtma tarkibi</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {order.items.map((item) => (
              <li key={item.productName} className="flex justify-between gap-3">
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span className="shrink-0 tabular-nums text-hint">{formatPrice(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          {order.deliveryFee > 0 && (
            <div className="flex justify-between gap-3 text-sm">
              <span>Yetkazib berish</span>
              <span className="shrink-0 tabular-nums text-hint">{formatPrice(order.deliveryFee)}</span>
            </div>
          )}
          <div className="flex justify-between gap-3 border-t border-secondary pt-3 font-bold">
            <span>Jami</span>
            <span className="tabular-nums">{formatPrice(order.totalAmount)}</span>
          </div>
          <p className="text-sm text-hint">
            To&apos;lov: {PAYMENT_LABELS[order.paymentMethod]}
            {isActive && (order.type === "delivery" ? ", buyurtmani olganda" : ", kafeda olib ketayotganda")}
          </p>
        </section>

        <section aria-label="Tafsilotlar" className="flex flex-col gap-2 rounded-3xl bg-background p-5 text-sm">
          <p className="font-medium">{order.type === "delivery" ? "🚗 Yetkazib berish" : "🏃 Olib ketish"}</p>
          {order.address && <p className="text-hint">{order.address}</p>}
          {order.hasLocation && <p className="text-hint">📍 Joy xaritada belgilangan</p>}
          {order.cutleryCount > 0 && <p className="text-hint">🍴 Vilka-qoshiq: {order.cutleryCount} ta</p>}
          {order.comment && <p className="text-hint">💬 {order.comment}</p>}
        </section>
      </div>
    </div>
  );
}

function TimelineStep({
  step,
  state,
  isLast,
}: {
  step: OrderStep;
  state: "done" | "current" | "next";
  isLast: boolean;
}) {
  return (
    <li aria-current={state === "current" ? "step" : undefined} className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
            state === "next" ? "bg-secondary" : "bg-button text-button-text"
          } ${state === "current" ? "ring-4 ring-button/30 motion-safe:animate-pulse" : ""}`}
        >
          {state === "done" && <CheckIcon className="size-4" />}
          {state === "current" && <span className="size-2 rounded-full bg-button-text" />}
        </span>
        {!isLast && <span className={`my-1 min-h-5 w-0.5 flex-1 ${state === "done" ? "bg-button" : "bg-secondary"}`} />}
      </div>
      <div className={`min-w-0 pb-4 pt-0.5 ${state === "next" ? "text-hint" : ""}`}>
        <p className={state === "current" ? "font-bold" : "font-medium"}>{step.title}</p>
        {state === "current" && <p className="text-sm text-hint">{step.hint}</p>}
      </div>
    </li>
  );
}
