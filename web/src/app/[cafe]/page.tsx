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
    <div className="flex flex-1 flex-col gap-4 bg-background p-4" aria-label="Menyu yuklanmoqda">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-secondary" />
      <div className="h-11 animate-pulse rounded-full bg-secondary" />
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="aspect-square animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    </div>
  );
}
