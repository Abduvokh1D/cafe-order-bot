import { getCafeMenu } from "@cafe/db";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MenuView } from "@/components/menu-view";

export default function CafePage({ params }: PageProps<"/[cafe]">) {
  return (
    <Suspense fallback={<MenuSkeleton />}>
      <CafeMenuLoader params={params} />
    </Suspense>
  );
}

// Keshlanmaydi: "tugadi" belgisi va narxlar mijozga darhol yetib borishi kerak
async function CafeMenuLoader({ params }: { params: Promise<{ cafe: string }> }) {
  const { cafe } = await params;
  const menu = await getCafeMenu(cafe);
  if (!menu) notFound();
  return <MenuView menu={menu} />;
}

function MenuSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 bg-secondary p-4" aria-label="Menyu yuklanmoqda">
      <div className="h-7 w-40 animate-pulse rounded-lg bg-section" />
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="h-28 animate-pulse rounded-2xl bg-section" />
      ))}
    </div>
  );
}
