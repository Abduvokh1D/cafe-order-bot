import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const URL_PREFIX = "/uploads/";
const FILE_NAME = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? path.resolve(process.cwd(), "../data/uploads");
}

// Fayl turi nomiga yoki brauzer aytganiga emas, ichidagi baytlarga qarab aniqlanadi
function detectExtension(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("latin1") === "RIFF" &&
    bytes.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

export type SavedImage = { url: string } | { error: string };

export async function saveImage(file: File): Promise<SavedImage> {
  if (file.size > MAX_IMAGE_BYTES) return { error: "Rasm 5 MB dan oshmasligi kerak." };

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = detectExtension(bytes);
  if (!extension) return { error: "Faqat JPG, PNG yoki WEBP rasm yuklash mumkin." };

  await mkdir(uploadsDir(), { recursive: true });
  const name = `${randomUUID()}.${extension}`;
  await writeFile(path.join(uploadsDir(), name), bytes);
  return { url: `${URL_PREFIX}${name}` };
}

/** Eski rasmni o'chiradi. Fayl topilmasa ham xato emas: taom allaqachon yangilangan. */
export async function deleteImage(url: string | null) {
  const name = url?.startsWith(URL_PREFIX) ? url.slice(URL_PREFIX.length) : null;
  if (!name || !FILE_NAME.test(name)) return;
  await unlink(path.join(uploadsDir(), name)).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") console.error("Rasm o'chirilmadi:", error);
  });
}

/** Faqat biz yaratgan nom shakli o'qiladi, shuning uchun boshqa fayllarga yo'l ochilmaydi. */
export async function readImage(name: string) {
  if (!FILE_NAME.test(name)) return null;
  const extension = name.slice(name.lastIndexOf(".") + 1);
  try {
    return {
      bytes: await readFile(path.join(uploadsDir(), name)),
      contentType: CONTENT_TYPES[extension],
    };
  } catch {
    return null;
  }
}
