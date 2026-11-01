import { getCafeAccepting, getOrdersForDay, type AdminOrder } from "@cafe/db";
import { formatMinutes, getCafeAvailability, minutesInTimeZone, type CafeHours } from "@cafe/db/hours";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { setAcceptingAction } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDay, formatTime, isValidDay, shiftDay, TIME_ZONE, today } from "@/lib/day";
import { formatPrice } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/order-labels";
import { PAYMENT_LABELS } from "@/lib/payment";
import { hasPermission } from "@/lib/permissions";

const TOP_PRODUCTS = 5;

export default function OrdersPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-hint">Yuklanmoqda...</p>}>
      <OrdersForDay searchParams={searchParams} />
    </Suspense>
  );
}

async function OrdersForDay({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const admin = await requireAdmin();
  const { date } = await searchParams;
  // "Bugun" so'rov paytida hisoblanadi, oldindan render qilinmaydi
  await connection();
  const now = today();
  const day = isValidDay(date) && date <= now ? date : now;
  const [orders, hours] = await Promise.all([getOrdersForDay(admin.cafeId, day, TIME_ZONE), getCafeAccepting(admin.cafeId)]);

  return (
    <>
      <AcceptingCard hours={hours} />

      <nav aria-label="Kun tanlash" className="flex items-center justify-between gap-3">
        <Link
          href={`/admin?date=${shiftDay(day, -1)}`}
          aria-label="Oldingi kun"
          className="shrink-0 rounded-lg bg-section px-3 py-2 text-sm font-medium"
        >
          ←
        </Link>
        <h1 className="text-center text-lg font-semibold">
          {formatDay(day)}
          {day === now && <span className="font-normal text-hint"> · bugun</span>}
        </h1>
        {day < now ? (
          <Link
            href={`/admin?date=${shiftDay(day, 1)}`}
            aria-label="Keyingi kun"
            className="shrink-0 rounded-lg bg-section px-3 py-2 text-sm font-medium"
          >
            →
          </Link>
        ) : (
          <span aria-hidden className="w-9 shrink-0" />
        )}
      </nav>

      {hasPermission(admin.role, "reports") && <DayReport orders={orders} />}

      {orders.length === 0 ? (
        <p className="rounded-2xl bg-section p-8 text-center text-hint">Bu kunda buyurtma yo&apos;q.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function AcceptingCard({ hours }: { hours: CafeHours }) {
  const availability = getCafeAvailability(hours, minutesInTimeZone(new Date(), TIME_ZONE));
  const hasHours = hours.opensAtMinutes !== null && hours.closesAtMinutes !== null;
  const schedule = hasHours ? `Ish vaqti: ${formatMinutes(hours.opensAtMinutes!)}–${formatMinutes(hours.closesAtMinutes!)}` : "Ish vaqti kiritilmagan";
  return (
    <section aria-label="Buyurtma qabul qilish" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-section p-4">
      <div className="min-w-0">
        <p className="font-semibold">{availability.isOpen ? "🟢 Buyurtma qabul qilinyapti" : "🔴 Buyurtma qabul qilinmayapti"}</p>
        <p className="text-sm text-hint">
          {!availability.isOpen && availability.reason === "paused" ? "Qo'lda to'xtatilgan" : schedule}
        </p>
      </div>
      <AdminForm
        action={setAcceptingAction}
        confirmMessage={hours.isAcceptingOrders ? "Yangi buyurtmalar to'xtatilsinmi?" : undefined}
        className="flex shrink-0 flex-col items-end gap-1"
      >
        <input type="hidden" name="isAccepting" value={String(!hours.isAcceptingOrders)} />
        <button
          type="submit"
          className={`rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50 ${hours.isAcceptingOrders ? "bg-secondary text-destructive" : "bg-button text-button-text"}`}
        >
          {hours.isAcceptingOrders ? "To'xtatish" : "Qayta yoqish"}
        </button>
      </AdminForm>
    </section>
  );
}

function DayReport({ orders }: { orders: AdminOrder[] }) {
  const active = orders.filter((order) => order.status !== "cancelled");
  const total = active.reduce((sum, order) => sum + order.totalAmount, 0);
  const average = active.length > 0 ? Math.round(total / active.length) : 0;

  const quantities = new Map<string, number>();
  for (const order of active) {
    for (const item of order.items) {
      quantities.set(item.productName, (quantities.get(item.productName) ?? 0) + item.quantity);
    }
  }
  const topProducts = [...quantities.entries()].sort((a, b) => b[1] - a[1]).slice(0, TOP_PRODUCTS);

  return (
    <section aria-label="Kunlik hisobot" className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Buyurtmalar" value={String(active.length)} />
        <Stat label="Jami summa" value={formatPrice(total)} />
        <Stat label="O'rtacha chek" value={formatPrice(average)} />
        <Stat label="Bekor qilingan" value={String(orders.length - active.length)} />
      </dl>
      {topProducts.length > 0 && (
        <div className="rounded-2xl bg-section p-4">
          <h2 className="pb-2 font-semibold">Ko&apos;p buyurtma qilingan</h2>
          <ol className="flex flex-col gap-1 text-sm">
            {topProducts.map(([name, quantity]) => (
              <li key={name} className="flex justify-between gap-3">
                <span>{name}</span>
                <span className="shrink-0 tabular-nums text-hint">{quantity} ta</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="text-xs text-hint">Summa va o&apos;rtacha chekka yetkazish narxi kiradi, chegirma va bekor qilingan buyurtmalar kirmaydi.</p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-section p-4">
      <dt className="text-xs text-hint">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function OrderCard({ order }: { order: AdminOrder }) {
  const hasLocation = order.latitude !== null && order.longitude !== null;
  return (
    <article className="flex flex-col gap-2 rounded-2xl bg-section p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold">
          №{order.id} <span className="font-normal text-hint">· {formatTime(order.createdAt)}</span>
        </h2>
        <span className="font-medium">{STATUS_LABELS[order.status]}</span>
      </div>
      <p>
        {order.type === "delivery" ? "🚗 Yetkazib berish" : "🏃 Olib ketish"} · {order.customerName}
        {order.username && <span className="text-hint"> (@{order.username})</span>} ·{" "}
        <a href={`tel:${order.phone.replace(/[^\d+]/g, "")}`} className="underline">
          {order.phone}
        </a>
      </p>
      {order.address && <p className="text-hint">{order.address}</p>}
      {hasLocation && (
        <a
          href={`https://maps.google.com/?q=${order.latitude},${order.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          📍 Xaritada ochish
        </a>
      )}
      {order.comment && <p>💬 {order.comment}</p>}
      {order.cutleryCount > 0 && <p>🍴 Vilka-qoshiq: {order.cutleryCount} ta</p>}
      <ul className="flex flex-col gap-1 border-t border-secondary pt-2">
        {order.items.map((item) => (
          <li key={item.productName} className="flex justify-between gap-3">
            <span>
              {item.productName} × {item.quantity}
            </span>
            <span className="shrink-0 text-hint">{formatPrice(item.unitPrice * item.quantity)}</span>
          </li>
        ))}
      </ul>
      {order.discountAmount > 0 && (
        <div className="flex justify-between gap-3 border-t border-secondary pt-2">
          <span>Chegirma ({order.promoCode})</span>
          <span className="shrink-0 text-hint">−{formatPrice(order.discountAmount)}</span>
        </div>
      )}
      {order.deliveryFee > 0 && (
        <div className="flex justify-between gap-3 border-t border-secondary pt-2">
          <span>Yetkazib berish</span>
          <span className="shrink-0 text-hint">{formatPrice(order.deliveryFee)}</span>
        </div>
      )}
      <div className="flex justify-between gap-3 border-t border-secondary pt-2 font-semibold">
        <span>
          Jami <span className="font-normal text-hint">· {PAYMENT_LABELS[order.paymentMethod]}</span>
        </span>
        <span>{formatPrice(order.totalAmount)}</span>
      </div>
    </article>
  );
}
