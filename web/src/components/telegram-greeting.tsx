"use client";

import { useEffect, useSyncExternalStore } from "react";

// telegram-web-app.js layout'da ulanadi; sahifa to'liq yuklangach (load) u albatta tayyor
function subscribe(onChange: () => void) {
  window.addEventListener("load", onChange);
  return () => window.removeEventListener("load", onChange);
}

function getFirstName() {
  return window.Telegram?.WebApp.initDataUnsafe.user?.first_name ?? "";
}

export function TelegramGreeting() {
  // Serverda null; brauzerda — Telegram foydalanuvchisining ismi yoki bo'sh satr
  const firstName = useSyncExternalStore(subscribe, getFirstName, () => null);

  useEffect(() => {
    const init = () => {
      const tg = window.Telegram?.WebApp;
      tg?.ready();
      tg?.expand();
    };
    if (document.readyState === "complete") {
      init();
      return;
    }
    window.addEventListener("load", init, { once: true });
    return () => window.removeEventListener("load", init);
  }, []);

  if (firstName === null) return null;

  if (!firstName) {
    return (
      <p className="text-sm text-hint">
        Sahifa Telegram tashqarisida ochildi. Bot orqali kiring.
      </p>
    );
  }

  return <p className="text-lg">Salom, {firstName}! 👋</p>;
}
