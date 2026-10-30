"use client";

import { useEffect } from "react";

// telegram-web-app.js layout'da ulanadi; sahifa to'liq yuklangach (load) u albatta tayyor
export function TelegramInit() {
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

  return null;
}
