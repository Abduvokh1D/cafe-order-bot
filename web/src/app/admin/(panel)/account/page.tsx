import { MIN_PASSWORD_LENGTH } from "@cafe/db";
import { Suspense } from "react";
import { changePasswordAction } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { requireAdmin } from "@/lib/admin-session";
import { ROLE_LABELS } from "@/lib/permissions";

const inputClass = "w-full rounded-xl bg-secondary px-3 py-2 text-base font-normal outline-none";

export default function AccountPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-hint">Yuklanmoqda...</p>}>
      <Account />
    </Suspense>
  );
}

async function Account() {
  const admin = await requireAdmin();
  return (
    <>
      <h1 className="text-lg font-semibold">Hisobim</h1>
      <section className="flex flex-col gap-3 rounded-2xl bg-section p-4">
        <p className="text-sm text-hint">
          Login: <span className="font-medium text-foreground">{admin.login}</span> · Rol:{" "}
          <span className="font-medium text-foreground">{ROLE_LABELS[admin.role]}</span>
        </p>
        <h2 className="font-semibold">Parolni almashtirish</h2>
        <AdminForm action={changePasswordAction} resetOnSuccess showSaved className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Joriy parol
            <input name="current" type="password" required autoComplete="current-password" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Yangi parol (kamida {MIN_PASSWORD_LENGTH} belgi)
            <input
              name="next"
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              className={inputClass}
            />
          </label>
          <button type="submit" className="self-start rounded-xl bg-button px-4 py-2 text-sm font-medium text-button-text disabled:opacity-50">
            Saqlash
          </button>
        </AdminForm>
      </section>
    </>
  );
}
