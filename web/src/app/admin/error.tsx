"use client";

export default function AdminError({ retry }: { retry: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Xato yuz berdi</h1>
      <p className="text-sm text-hint">
        Sahifani yuklab bo&apos;lmadi yoki fayl juda katta. Qayta urinib ko&apos;ring.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-xl bg-button px-5 py-3 font-medium text-button-text"
      >
        Qayta urinish
      </button>
    </main>
  );
}
