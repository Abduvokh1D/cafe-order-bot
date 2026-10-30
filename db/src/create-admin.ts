import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { getDb } from "./index.ts";
import { MIN_PASSWORD_LENGTH, saveAdmin } from "./auth.ts";

try {
  process.loadEnvFile("../.env");
} catch {
  // .env fayli yo'q — o'zgaruvchilar tizim muhitidan olinadi (masalan, serverda)
}

// Parol ekranda ko'rinmasligi uchun javob yozilayotganda chiqish yopiladi
let isMuted = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!isMuted) process.stdout.write(chunk);
    callback();
  },
});
const prompt = createInterface({ input: process.stdin, output, terminal: true });

async function askPassword(question: string) {
  process.stdout.write(question);
  isMuted = true;
  const answer = await prompt.question("");
  isMuted = false;
  process.stdout.write("\n");
  return answer;
}

const slug = process.env.ADMIN_SLUG ?? ((await prompt.question("Kafe (masalan, sinov-kafe): ")).trim());
const login = process.env.ADMIN_LOGIN ?? ((await prompt.question("Login: ")).trim());
let password = process.env.ADMIN_PASSWORD;
if (!password) {
  password = await askPassword(`Parol (kamida ${MIN_PASSWORD_LENGTH} belgi): `);
  if (password !== (await askPassword("Parolni takrorlang: "))) {
    console.error("Parollar mos kelmadi.");
    process.exit(1);
  }
}
prompt.close();

if (!login || password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Login bo'sh bo'lmasligi, parol kamida ${MIN_PASSWORD_LENGTH} belgi bo'lishi kerak.`);
  process.exit(1);
}

const result = await saveAdmin(slug, login, password);
const messages = {
  created: `"${login}" admini "${slug}" uchun yaratildi. Kirish: /admin/login`,
  updated: `"${login}" paroli yangilandi, eski sessiyalar yopildi.`,
  cafe_not_found: `"${slug}" kafesi topilmadi.`,
  login_taken: `"${login}" logini boshqa kafeda band.`,
};
console.log(messages[result]);
await getDb().$client.end();
process.exitCode = result === "created" || result === "updated" ? 0 : 1;
