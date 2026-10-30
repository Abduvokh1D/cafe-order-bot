export type Coordinates = { latitude: number; longitude: number };

// Telegram javob bermay qolsa ham forma qotib qolmasligi uchun
const SUPPORT_CHECK_MS = 3_000;
// Ruxsat oynasiga ham vaqt yetishi kerak
const REQUEST_TIMEOUT_MS = 30_000;

// Telegram 8.0 dan eski kompyuter ilovalarida brauzer lokatsiyasi javobni faqat uzoq kutib rad etadi
const DESKTOP_PLATFORMS = ["tdesktop", "macos", "weba", "webk", "web", "unigram"];

/** Tugmani ko'rsatish kerakmi: masalan, Telegram Desktop lokatsiya bera olmaydi. */
export function isLocationSupported() {
  const webApp = window.Telegram?.WebApp;
  if (!webApp?.isVersionAtLeast("8.0")) {
    return Promise.resolve(
      Boolean(navigator.geolocation) && !DESKTOP_PLATFORMS.includes(webApp?.platform ?? ""),
    );
  }

  const manager = webApp.LocationManager;
  if (manager.isInited) return Promise.resolve(manager.isLocationAvailable);
  return new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(false), SUPPORT_CHECK_MS);
    manager.init(() => resolve(manager.isLocationAvailable));
  });
}

function fromBrowser() {
  return new Promise<Coordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}

function fromTelegram(manager: TelegramLocationManager) {
  return new Promise<Coordinates>((resolve, reject) => {
    manager.getLocation((location) => {
      if (location) {
        resolve({ latitude: location.latitude, longitude: location.longitude });
      } else {
        reject(new Error("Lokatsiyaga ruxsat berilmadi"));
      }
    });
  });
}

/** isLocationSupported() true qaytargandan keyin chaqiriladi. */
export function requestLocation() {
  const webApp = window.Telegram?.WebApp;
  const location = webApp?.isVersionAtLeast("8.0") ? fromTelegram(webApp.LocationManager) : fromBrowser();
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Lokatsiya vaqtida kelmadi")), REQUEST_TIMEOUT_MS);
  });
  return Promise.race([location, timeout]);
}
