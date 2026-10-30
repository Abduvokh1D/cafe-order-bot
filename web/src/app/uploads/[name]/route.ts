import { readImage } from "@/lib/uploads";

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const image = await readImage(name);
  if (!image) return new Response("Topilmadi", { status: 404 });

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "X-Content-Type-Options": "nosniff",
      // Nomi tasodifiy va o'zgarmaydi: yangi rasm yangi nom oladi
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
