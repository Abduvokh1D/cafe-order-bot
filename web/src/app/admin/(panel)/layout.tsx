import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { logoutAction } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { getCurrentAdmin } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Admin panel",
  robots: { index: false },
};

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-secondary">
      <header className="sticky top-0 z-10 bg-section shadow-sm">
        <div className="mx-auto flex min-h-20 w-full max-w-3xl flex-col gap-2 px-4 pt-3">
          <Suspense fallback={null}>
            <AdminHeader />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">{children}</main>
    </div>
  );
}

async function AdminHeader() {
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  return (
    <>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-semibold">{admin.cafeName}</span>
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/admin/account" className="max-w-32 truncate text-hint underline">
            {admin.login}
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="font-medium">
              Chiqish
            </button>
          </form>
        </div>
      </div>
      <AdminNav role={admin.role} />
    </>
  );
}
