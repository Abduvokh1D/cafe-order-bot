import { getCustomerDetail } from "@cafe/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-session";
import { formatDateTime } from "@/lib/day";
import { formatPrice } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/order-labels";

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-hint">Yuklanmoqda...</p>}>
      <Customer params={params} />
    </Suspense>
  );
}

async function Customer({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin("customers");
  const { id } = await params;
  const customerId = Number(id);
  // Kafe sessiyadan olinadi: boshqa kafe mijozining id'si bu yerda topilmaydi
  const detail = Number.isSafeInteger(customerId) && customerId > 0 ? await getCustomerDetail(admin.cafeId, customerId) : null;
  if (!detail) notFound();
  const { customer, orders } = detail;

  return (
    <>
      <Link href="/admin/customers" className="text-sm text-hint underline">
        ← Mijozlar
      </Link>
      <section className="flex flex-col gap-2 rounded-2xl bg-section p-4 text-sm">
        <h1 className="text-lg font-semibold">
          {customer.name}
          {customer.username && <span className="font-normal text-hint"> @{customer.username}</span>}
        </h1>
        {customer.phone && (
          <a href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`} className="self-start underline">
            {customer.phone}
          </a>
        )}
        <dl className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <dt className="text-xs text-hint">Buyurtmalar</dt>
            <dd className="text-lg font-semibold">{customer.orders}</dd>
          </div>
          <div>
            <dt className="text-xs text-hint">Jami xarid</dt>
            <dd className="text-lg font-semibold">{formatPrice(customer.spent)}</dd>
          </div>
        </dl>
      </section>

      <ul className="flex flex-col gap-2">
        {orders.map((order) => (
          <li key={order.id} className={`flex flex-col gap-1 rounded-2xl bg-section p-4 text-sm ${order.status === "cancelled" ? "opacity-70" : ""}`}>
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">
                №{order.id} <span className="font-normal text-hint">· {formatDateTime(order.createdAt)}</span>
              </span>
              <span className="shrink-0 font-semibold">{formatPrice(order.totalAmount)}</span>
            </span>
            <span>{STATUS_LABELS[order.status]}</span>
            <span className="text-hint">{order.items.map((item) => `${item.productName} × ${item.quantity}`).join(", ")}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
