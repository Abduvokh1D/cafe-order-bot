import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/admin/login-form";
import { getCurrentAdmin } from "@/lib/admin-session";

export const metadata: Metadata = {
  title: "Kirish — admin panel",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-secondary p-4">
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-section p-6">
        <h1 className="text-xl font-semibold">Admin panelga kirish</h1>
        <LoginForm />
        <Suspense fallback={null}>
          <RedirectIfSignedIn />
        </Suspense>
      </div>
    </main>
  );
}

async function RedirectIfSignedIn() {
  if (await getCurrentAdmin()) redirect("/admin");
  return null;
}
