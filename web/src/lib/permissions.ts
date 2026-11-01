import type { AdminRole } from "@cafe/db";

// Xodim (staff) uchun alohida ruxsat kerak emas: buyurtmalar, "tugadi" belgisi va o'z paroli hammaga ochiq
export type Permission = "menu" | "settings" | "reports" | "customers" | "promos" | "stats" | "staff";

const MANAGER: Permission[] = ["menu", "settings", "reports", "customers", "promos", "stats"];

const PERMISSIONS: Record<AdminRole, Permission[]> = {
  owner: [...MANAGER, "staff"],
  manager: MANAGER,
  staff: [],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Egasi",
  manager: "Menejer",
  staff: "Xodim",
};

export const ROLE_HINTS: Record<AdminRole, string> = {
  owner: "Hamma narsa, xodimlarni boshqarish ham",
  manager: "Xodimlardan boshqa hamma narsa",
  staff: "Buyurtmalar va \"tugadi\" belgisi",
};

export function hasPermission(role: AdminRole, permission: Permission) {
  return PERMISSIONS[role].includes(permission);
}
