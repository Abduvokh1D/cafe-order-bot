import {
  advanceOrder,
  canCancelOrder,
  getStaffOrder,
  nextOrderStatus,
  type OrderStatus,
  type StaffOrder,
} from "@cafe/db";
import { GrammyError, InlineKeyboard, type Bot, type Context } from "grammy";

// Xodim tugmasidagi yozuv: nima qilinadi
function actionLabel(order: StaffOrder, status: OrderStatus) {
  switch (status) {
    case "accepted":
      return "✅ Qabul qilish";
    case "preparing":
      return "👨‍🍳 Tayyorlashni boshlash";
    case "ready":
      return "🛍 Tayyor";
    case "on_the_way":
      return "🚗 Yo'lga chiqdi";
    case "delivered":
      return order.type === "delivery" ? "🎉 Yetkazildi" : "🎉 Topshirildi";
    default:
      return status;
  }
}

// Guruhdagi xabarga qo'shiladigan qator: nima bo'ldi
function logLabel(order: StaffOrder) {
  switch (order.status) {
    case "accepted":
      return "✅ Qabul qilindi";
    case "preparing":
      return "👨‍🍳 Tayyorlanmoqda";
    case "ready":
      return "🛍 Tayyor";
    case "on_the_way":
      return "🚗 Yo'lda";
    case "delivered":
      return order.type === "delivery" ? "🎉 Yetkazildi" : "🎉 Topshirildi";
    case "cancelled":
      return "❌ Bekor qilindi";
    default:
      return order.status;
  }
}

function customerMessage(order: StaffOrder) {
  const name = `Buyurtmangiz №${order.id}`;
  switch (order.status) {
    case "accepted":
      return `✅ ${name} qabul qilindi.`;
    case "preparing":
      return `👨‍🍳 ${name} tayyorlanmoqda.`;
    case "ready":
      return `🛍 ${name} tayyor, olib ketishingiz mumkin.${order.cafeAddress ? `\n📍 ${order.cafeAddress}` : ""}`;
    case "on_the_way":
      return `🚗 ${name} yo'lda.`;
    case "delivered":
      return order.type === "delivery"
        ? `🎉 ${name} yetkazildi. Yoqimli ishtaha!`
        : `🎉 ${name} topshirildi. Yoqimli ishtaha!`;
    case "cancelled":
      return `❌ ${name} bekor qilindi. Savolingiz bo'lsa, kafega murojaat qiling${order.cafePhone ? `: ${order.cafePhone}` : "."}`;
    default:
      return null;
  }
}

/** Buyurtma holatiga mos tugmalar; yakunlangan buyurtmada null. */
function orderKeyboard(order: StaffOrder) {
  const next = nextOrderStatus(order.type, order.status);
  const canCancel = canCancelOrder(order.status);
  if (!next && !canCancel) return null;

  const keyboard = new InlineKeyboard();
  if (next) keyboard.text(actionLabel(order, next), `order:${next}:${order.id}`);
  if (canCancel) keyboard.text("❌ Bekor qilish", `order:cancel:${order.id}`);
  return keyboard;
}

async function showKeyboard(ctx: Context, order: StaffOrder) {
  const keyboard = orderKeyboard(order);
  try {
    await ctx.editMessageReplyMarkup(keyboard ? { reply_markup: keyboard } : undefined);
  } catch (error) {
    // Ikki marta bosilganda tugmalar allaqachon to'g'ri bo'ladi: bu xato emas
    if (!(error instanceof GrammyError && error.description.includes("message is not modified"))) {
      throw error;
    }
  }
}

/** Holat o'zgarishi xabar yetmagani uchun bekor bo'lmaydi: xodim ogohlantiriladi va telefon qiladi. */
async function notifyCustomer(bot: Bot, order: StaffOrder) {
  const text = customerMessage(order);
  if (!text) return true;
  try {
    await bot.api.sendMessage(order.customerTelegramId, text);
    return true;
  } catch (error) {
    console.error(`Buyurtma №${order.id} xabari mijozga bormadi:`, error);
    return false;
  }
}

function cancelAlertText(order: StaffOrder, previousStatus: OrderStatus, cancelledBy: string) {
  const action =
    order.type === "pickup"
      ? "Tayyorlamang va mijozga bermang."
      : previousStatus === "on_the_way"
        ? "Kuryer: yetkazmang, kafega qayting."
        : "Tayyorlamang va yetkazib bermang.";
  return `❌ DIQQAT! Buyurtma №${order.id} bekor qilindi — ${cancelledBy}\n${action}`;
}

/**
 * Xabarni tahrirlash guruhga bildirishnoma bermaydi: bekor qilish alohida xabar bilan aytiladi,
 * aks holda kuryer yo'lda davom etadi. Xabar ketmasa, holat qaytarilmaydi: xodim ogohlantiriladi.
 */
async function alertStaffAboutCancel(ctx: Context, order: StaffOrder, previousStatus: OrderStatus) {
  const messageId = ctx.callbackQuery?.message?.message_id;
  try {
    await ctx.reply(cancelAlertText(order, previousStatus, ctx.from?.first_name ?? "xodim"), {
      reply_parameters: messageId ? { message_id: messageId, allow_sending_without_reply: true } : undefined,
    });
    return true;
  } catch (error) {
    console.error(`Buyurtma №${order.id} bekor qilingani guruhga yuborilmadi:`, error);
    return false;
  }
}

export function registerStaffHandlers(bot: Bot, cafeSlug: string) {
  bot.callbackQuery(
    /^order:(accepted|preparing|ready|on_the_way|delivered|cancelled):(\d+)$/,
    async (ctx) => {
      const status = ctx.match[1] as OrderStatus;
      const orderId = Number(ctx.match[2]);
      const chatId = ctx.chat?.id;

      const outcome = chatId
        ? await advanceOrder({ slug: cafeSlug, chatId, orderId, status })
        : ({ result: "forbidden" } as const);

      if (outcome.result === "forbidden") {
        await ctx.answerCallbackQuery({ text: "Bu guruhdan boshqarib bo'lmaydi.", show_alert: true });
        return;
      }
      if (outcome.result === "stale") {
        await ctx.answerCallbackQuery({ text: "Bu buyurtma holati allaqachon o'zgargan." });
        await showKeyboard(ctx, outcome.order);
        return;
      }

      const { order, previousStatus } = outcome;
      const delivered = await notifyCustomer(bot, order);
      const staffAlerted = order.status === "cancelled" ? await alertStaffAboutCancel(ctx, order, previousStatus) : true;

      await ctx.answerCallbackQuery(
        delivered && staffAlerted
          ? { text: logLabel(order) }
          : {
              text: delivered
                ? "Bekor qilindi, lekin guruhga ogohlantirish ketmadi. Kuryerga telefon qiling."
                : "Holat o'zgardi, lekin mijozga xabar bormadi. Telefon qiling.",
              show_alert: true,
            },
      );

      // Birinchi qaror tafsilotlardan bo'sh qator bilan ajratiladi, keyingilari tarix bo'lib qo'shiladi
      const original = ctx.callbackQuery.message?.text ?? `Buyurtma №${order.id}`;
      const separator = previousStatus === "new" ? "\n\n" : "\n";
      const warning =
        (delivered ? "" : " ⚠️ mijozga xabar bormadi") + (staffAlerted ? "" : " ⚠️ guruhga ogohlantirish ketmadi");
      const keyboard = orderKeyboard(order);
      await ctx.editMessageText(
        `${original}${separator}${logLabel(order)} — ${ctx.from.first_name}${warning}`,
        keyboard ? { reply_markup: keyboard } : undefined,
      );
    },
  );

  // Bekor qilish qaytarilmaydi va mijozga yuboriladi, shuning uchun avval tasdiq so'raladi
  bot.callbackQuery(/^order:cancel:(\d+)$/, async (ctx) => {
    const orderId = Number(ctx.match[1]);
    const chatId = ctx.chat?.id;
    const order = chatId ? await getStaffOrder({ slug: cafeSlug, chatId, orderId }) : null;

    if (!order) {
      await ctx.answerCallbackQuery({ text: "Bu guruhdan boshqarib bo'lmaydi.", show_alert: true });
      return;
    }
    if (!canCancelOrder(order.status)) {
      await ctx.answerCallbackQuery({ text: "Bu buyurtma holati allaqachon o'zgargan." });
      await showKeyboard(ctx, order);
      return;
    }

    await ctx.answerCallbackQuery({ text: "Bekor qilishni tasdiqlang." });
    await ctx.editMessageReplyMarkup({
      reply_markup: new InlineKeyboard()
        .text("❌ Ha, bekor qilish", `order:cancelled:${order.id}`)
        .text("↩️ Orqaga", `order:back:${order.id}`),
    });
  });

  bot.callbackQuery(/^order:back:(\d+)$/, async (ctx) => {
    const orderId = Number(ctx.match[1]);
    const chatId = ctx.chat?.id;
    const order = chatId ? await getStaffOrder({ slug: cafeSlug, chatId, orderId }) : null;

    if (!order) {
      await ctx.answerCallbackQuery({ text: "Bu guruhdan boshqarib bo'lmaydi.", show_alert: true });
      return;
    }
    await ctx.answerCallbackQuery();
    await showKeyboard(ctx, order);
  });
}
