import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { logoutAction } from "@/app/admin/actions";
import { getCurrentAdmin } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Admin panel",
  robots: { index: false },
};

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-secondary">
      <header className="sticky top-0 z-10 bg-section shadow-sm">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <nav aria-label="Admin bo'limlari" className="flex gap-4 font-medium">
            <Link href="/admin">Buyurtmalar</Link>
            <Link href="/admin/menu">Menyu</Link>
            <Link href="/admin/settings">Sozlamalar</Link>
          </nav>
          <Suspense fallback={null}>
            <AdminBadge />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4">{children}</main>
    </div>
  );
}

async function AdminBadge() {
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-hint">{admin.cafeName}</span>
      <form action={logoutAction}>
        <button type="submit" className="font-medium">
          Chiqish
        </button>
      </form>
    </div>
  );
}
