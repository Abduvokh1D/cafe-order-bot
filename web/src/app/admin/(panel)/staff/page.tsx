import { listStaff, MIN_PASSWORD_LENGTH, type AdminRole, type StaffMember } from "@cafe/db";
import { Suspense } from "react";
import {
  createStaffAction,
  resetStaffPasswordAction,
  setStaffActiveAction,
  setStaffRoleAction,
} from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { requireAdmin } from "@/lib/admin-session";
import { ROLE_HINTS, ROLE_LABELS } from "@/lib/permissions";

const ROLES: AdminRole[] = ["staff", "manager", "owner"];
const inputClass = "w-full rounded-xl bg-secondary px-3 py-2 text-base font-normal outline-none";
const primaryButton = "rounded-xl bg-button px-4 py-2 text-sm font-medium text-button-text disabled:opacity-50";
const secondaryButton = "rounded-xl bg-secondary px-3 py-2 text-sm font-medium disabled:opacity-50";

export default function StaffPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-hint">Yuklanmoqda...</p>}>
      <Staff />
    </Suspense>
  );
}

async function Staff() {
  const admin = await requireAdmin("staff");
  const members = await listStaff(admin.cafeId);
  return (
    <>
      <h1 className="text-lg font-semibold">Xodimlar</h1>

      <ul className="flex flex-col gap-3">
        {members.map((member) => (
          <li key={member.id}>
            <MemberCard member={member} isSelf={member.id === admin.adminId} />
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3 rounded-2xl bg-section p-4">
        <div>
          <h2 className="font-semibold">Yangi xodim</h2>
          <p className="text-sm text-hint">
            Login va vaqtinchalik parolni xodimga ayting. U kirgach, parolni &quot;Hisobim&quot; bo&apos;limida almashtiradi.
          </p>
        </div>
        <AdminForm action={createStaffAction} resetOnSuccess showSaved className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Login
            <input name="login" required maxLength={60} autoCapitalize="none" autoComplete="off" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Vaqtinchalik parol (kamida {MIN_PASSWORD_LENGTH} belgi)
            <input name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className={inputClass} />
          </label>
          <RoleSelect defaultValue="staff" />
          <button type="submit" className={`${primaryButton} self-start`}>
            Qo&apos;shish
          </button>
        </AdminForm>
      </section>
    </>
  );
}

function RoleSelect({ defaultValue }: { defaultValue: AdminRole }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      Rol
      <select name="role" defaultValue={defaultValue} className={inputClass}>
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}: {ROLE_HINTS[role]}
          </option>
        ))}
      </select>
    </label>
  );
}

function MemberCard({ member, isSelf }: { member: StaffMember; isSelf: boolean }) {
  return (
    <article className={`flex flex-col gap-3 rounded-2xl bg-section p-4 ${member.isActive ? "" : "opacity-70"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="font-semibold">
          {member.login}
          {isSelf && <span className="font-normal text-hint"> · siz</span>}
        </h2>
        <span className="text-sm text-hint">
          {ROLE_LABELS[member.role]}
          {!member.isActive && " · o'chirilgan"}
        </span>
      </div>

      {/* O'zini o'chirib yoki rolini tushirib, kafeni egasiz qoldirib bo'lmaydi */}
      {!isSelf && (
        <details>
          <summary className="cursor-pointer text-sm text-hint">Boshqarish</summary>
          <div className="flex flex-col gap-3 pt-3">
            <AdminForm action={setStaffRoleAction} showSaved className="flex flex-col gap-2">
              <input type="hidden" name="id" value={member.id} />
              <RoleSelect defaultValue={member.role} />
              <button type="submit" className={`${secondaryButton} self-start`}>
                Rolni saqlash
              </button>
            </AdminForm>
            <AdminForm action={resetStaffPasswordAction} resetOnSuccess showSaved className="flex flex-col gap-2">
              <input type="hidden" name="id" value={member.id} />
              <label className="flex flex-col gap-1 text-sm font-medium">
                Yangi parol
                <input name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className={inputClass} />
              </label>
              <button type="submit" className={`${secondaryButton} self-start`}>
                Parolni almashtirish
              </button>
            </AdminForm>
            <AdminForm
              action={setStaffActiveAction}
              confirmMessage={member.isActive ? `"${member.login}" panelga kira olmay qolsinmi?` : undefined}
              className="flex flex-col gap-1"
            >
              <input type="hidden" name="id" value={member.id} />
              <input type="hidden" name="isActive" value={String(!member.isActive)} />
              <button type="submit" className={`${secondaryButton} self-start ${member.isActive ? "text-destructive" : ""}`}>
                {member.isActive ? "Kirishni o'chirish" : "Kirishni yoqish"}
              </button>
            </AdminForm>
          </div>
        </details>
      )}
    </article>
  );
}
