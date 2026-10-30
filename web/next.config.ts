import type { NextConfig } from "next";

try {
  // DATABASE_URL ildiz papkadagi .env faylida turadi
  process.loadEnvFile("../.env");
} catch {
  // .env fayli yo'q — o'zgaruvchilar tizim muhitidan olinadi (masalan, serverda)
}

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@cafe/db"],
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // Ishlab chiqishda Telegram sahifani tunnel (HTTPS) orqali ochadi
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
