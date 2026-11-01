"use client";

import type { CafeMenu, MenuCategory, MenuProduct } from "@cafe/db";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CartScreen, type OrderExtras } from "@/components/cart-screen";
import { FreeDeliveryBar, hasFreeDeliveryGoal } from "@/components/free-delivery-bar";
import { CartIcon, CloseIcon, MenuIcon, OrdersIcon, SearchIcon } from "@/components/menu-icons";
import { MyOrders } from "@/components/my-orders";
import { ProductCard } from "@/components/product-card";
import { clearCart, setQuantity, useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

type Tab = "menu" | "orders";

// Bo'lim sarlavhasi kategoriya tugmalari ostida to'xtaydi (scroll-mt-14 = 56px)
const TABS_OFFSET_PX = 57;
const SUGGESTIONS_LIMIT = 6;
const NO_EXTRAS: OrderExtras = { comment: "", cutleryCount: 0, promo: null };

// "Lag'mon", "lagʻmon" va "lagmon" bir xil topilishi uchun tutuq belgilari olib tashlanadi
function normalize(text: string) {
  return text.toLowerCase().replace(/['`ʻʼ‘’]/g, "").trim();
}

export function MenuView({ menu, closedNotice }: { menu: CafeMenu; closedNotice: string | null }) {
  const { slug } = menu.cafe;
  const router = useRouter();
  const cart = useCart(slug);
  const [tab, setTab] = useState<Tab>("menu");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [search, setSearch] = useState("");
  // Menyuga qaytib taom qo'shganda ham yozilgan izoh yo'qolmaydi
  const [extras, setExtras] = useState(NO_EXTRAS);
  const [trackedOrderId, setTrackedOrderId] = useState<number | null>(null);

  // Kafe narxni yoki "tugadi" belgisini o'zgartirgan bo'lsa, ochiq turgan oyna ham yangisini ko'rsin
  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => document.removeEventListener("visibilitychange", refreshIfVisible);
  }, [router]);

  useEffect(() => {
    if (isCartOpen) router.refresh();
  }, [isCartOpen, router]);

  // Tugagan yoki menyudan olib tashlangan taomlar savat summasiga kirmaydi
  const products = menu.categories.flatMap((category) => category.products);
  const lines = products
    .filter((product) => product.isAvailable && cart[product.id] > 0)
    .map((product) => ({ product, quantity: cart[product.id] }));
  const soldOutNames = products
    .filter((product) => !product.isAvailable && cart[product.id] > 0)
    .map((product) => product.name);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);

  // Savatda yo'q taomlar, rasmlilari oldinda
  const suggestions = products
    .filter((product) => product.isAvailable && !cart[product.id])
    .sort((a, b) => Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)))
    .slice(0, SUGGESTIONS_LIMIT);

  const { deliveryMinMinutes: minMinutes, deliveryMaxMinutes: maxMinutes } = menu.cafe;
  const deliveryTime = minMinutes && maxMinutes ? `${minMinutes}–${maxMinutes} daqiqa` : null;

  const query = normalize(search);
  const results = query
    ? products.filter((product) => normalize(`${product.name} ${product.description ?? ""}`).includes(query))
    : [];

  function showTab(next: Tab) {
    setTab(next);
    setIsCartOpen(false);
    window.scrollTo({ top: 0 });
  }

  const renderProducts = (items: MenuProduct[]) => (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
      {items.map((product) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            quantity={cart[product.id] ?? 0}
            onChange={(quantity) => setQuantity(slug, product.id, quantity)}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <div
      className={`flex flex-1 flex-col bg-background ${
        count > 0 && tab === "menu" ? (hasFreeDeliveryGoal(menu.cafe) ? "pb-48" : "pb-36") : "pb-20"
      }`}
    >
      {tab === "orders" ? (
        <MyOrders
          slug={slug}
          cafePhone={menu.cafe.phone}
          cafeAddress={menu.cafe.address}
          deliveryMinMinutes={minMinutes}
          deliveryMaxMinutes={maxMinutes}
          initialOrderId={trackedOrderId}
        />
      ) : (
        <>
          <header className="flex flex-col gap-3 px-4 pt-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{menu.cafe.name}</h1>
              {(menu.cafe.address || menu.cafe.phone) && (
                <p className="flex flex-wrap gap-x-3 pt-0.5 text-sm text-hint">
                  {menu.cafe.address && <span>📍 {menu.cafe.address}</span>}
                  {menu.cafe.phone && (
                    <a href={`tel:${menu.cafe.phone.replace(/[^\d+]/g, "")}`} className="underline">
                      📞 {menu.cafe.phone}
                    </a>
                  )}
                </p>
              )}
            </div>
            {closedNotice && (
              <p role="status" className="rounded-2xl bg-secondary px-4 py-3 text-sm font-medium">
                🔒 {closedNotice}
              </p>
            )}
            <SearchBox value={search} onChange={setSearch} />
          </header>

          {query ? (
            <section aria-label="Qidiruv natijalari" className="px-4 pt-5">
              {results.length > 0 ? (
                renderProducts(results)
              ) : (
                <p className="py-10 text-center text-hint">&quot;{search.trim()}&quot; bo&apos;yicha hech narsa topilmadi.</p>
              )}
            </section>
          ) : (
            <>
              <Banners banners={menu.banners} />
              <CategoryTiles categories={menu.categories} />
              <InfoChips deliveryTime={deliveryTime} deliveryFee={menu.cafe.deliveryFee} />

              {menu.categories.length === 0 ? (
                <p className="p-8 text-center text-hint">Menyu hali tayyor emas.</p>
              ) : (
                <CategoryTabs categories={menu.categories} />
              )}

              {menu.categories.map((category, index) => (
                <section
                  key={category.id}
                  id={`category-${category.id}`}
                  // Oxirgi bo'lim kalta bo'lsa ham, unga o'tganda sarlavhasi tepaga chiqishi uchun
                  className={`scroll-mt-14 px-4 pt-5 ${index === menu.categories.length - 1 ? "min-h-[calc(100dvh-3.5rem)]" : ""}`}
                >
                  <h2 className="pb-3 text-xl font-bold tracking-tight">{category.name}</h2>
                  {renderProducts(category.products)}
                </section>
              ))}
            </>
          )}
        </>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20">
        {count > 0 && tab === "menu" && (
          <div className="flex justify-end px-3 pb-2">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Savat: ${count} ta, ${formatPrice(total)}`}
              className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-button px-6 py-3.5 text-lg font-bold text-button-text shadow-lg"
            >
              {formatPrice(total)}
              <CartIcon className="size-6" />
            </button>
          </div>
        )}
        {count > 0 && tab === "menu" && hasFreeDeliveryGoal(menu.cafe) && (
          <div className="border-t border-secondary bg-background px-4 py-2">
            <FreeDeliveryBar itemsTotal={total} pricing={menu.cafe} />
          </div>
        )}
        <nav
          aria-label="Asosiy bo'limlar"
          className="pointer-events-auto grid grid-cols-3 border-t border-secondary bg-background pb-[env(safe-area-inset-bottom)]"
        >
          <NavButton label="Menyu" isActive={tab === "menu"} onClick={() => showTab("menu")}>
            <MenuIcon />
          </NavButton>
          <NavButton label="Savat" isActive={false} onClick={() => setIsCartOpen(true)} badge={count}>
            <CartIcon />
          </NavButton>
          <NavButton
            label="Buyurtmalarim"
            isActive={tab === "orders"}
            onClick={() => {
              setTrackedOrderId(null);
              showTab("orders");
            }}
          >
            <OrdersIcon />
          </NavButton>
        </nav>
      </div>

      {isCartOpen && (
        <CartScreen
          slug={slug}
          cafeName={menu.cafe.name}
          deliveryTime={deliveryTime}
          cart={cart}
          lines={lines}
          total={total}
          pricing={menu.cafe}
          cafeAddress={menu.cafe.address}
          closedNotice={closedNotice}
          soldOutNames={soldOutNames}
          suggestions={suggestions}
          extras={extras}
          onExtrasChange={setExtras}
          onClose={() => {
            // Buyurtma yuborilgach savat bo'sh qoladi: izoh keyingi buyurtmaga o'tmasin
            if (lines.length === 0) setExtras(NO_EXTRAS);
            setIsCartOpen(false);
          }}
          onChange={(productId, quantity) => setQuantity(slug, productId, quantity)}
          onClear={() => {
            clearCart(slug);
            setExtras(NO_EXTRAS);
          }}
          onShowOrders={(orderId) => {
            setExtras(NO_EXTRAS);
            setTrackedOrderId(orderId);
            showTab("orders");
          }}
        />
      )}
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div role="search" className="flex items-center gap-2 rounded-full bg-secondary pl-4 pr-1 text-hint">
      <SearchIcon className="size-5 shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Taom qidirish"
        aria-label="Taom qidirish"
        enterKeyHint="search"
        className="h-11 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-hint [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Qidiruvni tozalash"
          className="flex size-9 shrink-0 items-center justify-center rounded-full"
        >
          <CloseIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

// Faol chegirma bo'lmasa, joy ham egallamaydi
function Banners({ banners }: { banners: CafeMenu["banners"] }) {
  if (banners.length === 0) return null;
  const isSingle = banners.length === 1;
  return (
    <section
      aria-label="Chegirmalar"
      className="flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-4 [scrollbar-width:none]"
    >
      {banners.map((banner, index) => (
        <div
          key={banner.id}
          className={`relative aspect-[2/1] shrink-0 snap-start overflow-hidden rounded-2xl bg-secondary ${isSingle ? "w-full" : "w-[88%]"}`}
        >
          <Image
            src={banner.imageUrl}
            alt="Chegirma"
            fill
            unoptimized
            loading={index === 0 ? "eager" : "lazy"}
            sizes="(max-width: 640px) 90vw, 560px"
            className="object-cover"
          />
        </div>
      ))}
    </section>
  );
}

function scrollToCategory(categoryId: number) {
  document.getElementById(`category-${categoryId}`)?.scrollIntoView({ behavior: "smooth" });
}

// Tur rasmi alohida yuklanmaydi: birinchi rasmli taomdan olinadi
function CategoryTiles({ categories }: { categories: MenuCategory[] }) {
  if (categories.length === 0) return null;
  return (
    <nav
      aria-label="Taom turlari"
      className="flex gap-3 overflow-x-auto px-4 pt-5 [scrollbar-width:none]"
    >
      {categories.map((category) => {
        const imageUrl = category.products.find((product) => product.imageUrl)?.imageUrl;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => scrollToCategory(category.id)}
            className="flex w-20 shrink-0 flex-col items-center gap-1.5"
          >
            <span className="relative flex size-20 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-3xl">
              {imageUrl ? (
                <Image src={imageUrl} alt="" fill unoptimized sizes="80px" className="object-cover" />
              ) : (
                <span aria-hidden>🍽</span>
              )}
            </span>
            <span className="line-clamp-2 text-center text-xs font-medium leading-tight">{category.name}</span>
          </button>
        );
      })}
    </nav>
  );
}

function InfoChips({ deliveryTime, deliveryFee }: { deliveryTime: string | null; deliveryFee: number | null }) {
  const chipClass = "shrink-0 rounded-full bg-secondary px-3.5 py-2 text-sm font-medium";
  return (
    <ul aria-label="Yetkazib berish" className="flex gap-2 overflow-x-auto px-4 pt-5 [scrollbar-width:none]">
      {(deliveryTime || deliveryFee === null) && <li className={chipClass}>🚗 {deliveryTime ?? "Yetkazib berish"}</li>}
      {deliveryFee !== null && (
        <li className={chipClass}>🛵 {deliveryFee > 0 ? `Yetkazish ${formatPrice(deliveryFee)}` : "Yetkazish bepul"}</li>
      )}
      <li className={chipClass}>🏃 Olib ketish</li>
    </ul>
  );
}

function CategoryTabs({ categories }: { categories: MenuCategory[] }) {
  const [activeId, setActiveId] = useState(categories[0]?.id);
  const navRef = useRef<HTMLElement>(null);

  // Sahifa aylantirilganda tugmalar ostiga yetib kelgan oxirgi kategoriya belgilanadi
  useEffect(() => {
    const update = () => {
      const reached = categories.filter((category) => {
        const section = document.getElementById(`category-${category.id}`);
        return section && section.getBoundingClientRect().top <= TABS_OFFSET_PX;
      });
      setActiveId((reached.at(-1) ?? categories[0])?.id);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [categories]);

  // Faol tugma ko'rinib turishi uchun. scrollIntoView emas: u sahifa aylanishini ham buzadi
  const keepVisible = useCallback((button: HTMLButtonElement | null) => {
    const nav = navRef.current;
    if (!button || !nav) return;
    nav.scrollTo({ left: button.offsetLeft - (nav.clientWidth - button.offsetWidth) / 2, behavior: "smooth" });
  }, []);

  return (
    <nav
      ref={navRef}
      aria-label="Kategoriyalar"
      className="sticky top-0 z-10 mt-4 flex gap-5 overflow-x-auto border-b border-secondary bg-background px-4 [scrollbar-width:none]"
    >
      {categories.map((category) => {
        const isActive = category.id === activeId;
        return (
          <button
            key={category.id}
            ref={isActive ? keepVisible : undefined}
            type="button"
            aria-current={isActive ? "true" : undefined}
            onClick={() => scrollToCategory(category.id)}
            className={`shrink-0 border-b-2 py-3 text-base font-medium ${
              isActive ? "border-foreground text-foreground" : "border-transparent text-hint"
            }`}
          >
            {category.name}
          </button>
        );
      })}
    </nav>
  );
}

function NavButton({
  label,
  isActive,
  onClick,
  badge = 0,
  children,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-w-0 flex-col items-center gap-0.5 py-2 text-xs font-medium ${isActive ? "text-foreground" : "text-hint"}`}
    >
      <span className="relative">
        {children}
        {badge > 0 && (
          <span className="absolute -right-2.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-button px-1 text-[11px] font-semibold tabular-nums text-button-text">
            {badge}
          </span>
        )}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
