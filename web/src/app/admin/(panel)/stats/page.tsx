import { getCafeStats, type CafeStats } from "@cafe/db";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { BarChart } from "@/components/admin/bar-chart";
import { requireAdmin } from "@/lib/admin-session";
import { formatDay, shiftDay, TIME_ZONE, today } from "@/lib/day";
import { formatCompact, formatPrice } from "@/lib/format";

const PERIODS = [7, 30, 90];
const DEFAULT_PERIOD = 30;

export default function StatsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-hint">Yuklanmoqda...</p>}>
      <Stats searchParams={searchParams} />
    </Suspense>
  );
}

async function Stats({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const admin = await requireAdmin("stats");
  const { days: daysParam } = await searchParams;
  const parsed = Number(daysParam);
  const days = PERIODS.includes(parsed) ? parsed : DEFAULT_PERIOD;

  // "Bugun" so'rov paytida hisoblanadi, oldindan render qilinmaydi
  await connection();
  const toDay = today();
  const stats = await getCafeStats(admin.cafeId, shiftDay(toDay, -(days - 1)), toDay, TIME_ZONE);
  const { totals, byDay, byHour, topProducts } = stats;
  const hasData = totals.orders + totals.cancelled > 0;

  return (
    <>
      <h1 className="text-lg font-semibold">Statistika</h1>

      <nav aria-label="Davr" className="flex gap-2">
        {PERIODS.map((period) => (
          <Link
            key={period}
            href={`/admin/stats?days=${period}`}
            aria-current={period === days ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${period === days ? "bg-button text-button-text" : "bg-section"}`}
          >
            {period} kun
          </Link>
        ))}
      </nav>

      {!hasData ? (
        <p className="rounded-2xl bg-section p-8 text-center text-hint">Bu davrda buyurtma yo&apos;q.</p>
      ) : (
        <>
          <Totals stats={stats} />

          <ChartCard title="Tushum, kunlar bo'yicha" hint={peakHint(byDay.map((row) => [formatDay(row.day), row.revenue]), formatPrice)}>
            <BarChart
              summary={`Kunlik tushum, ${days} kun. Aniq qiymatlar pastdagi jadvalda.`}
              axisLabels={[formatDay(byDay[0].day), formatDay(byDay[byDay.length - 1].day)]}
              bars={byDay.map((row) => ({
                key: row.day,
                label: formatDay(row.day),
                value: row.revenue,
                valueText: formatPrice(row.revenue),
              }))}
            />
            <DataTable
              headers={["Kun", "Buyurtma", "Tushum"]}
              rows={byDay.filter((row) => row.orders > 0).map((row) => [formatDay(row.day), row.orders, formatPrice(row.revenue)])}
            />
          </ChartCard>

          <ChartCard title="Buyurtmalar, soatlar bo'yicha" hint={peakHint(byHour.map((row) => [`${row.hour}:00`, row.orders]), (value) => `${value} ta`)}>
            <BarChart
              summary="Kun soatlari bo'yicha buyurtmalar soni. Aniq qiymatlar pastdagi jadvalda."
              axisLabels={["00:00", "12:00", "23:00"]}
              bars={byHour.map((row) => ({
                key: String(row.hour),
                label: `${String(row.hour).padStart(2, "0")}:00`,
                value: row.orders,
                valueText: `${row.orders} ta`,
              }))}
            />
            <DataTable
              headers={["Soat", "Buyurtma"]}
              rows={byHour.filter((row) => row.orders > 0).map((row) => [`${String(row.hour).padStart(2, "0")}:00`, row.orders])}
            />
          </ChartCard>

          {topProducts.length > 0 && <TopProducts products={topProducts} />}
        </>
      )}
    </>
  );
}

function peakHint(rows: [string, number][], format: (value: number) => string) {
  const peak = rows.reduce((best, row) => (row[1] > best[1] ? row : best), rows[0]);
  return peak[1] > 0 ? `Eng yuqori: ${peak[0]}, ${format(peak[1])}` : "";
}

function percent(part: number, whole: number) {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

function Totals({ stats: { totals } }: { stats: CafeStats }) {
  const placed = totals.orders + totals.cancelled;
  const average = totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0;
  return (
    <section aria-label="Umumiy ko'rsatkichlar" className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Tushum" value={formatPrice(totals.revenue)} />
        <Tile label="Buyurtmalar" value={String(totals.orders)} hint={`${totals.customers} ta mijoz`} />
        <Tile label="O'rtacha chek" value={formatPrice(average)} />
        <Tile label="Bekor qilingan" value={String(totals.cancelled)} hint={percent(totals.cancelled, placed)} />
        <Tile label="Naqd" value={formatPrice(totals.cash)} hint={percent(totals.cash, totals.revenue)} />
        <Tile label="Karta" value={formatPrice(totals.card)} hint={percent(totals.card, totals.revenue)} />
        <Tile label="Yetkazish puli" value={formatPrice(totals.delivery)} hint={`${totals.deliveryOrders} ta yetkazish, ${totals.pickupOrders} ta olib ketish`} />
        <Tile label="Chegirmalar" value={formatPrice(totals.discount)} />
      </dl>
      <p className="text-xs text-hint">
        Tushumga yetkazish puli kiradi, berilgan chegirma va bekor qilingan buyurtmalar kirmaydi. Buyurtma pulini kafe
        olgan deb hisoblanadi.
      </p>
    </section>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-section p-4">
      <dt className="text-xs text-hint">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
      {hint && <dd className="text-xs text-hint">{hint}</dd>}
    </div>
  );
}

function ChartCard({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-2xl bg-section p-4">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {hint && <p className="text-sm text-hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-hint">Jadval ko&apos;rinishi</summary>
      <table className="mt-2 w-full text-left tabular-nums">
        <thead>
          <tr className="text-xs text-hint">
            {headers.map((header, index) => (
              <th key={header} scope="col" className={`py-1 font-medium ${index > 0 ? "text-right" : ""}`}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={String(row[0])} className="border-t border-secondary">
              {row.map((cell, index) => (
                <td key={index} className={`py-1 ${index > 0 ? "text-right" : ""}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

function TopProducts({ products }: { products: CafeStats["topProducts"] }) {
  const max = products[0].quantity;
  return (
    <ChartCard title="Eng ko'p sotilgan taomlar" hint="Son bo'yicha">
      <ol className="flex flex-col gap-3 text-sm">
        {products.map((product) => (
          <li key={product.name} className="flex flex-col gap-1" title={`${product.name}: ${product.quantity} ta, ${formatPrice(product.revenue)}`}>
            <span className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{product.name}</span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold">{product.quantity} ta</span>
                <span className="text-hint"> · {formatCompact(product.revenue)} so&apos;m</span>
              </span>
            </span>
            <span aria-hidden className="block h-2 rounded-r bg-chart" style={{ width: `${(product.quantity / max) * 100}%` }} />
          </li>
        ))}
      </ol>
    </ChartCard>
  );
}
