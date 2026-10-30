"use client";

export default function MenuError({ retry }: { retry: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Menyuni yuklab bo&apos;lmadi</h1>
      <p className="text-sm text-hint">Birozdan keyin qayta urinib ko&apos;ring.</p>
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
