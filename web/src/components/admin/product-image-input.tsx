"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

const MAX_SIDE = 1200;
const JPEG_QUALITY = 0.85;

// Telefondagi katta foto menyuni sekinlashtiradi. Qayta chizilganda ichidagi GPS ma'lumoti ham yo'qoladi.
async function downscale(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas ishlamadi");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("Rasm tayyorlanmadi");
  return new File([blob], "image.jpg", { type: "image/jpeg" });
}

export function ProductImageInput({ currentUrl }: { currentUrl: string | null }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);

  // Forma saqlangach tozalanadi, ko'rinish ham asl holatiga qaytadi
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const handleReset = () => {
      setPreviewUrl(null);
      setIsRemoved(false);
    };
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    try {
      const smaller = await downscale(file);
      const transfer = new DataTransfer();
      transfer.items.add(smaller);
      input.files = transfer.files;
      setPreviewUrl(URL.createObjectURL(smaller));
    } catch {
      // Brauzer o'qiy olmadi: fayl o'zicha yuboriladi, server turini va hajmini tekshiradi
      setPreviewUrl(URL.createObjectURL(file));
    }
    setIsRemoved(false);
  }

  const shownUrl = previewUrl ?? (isRemoved ? null : currentUrl);

  return (
    <div className="flex items-center gap-3">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary text-2xl">
        {shownUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- vaqtinchalik blob manzil ham ko'rsatiladi
          <img src={shownUrl} alt="" className="size-full object-cover" />
        ) : (
          <span aria-hidden>🍽</span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2 text-sm">
        <label className="flex flex-col gap-1 font-medium">
          Rasm (JPG, PNG yoki WEBP)
          <input
            ref={inputRef}
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleChange}
            className="max-w-full text-sm font-normal text-hint"
          />
        </label>
        {currentUrl && !previewUrl && (
          <label className="flex items-center gap-2 text-hint">
            <input
              type="checkbox"
              name="removeImage"
              checked={isRemoved}
              onChange={(event) => setIsRemoved(event.target.checked)}
            />
            Rasmni olib tashlash
          </label>
        )}
      </div>
    </div>
  );
}
