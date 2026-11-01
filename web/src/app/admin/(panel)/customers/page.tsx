import { listCustomers, type AdminCustomer } from "@cafe/db";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-session";
import { formatDateTime } from "@/lib/day";
import { formatPrice } from "@/lib/format";

type Params = { q?: string; sort?: string; page?: string };

export default function CustomersPage({ searchParams }: { searchParams: Promise<Params> }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-hint">Yuklanmoqda...</p>}>
      <Customers searchParams={searchParams} />
    </Suspense>
  );
}

function pageHref(query: string, sort: string, page: number) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (sort !== "recent") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const text = params.toString();
  return text ? `/admin/customers?${text}` : "/admin/customers";
}

async function Customers({ searchParams }: { searchParams: Promise<Params> }) {
  const admin = await requireAdmin("customers");
  const { q, sort: sortParam, page: pageParam } = await searchParams;
  const query = (typeof q === "string" ? q : "").slice(0, 100);
  const sort = sortParam === "spent" ? "spent" : "recent";
  const page = Math.max(1, Math.min(10_000, Number.parseInt(String(pageParam), 10) || 1));
  const { customers, hasMore } = await listCustomers(admin.cafeId, { query, sort, page });

  const tabClass = (isActive: boolean) =>
    `shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${isActive ? "bg-button text-button-text" : "bg-section"}`;

  return (
    <>
      <h1 className="text-lg font-semibold">Mijozlar</h1>

      <form action="/admin/customers" className="flex gap-2">
        {sort !== "recent" && <input type="hidden" name="sort" value={sort} />}
        <input
          type="search"
          name="q"
          defaultValue={query}
          aria-label="Mijoz qidirish"
          placeholder="Ism, telefon yoki username"
          className="min-w-0 flex-1 rounded-xl bg-section px-3 py-2 text-base outline-none"
        />
        <button type="submit" className="shrink-0 rounded-xl bg-section px-4 py-2 text-sm font-medium">
          Qidirish
        </button>
      </form>

      <nav aria-label="Saralash" className="flex gap-2">
        <Link href={pageHref(query, "recent", 1)} className={tabClass(sort === "recent")}>
          Oxirgi buyurtma
        </Link>
        <Link href={pageHref(query, "spent", 1)} className={tabClass(sort === "spent")}>
          Eng ko&apos;p xarid
        </Link>
      </nav>

      {customers.length === 0 ? (
        <p className="rounded-2xl bg-section p-8 text-center text-hint">
          {query ? "Bunday mijoz topilmadi." : "Hali mijoz yo'q."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {customers.map((customer) => (
            <li key={customer.id}>
              <CustomerRow customer={customer} />
            </li>
          ))}
        </ul>
      )}

      {(page > 1 || hasMore) && (
        <nav aria-label="Sahifalar" className="flex justify-between gap-3">
          {page > 1 ? (
            <Link href={pageHref(query, sort, page - 1)} className="rounded-lg bg-section px-3 py-2 text-sm font-medium">
              ← Oldingi
            </Link>
          ) : (
            <span />
          )}
          {hasMore && (
            <Link href={pageHref(query, sort, page + 1)} className="rounded-lg bg-section px-3 py-2 text-sm font-medium">
              Keyingi →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}

function CustomerRow({ customer }: { customer: AdminCustomer }) {
  return (
    <Link href={`/admin/customers/${customer.id}`} className="flex flex-col gap-1 rounded-2xl bg-section p-4 text-sm">
      <span className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate font-semibold">
          {customer.name}
          {customer.username && <span className="font-normal text-hint"> @{customer.username}</span>}
        </span>
        <span className="shrink-0 font-semibold">{formatPrice(customer.spent)}</span>
      </span>
      <span className="flex items-baseline justify-between gap-3 text-hint">
        <span className="min-w-0 truncate">
          {customer.phone ?? "Telefon yo'q"} · {customer.orders} ta buyurtma
        </span>
        {customer.lastOrderAt && <span className="shrink-0 tabular-nums">{formatDateTime(customer.lastOrderAt)}</span>}
      </span>
    </Link>
  );
}
