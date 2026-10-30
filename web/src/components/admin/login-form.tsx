"use client";

import { loginAction } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";

export function LoginForm() {
  const inputClass = "w-full rounded-xl bg-secondary px-4 py-3 text-base font-normal outline-none";
  return (
    <AdminForm action={loginAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Login
        <input
          name="login"
          required
          autoComplete="username"
          autoCapitalize="none"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Parol
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </label>
      <button type="submit" className="rounded-xl bg-button py-3 font-semibold text-button-text disabled:opacity-50">
        Kirish
      </button>
    </AdminForm>
  );
}
