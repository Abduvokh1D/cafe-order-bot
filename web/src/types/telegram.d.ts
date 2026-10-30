// Telegram Mini App API'ning bizga kerakli qismi.
// To'liq ro'yxat: https://core.telegram.org/bots/webapps

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramLocationManager {
  isInited: boolean;
  isLocationAvailable: boolean;
  init(callback?: () => void): void;
  getLocation(callback: (location: { latitude: number; longitude: number } | null) => void): void;
}

interface TelegramWebApp {
  /** Serverda tekshirish uchun imzolangan satr (bo'sh bo'lsa — Telegram tashqarisida) */
  initData: string;
  /** Tekshirilmagan ma'lumot: faqat ko'rsatish uchun, serverda ishonilmaydi */
  initDataUnsafe: { user?: TelegramWebAppUser };
  colorScheme: "light" | "dark";
  ready(): void;
  expand(): void;
  platform: string;
  isVersionAtLeast(version: string): boolean;
  LocationManager: TelegramLocationManager;
  BackButton: {
    show(): void;
    hide(): void;
    onClick(callback: () => void): void;
    offClick(callback: () => void): void;
  };
}

interface Window {
  Telegram?: { WebApp: TelegramWebApp };
}
