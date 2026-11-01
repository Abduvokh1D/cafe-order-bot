"use client";

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronIcon } from "@/components/menu-icons";
import { OrderTracker, ProgressBar } from "@/components/order-tracker";
import { formatDateTime } from "@/lib/day";
import { formatPrice } from "@/lib/format";
import { getCurrentStep, isActiveOrder, type LoadedOrder } from "@/lib/order-progress";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; isTemporary?: boolean }
  | { status: "ready"; orders: LoadedOrder[]; checkedAt: number };

const REFRESH_MS = 10_000;

async function fetchOrders(slug: string): Promise<LoadState> {
  const initData = window.Telegram?.WebApp.initData ?? "";
  if (!initData) return { status: "error", message: "Buyurtmalarni ko'rish uchun menyuni Telegram orqali oching." };

  try {
    const response = await fetch("/api/my-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cafeSlug: slug, initData }),
    });
    if (response.status === 401) {
      return { status: "error", message: "Sessiya eskirgan. Mini App'ni yopib, bot orqali qayta oching." };
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { orders: LoadedOrder[] };
    return { status: "ready", orders: data.orders, checkedAt: Date.now() };
  } catch {
    return { status: "error", message: "Buyurtmalar yuklanmadi. Internetni tekshirib, qayta oching.", isTemporary: true };
  }
}

function refreshOrders(slug: string, setState: Dispatch<SetStateAction<LoadState>>) {
  return fetchOrders(slug).then((next) => {
    // Internet bir zum uzilsa, ko'rinib turgan ro'yxat xato xabariga almashmaydi
    setState((current) => (next.status === "error" && next.isTemporary && current.status === "ready" ? current : next));
  });
}

/** Holatni xodimlar o'zgartiradi: ochiq turganda va ilovaga qaytganda qayta yuklanadi. */
export function MyOrders({
  slug,
  cafePhone,
  cafeAddress,
  deliveryMinMinutes,
  deliveryMaxMinutes,
  initialOrderId,
}: {
  slug: string;
  cafePhone: string | null;
  cafeAddress: string | null;
  deliveryMinMinutes: number | null;
  deliveryMaxMinutes: number | null;
  /** Buyurtma berilgandan keyin to'g'ri kuzatish sahifasi ochiladi */
  initialOrderId: number | null;
}) {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [openOrderId, setOpenOrderId] = useState(initialOrderId);
  const closeOrder = useCallback(() => setOpenOrderId(null), []);

  const orders = state.status === "ready" ? state.orders : [];
  const activeOrders = orders.filter((order) => isActiveOrder(order.status));
  const pastOrders = orders.filter((order) => !isActiveOrder(order.status));
  const openOrder = orders.find((order) => order.id === openOrderId);
  const hasActiveOrder = activeOrders.length > 0;

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void refreshOrders(slug, setState);
    };
    void refreshOrders(slug, setState);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => document.removeEventListener("visibilitychange", refreshIfVisible);
  }, [slug]);

  // Hammasi yakunlangan bo'lsa, boshqa o'zgarmaydi: serverga bekorga so'rov ketmaydi
  useEffect(() => {
    if (!hasActiveOrder) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refreshOrders(slug, setState);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [hasActiveOrder, slug]);

  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <h1 className="text-2xl font-bold tracking-tight">Buyurtmalarim</h1>

      {state.status === "loading" && (
        <div className="flex flex-col gap-3" aria-label="Buyurtmalar yuklanmoqda">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <p role="alert" className="rounded-2xl bg-secondary p-6 text-center text-hint">
          {state.message}
        </p>
      )}

      {state.status === "ready" && orders.length === 0 && (
        <p className="rounded-2xl bg-secondary p-8 text-center text-hint">Hali buyurtma bermagansiz.</p>
      )}

      {activeOrders.length > 0 && (
        <ul aria-label="Faol buyurtmalar" className="flex flex-col gap-3">
          {activeOrders.map((order) => (
            <li key={order.id}>
              <ActiveOrderCard order={order} onOpen={() => setOpenOrderId(order.id)} />
            </li>
          ))}
        </ul>
      )}

      {pastOrders.length > 0 && (
        <section aria-label="Oldingi buyurtmalar" className="flex flex-col gap-2">
          <h2 className="pt-1 text-sm font-medium text-hint">Oldingi buyurtmalar</h2>
          <ul className="flex flex-col gap-2">
            {pastOrders.map((order) => (
              <li key={order.id}>
                <PastOrderRow order={order} onOpen={() => setOpenOrderId(order.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {openOrder && state.status === "ready" && (
        <OrderTracker
          order={openOrder}
          cafePhone={cafePhone}
          cafeAddress={cafeAddress}
          checkedAt={state.checkedAt}
          deliveryMinMinutes={deliveryMinMinutes}
          deliveryMaxMinutes={deliveryMaxMinutes}
          onClose={closeOrder}
        />
      )}
    </div>
  );
}

function itemsSummary(order: LoadedOrder) {
  return order.items.map((item) => `${item.productName} × ${item.quantity}`).join(", ");
}

function ActiveOrderCard({ order, onOpen }: { order: LoadedOrder; onOpen: () => void }) {
  const step = getCurrentStep(order);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-3 rounded-2xl border-2 border-button bg-background p-4 text-left shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-button text-xl">
          {step.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{step.title}</p>
          <p className="truncate text-sm text-hint">{step.hint}</p>
        </div>
        <ChevronIcon className="size-5 shrink-0 text-hint" />
      </div>
      <ProgressBar order={order} doneClass="bg-button" restClass="bg-secondary" />
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate text-hint">
          №{order.id} · {itemsSummary(order)}
        </span>
        <span className="shrink-0 font-semibold">{formatPrice(order.totalAmount)}</span>
      </div>
    </button>
  );
}

// Yakunlangan buyurtma e'tibor tortmaydi: faol buyurtma bilan adashtirilmasin
function PastOrderRow({ order, onOpen }: { order: LoadedOrder; onOpen: () => void }) {
  const step = getCurrentStep(order);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-col gap-0.5 rounded-xl bg-secondary px-3 py-2.5 text-left text-sm text-hint opacity-70"
    >
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-medium">
          №{order.id} · {step.title}
        </span>
        <span className="shrink-0 tabular-nums">{formatPrice(order.totalAmount)}</span>
      </span>
      <span className="flex items-baseline justify-between gap-3 text-xs">
        <span className="min-w-0 truncate">{itemsSummary(order)}</span>
        <time dateTime={order.createdAt} className="shrink-0 tabular-nums">
          {formatDateTime(new Date(order.createdAt))}
        </time>
      </span>
    </button>
  );
}
