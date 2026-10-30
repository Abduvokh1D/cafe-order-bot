import { TelegramGreeting } from "@/components/telegram-greeting";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">🍽 Menyu</h1>
      <TelegramGreeting />
      <p className="text-sm text-hint">
        {"Taomlar ro'yxati tez orada shu yerda paydo bo'ladi."}
      </p>
    </main>
  );
}
