// Telegram Mini App API'ning bizga kerakli qismi.
// To'liq ro'yxat: https://core.telegram.org/bots/webapps

interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
  /** Serverda tekshirish uchun imzolangan satr (bo'sh bo'lsa — Telegram tashqarisida) */
  initData: string;
  /** Tekshirilmagan ma'lumot: faqat ko'rsatish uchun, serverda ishonilmaydi */
  initDataUnsafe: { user?: TelegramWebAppUser };
  colorScheme: "light" | "dark";
  ready(): void;
  expand(): void;
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
