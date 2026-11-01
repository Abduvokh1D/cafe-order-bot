import { getAdminSettings, type AdminBanner } from "@cafe/db";
import Image from "next/image";
import { Suspense } from "react";
import {
  createBannerAction,
  deleteBannerAction,
  setBannerActiveAction,
  setDeliveryPriceAction,
  setDeliveryTimeAction,
} from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { ProductImageInput } from "@/components/admin/product-image-input";
import { requireAdmin } from "@/lib/admin-session";

const inputClass = "w-full rounded-xl bg-secondary px-3 py-2 text-base font-normal outline-none";
const primaryButton = "rounded-xl bg-button px-4 py-2 text-sm font-medium text-button-text disabled:opacity-50";
const secondaryButton = "rounded-xl bg-secondary px-3 py-2 text-sm font-medium disabled:opacity-50";

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-hint">Yuklanmoqda...</p>}>
      <SettingsEditor />
    </Suspense>
  );
}

async function SettingsEditor() {
  const admin = await requireAdmin();
  const settings = await getAdminSettings(admin.cafeId);

  return (
    <>
      <h1 className="text-lg font-semibold">Sozlamalar</h1>

      <section aria-label="Chegirma rasmlari" className="flex flex-col gap-3 rounded-2xl bg-section p-4">
        <div>
          <h2 className="font-semibold">Chegirma rasmlari</h2>
          <p className="text-sm text-hint">
            Menyuda qidiruv ostida ko&apos;rinadi. Chegirma tugaganda rasmni o&apos;chirib qo&apos;ying: joy o&apos;zi
            yo&apos;qoladi.
          </p>
        </div>

        {settings.banners.length > 0 && (
          <ul className="flex flex-col gap-3">
            {settings.banners.map((banner) => (
              <li key={banner.id}>
                <BannerRow banner={banner} />
              </li>
            ))}
          </ul>
        )}

        <details className="rounded-xl border border-secondary p-3">
          <summary className="cursor-pointer text-sm font-medium">+ Rasm qo&apos;shish</summary>
          <AdminForm action={createBannerAction} resetOnSuccess showSaved className="flex flex-col gap-3 pt-3">
            <ProductImageInput currentUrl={null} />
            <p className="text-sm text-hint">Eni bo&apos;yidan 2 baravar katta rasm yaxshi ko&apos;rinadi, masalan: 1200×600.</p>
            <button type="submit" className={`${primaryButton} self-start`}>
              Qo&apos;shish
            </button>
          </AdminForm>
        </details>
      </section>

      <section aria-label="Yetkazib berish narxi" className="flex flex-col gap-3 rounded-2xl bg-section p-4">
        <div>
          <h2 className="font-semibold">Yetkazib berish narxi</h2>
          <p className="text-sm text-hint">
            Buyurtma summasiga qo&apos;shiladi. 0 yozsangiz, bepul deb ko&apos;rsatiladi. Bo&apos;sh qoldirsangiz, mijozga
            narx ko&apos;rsatilmaydi. Olib ketishda narx qo&apos;shilmaydi.
          </p>
        </div>
        <AdminForm action={setDeliveryPriceAction} showSaved className="grid grid-cols-2 items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Narxi (so&apos;m)
            <input
              name="deliveryFee"
              inputMode="numeric"
              defaultValue={settings.deliveryFee ?? ""}
              placeholder="10000"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Bepul: shu summadan
            <input
              name="freeDeliveryFrom"
              inputMode="numeric"
              defaultValue={settings.freeDeliveryFrom ?? ""}
              placeholder="100000"
              className={inputClass}
            />
          </label>
          <button type="submit" className={`${primaryButton} col-span-2 justify-self-start`}>
            Saqlash
          </button>
        </AdminForm>
      </section>

      <section aria-label="Yetkazib berish vaqti" className="flex flex-col gap-3 rounded-2xl bg-section p-4">
        <div>
          <h2 className="font-semibold">Yetkazib berish vaqti</h2>
          <p className="text-sm text-hint">Menyuda taxminiy vaqt sifatida ko&apos;rinadi. Bo&apos;sh qoldirsangiz, ko&apos;rsatilmaydi.</p>
        </div>
        <AdminForm action={setDeliveryTimeAction} showSaved className="flex flex-wrap items-end gap-3">
          <label className="flex w-24 flex-col gap-1 text-sm font-medium">
            Kamida
            <input
              name="minMinutes"
              inputMode="numeric"
              defaultValue={settings.deliveryMinMinutes ?? ""}
              placeholder="30"
              className={inputClass}
            />
          </label>
          <label className="flex w-24 flex-col gap-1 text-sm font-medium">
            Ko&apos;pi bilan
            <input
              name="maxMinutes"
              inputMode="numeric"
              defaultValue={settings.deliveryMaxMinutes ?? ""}
              placeholder="40"
              className={inputClass}
            />
          </label>
          <span className="pb-2 text-sm text-hint">daqiqa</span>
          <button type="submit" className={primaryButton}>
            Saqlash
          </button>
        </AdminForm>
      </section>
    </>
  );
}

function BannerRow({ banner }: { banner: AdminBanner }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[2/1] overflow-hidden rounded-xl bg-secondary">
        <Image
          src={banner.imageUrl}
          alt="Chegirma rasmi"
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 720px"
          className={`object-cover ${banner.isActive ? "" : "opacity-40 grayscale"}`}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AdminForm action={setBannerActiveAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={banner.id} />
          <input type="hidden" name="isActive" value={String(!banner.isActive)} />
          <button
            type="submit"
            className={banner.isActive ? primaryButton : secondaryButton}
            aria-label={banner.isActive ? "Menyuda ko'rinyapti: yashirish" : "Yashirilgan: menyuda ko'rsatish"}
          >
            {banner.isActive ? "Menyuda ko'rinyapti" : "Yashirilgan"}
          </button>
        </AdminForm>
        <AdminForm
          action={deleteBannerAction}
          confirmMessage="Bu rasm butunlay o'chirilsinmi?"
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="id" value={banner.id} />
          <button type="submit" className={`${secondaryButton} text-destructive`}>
            O&apos;chirish
          </button>
        </AdminForm>
      </div>
    </div>
  );
}
