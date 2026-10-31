"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";
import { BackIcon, LocateIcon } from "@/components/menu-icons";
import { isLocationSupported, requestLocation, type Coordinates } from "@/lib/location";

// Kafe joylashuvi hali saqlanmaydi: mijoz lokatsiyasi kelmaguncha shahar markazi ko'rsatiladi
const DEFAULT_CENTER: [number, number] = [41.3111, 69.2797];
const DEFAULT_ZOOM = 12;
const PICK_ZOOM = 17;

export function LocationPicker({
  initial,
  onConfirm,
  onBack,
}: {
  initial: Coordinates | null;
  onConfirm: (location: Coordinates) => void;
  onBack: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  // Mijoz xaritani o'zi surgan bo'lsa, kechikib kelgan lokatsiya uni joyidan siljitmaydi
  const isTouchedRef = useRef(initial !== null);
  const [isReady, setIsReady] = useState(false);
  const [isTouched, setIsTouched] = useState(initial !== null);
  const [canLocate, setCanLocate] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isDisposed = false;
    let map: LeafletMap | null = null;

    void import("leaflet").then((L) => {
      if (isDisposed || !containerRef.current) return;
      map = L.map(containerRef.current, {
        center: initial ? [initial.latitude, initial.longitude] : DEFAULT_CENTER,
        zoom: initial ? PICK_ZOOM : DEFAULT_ZOOM,
        zoomControl: false,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      map.on("dragstart", () => {
        isTouchedRef.current = true;
        setIsTouched(true);
      });
      mapRef.current = map;
      setIsReady(true);
    });

    return () => {
      isDisposed = true;
      mapRef.current = null;
      map?.remove();
    };
  }, [initial]);

  // Xaritani pastga sursa, Telegram oynani yopib yubormasligi uchun
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp?.isVersionAtLeast("7.7")) return;
    webApp.disableVerticalSwipes();
    return () => webApp.enableVerticalSwipes();
  }, []);

  useEffect(() => {
    if (!isReady) return;
    let isActive = true;
    void isLocationSupported().then((supported) => {
      if (!isActive) return;
      setCanLocate(supported);
      // Ochilganda o'zi joylashuvni topadi; kelmasa, mijoz xaritani qo'lda suradi
      if (!supported || isTouchedRef.current) return;
      void requestLocation()
        .then((location) => {
          if (isActive && !isTouchedRef.current) {
            mapRef.current?.setView([location.latitude, location.longitude], PICK_ZOOM);
          }
        })
        .catch(() => {
          // Ruxsat berilmadi: xaritani qo'lda surish mumkin
        });
    });
    return () => {
      isActive = false;
    };
  }, [isReady]);

  async function handleLocate() {
    setIsLocating(true);
    setError(null);
    try {
      const location = await requestLocation();
      mapRef.current?.setView([location.latitude, location.longitude], PICK_ZOOM);
    } catch {
      setError("Joylashuvni aniqlab bo'lmadi. Xaritani qo'lda suring.");
    } finally {
      setIsLocating(false);
    }
  }

  function handleConfirm() {
    const center = mapRef.current?.getCenter().wrap();
    if (center) onConfirm({ latitude: center.lat, longitude: center.lng });
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <div className="relative isolate min-h-0 flex-1">
        <div ref={containerRef} aria-label="Xarita" className="absolute inset-0 z-0 bg-secondary [&_.leaflet-tile-pane]:saturate-50" />

        {/* Pin joyida turadi, xarita uning ostida suriladi: uchi ekran markazini ko'rsatadi */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center">
          {!isTouched && (
            <span className="mb-2 whitespace-nowrap rounded-xl bg-background px-3 py-1.5 text-sm text-foreground shadow">
              Xaritani surib, joyni belgilang
            </span>
          )}
          <span className="flex size-12 items-center justify-center rounded-2xl border-[3px] border-white bg-button text-2xl shadow-lg">
            <span aria-hidden>🛵</span>
          </span>
          <span className="h-5 w-1 rounded-b bg-neutral-900" />
        </div>

        <button
          type="button"
          onClick={onBack}
          aria-label="Orqaga"
          className="absolute bottom-4 left-3 z-10 flex size-12 items-center justify-center rounded-full bg-background text-foreground shadow-lg"
        >
          <BackIcon />
        </button>
        {canLocate && (
          <button
            type="button"
            onClick={handleLocate}
            disabled={isLocating}
            aria-label="Joylashuvimni aniqlash"
            className="absolute bottom-4 right-3 z-10 flex size-12 items-center justify-center rounded-full bg-background text-foreground shadow-lg disabled:opacity-50"
          >
            <LocateIcon className={isLocating ? "animate-pulse" : ""} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-t-3xl bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <h2 className="text-xl font-bold tracking-tight">Buyurtmani qayerga yetkazamiz?</h2>
        <p className="text-sm text-hint">Uy, qavat va mo&apos;ljalni keyingi qadamda yozib qoldirasiz.</p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isReady}
          className="rounded-2xl bg-button py-4 font-semibold text-button-text disabled:opacity-50"
        >
          Shu yerga yetkazish
        </button>
      </div>
    </div>
  );
}
