import { getAdminPromos, type AdminPromo } from "@cafe/db";
import { Suspense } from "react";
import { archivePromoAction, createPromoAction, setPromoActiveAction } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDay } from "@/lib/day";
import { formatPrice } from "@/lib/format";

const inputClass = "w-full rounded-xl bg-secondary px-3 py-2 text-base font-normal outline-none";
const labelClass = "flex flex-col gap-1 text-sm font-medium";
const secondaryButton = "rounded-xl bg-secondary px-3 py-2 text-sm font-medium disabled:opacity-50";

export default function PromosPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-hint">Yuklanmoqda...</p>}>
      <Promos />
    </Suspense>
  );
}

async function Promos() {
  const admin = await requireAdmin("promos");
  const promos = await getAdminPromos(admin.cafeId);
  return (
    <>
      <h1 className="text-lg font-semibold">Promokodlar</h1>

      {promos.length === 0 ? (
        <p className="rounded-2xl bg-section p-8 text-center text-hint">Hali promokod yo&apos;q.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {promos.map((promo) => (
            <li key={promo.id}>
              <PromoCard promo={promo} />
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-3 rounded-2xl bg-section p-4">
        <div>
          <h2 className="font-semibold">Yangi promokod</h2>
          <p className="text-sm text-hint">Chegirma faqat taomlarga qo&apos;llanadi, yetkazish narxiga emas.</p>
        </div>
        <AdminForm action={createPromoAction} resetOnSuccess showSaved className="flex flex-col gap-3">
          <label className={labelClass}>
            Kod (masalan, YOZ20)
            <input name="code" required maxLength={30} autoCapitalize="characters" autoComplete="off" className={`${inputClass} uppercase`} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Turi
              <select name="type" defaultValue="percent" className={inputClass}>
                <option value="percent">Foiz (%)</option>
                <option value="fixed">Summa (so&apos;m)</option>
              </select>
            </label>
            <label className={labelClass}>
              Qiymati
              <input name="value" required inputMode="numeric" placeholder="20" className={inputClass} />
            </label>
            <label className={labelClass}>
              Eng kam buyurtma (so&apos;m)
              <input name="minOrderAmount" inputMode="numeric" placeholder="0" className={inputClass} />
            </label>
            <label className={labelClass}>
              Jami necha marta
              <input name="maxUses" inputMode="numeric" placeholder="Cheklovsiz" className={inputClass} />
            </label>
            <label className={labelClass}>
              Amal qilish muddati
              <input name="expiresOn" type="date" className={inputClass} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isOncePerCustomer" defaultChecked />
            Har bir mijoz bir marta ishlatadi
          </label>
          <button type="submit" className="self-start rounded-xl bg-button px-4 py-2 text-sm font-medium text-button-text disabled:opacity-50">
            Yaratish
          </button>
        </AdminForm>
      </section>
    </>
  );
}

function PromoCard({ promo }: { promo: AdminPromo }) {
  const conditions = [
    promo.minOrderAmount > 0 && `${formatPrice(promo.minOrderAmount)}dan`,
    promo.isOncePerCustomer ? "mijozga 1 marta" : "qayta ishlatsa bo'ladi",
    promo.expiresOn && `${formatDay(promo.expiresOn)} gacha`,
  ].filter(Boolean);

  return (
    <article className={`flex flex-col gap-2 rounded-2xl bg-section p-4 text-sm ${promo.isActive ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-base font-bold tracking-wide">{promo.code}</h2>
        <span className="font-semibold">−{promo.type === "percent" ? `${promo.value}%` : formatPrice(promo.value)}</span>
      </div>
      <p className="text-hint">{conditions.join(" · ")}</p>
      <p>
        Ishlatildi: <span className="font-medium">{promo.uses}</span>
        {promo.maxUses !== null && ` / ${promo.maxUses}`} · Berilgan chegirma: {formatPrice(promo.discountTotal)}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <AdminForm action={setPromoActiveAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={promo.id} />
          <input type="hidden" name="isActive" value={String(!promo.isActive)} />
          <button type="submit" className={secondaryButton}>
            {promo.isActive ? "To'xtatish" : "Yoqish"}
          </button>
        </AdminForm>
        <AdminForm
          action={archivePromoAction}
          confirmMessage={`"${promo.code}" o'chirilsinmi? Eski buyurtmalarda u saqlanib qoladi.`}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="id" value={promo.id} />
          <button type="submit" className={`${secondaryButton} text-destructive`}>
            O&apos;chirish
          </button>
        </AdminForm>
      </div>
    </article>
  );
}
