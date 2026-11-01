"use client";

import type { AdminRole } from "@cafe/db";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasPermission, type Permission } from "@/lib/permissions";

const LINKS: { href: string; label: string; permission?: Permission }[] = [
  { href: "/admin", label: "Buyurtmalar" },
  { href: "/admin/menu", label: "Menyu" },
  { href: "/admin/stats", label: "Statistika", permission: "stats" },
  { href: "/admin/customers", label: "Mijozlar", permission: "customers" },
  { href: "/admin/promos", label: "Promokodlar", permission: "promos" },
  { href: "/admin/staff", label: "Xodimlar", permission: "staff" },
  { href: "/admin/settings", label: "Sozlamalar", permission: "settings" },
];

export function AdminNav({ role }: { role: AdminRole }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin bo'limlari" className="-mx-4 flex gap-4 overflow-x-auto px-4 font-medium [scrollbar-width:none]">
      {LINKS.filter((link) => !link.permission || hasPermission(role, link.permission)).map((link) => {
        const isCurrent = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isCurrent ? "page" : undefined}
            className={`shrink-0 border-b-2 pb-1 ${isCurrent ? "border-foreground" : "border-transparent text-hint"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
