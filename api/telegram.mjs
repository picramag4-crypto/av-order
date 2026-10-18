const STAFF_CHAT_ID = "-1004224118459";

function response() {
  return new Response("OK", { status: 200 });
}

async function telegramRequest(token, method, body) {
  const res = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }
  );

  const data = await res.json();

  if (!res.ok || !data.ok) {
    throw new Error(
      `Telegram ${method}: ${JSON.stringify(data)}`
    );
  }

  return data;
}

async function supabaseRequest(url, key, path, options = {}) {
  const res = await fetch(`${url.replace(/\/$/, "")}${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`Supabase: ${text}`);
  }

  return data;
}

async function answerCallback(token, callback, text) {
  await telegramRequest(token, "answerCallbackQuery", {
    callback_query_id: callback.id,
    text
  });
}

async function editKeyboard(token, message, keyboard) {
  await telegramRequest(token, "editMessageReplyMarkup", {
    chat_id: message.chat.id,
    message_id: message.message_id,
    reply_markup: { inline_keyboard: keyboard }
  });
}

async function sendCustomerMessage(token, userId, text) {
  if (!userId) return;

  await telegramRequest(token, "sendMessage", {
    chat_id: userId,
    text
  });
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return response();
    }
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (
  !webhookSecret ||
  request.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret
) {
  return new Response("Forbidden", { status: 403 });
}
    try {
      const update = await request.json();
const callback = update.callback_query;
const incomingMessage = update.message;

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  return response();
}

// =========================================
// ПРИВЕТСТВИЕ НОВОГО ГОСТЯ
// =========================================
if (
  incomingMessage?.text &&
  /^\/start(?:@\w+)?(?:\s|$)/i.test(incomingMessage.text)
) {
  const chatId = incomingMessage.chat.id;

  await telegramRequest(token, "sendMessage", {
    chat_id: chatId,
    text:
      "Привет! Добро пожаловать в АВ ☕🍔\n\n" +
      "У нас — сочные бургеры, ароматный кофе, хрустящая картошечка и десерты, ради которых хочется сделать небольшую паузу в делах. ❤️\n\n" +
      "⭐ Карта лояльности уже ждёт тебя в магазине: получай 3% бонусами за подходящие заказы и оплачивай бонусами до 20% стоимости товаров.\n\n" +
      "Выбирай любимое — а мы приготовим с душой!",
    reply_markup: {
      inline_keyboard: [[
        {
          text: "🍔 Открыть меню АВ",
          web_app: {
            url: "https://av-order.vercel.app/"
          }
        }
      ]]
    }
  });

  return response();
}

if (!callback) {
  return response();
}

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!token) {
        return response();
      }

      const data = callback.data || "";
      const message = callback.message;

      // =========================================
      // ЗАКАЗЫ VK — СОХРАНЯЕМ ПРЕЖНЮЮ ЛОГИКУ
      // =========================================
      if (data.startsWith("vk_status:")) {
        const status = data.split(":")[1];

        const statuses = {
          accepted: {
            text: "🧑‍🍳 Заказ VK принят в работу",
            next: "ready",
            button: "🍔 Заказ готов"
          },
          ready: {
            text: "🍔 Заказ VK готов",
            next: "done",
            button: "✅ Заказ выдан"
          },
          done: {
            text: "✅ Заказ VK выдан",
            next: null,
            button: null
          }
        };

        const current = statuses[status];

        await telegramRequest(token, "answerCallbackQuery", {
          callback_query_id: callback.id,
          text: current ? current.text : "Неизвестный статус"
        });

        if (current && message) {
          const keyboard = current.next
            ? [[{
                text: current.button,
                callback_data: "vk_status:" + current.next
              }]]
            : [];

          await telegramRequest(token, "editMessageReplyMarkup", {
            chat_id: message.chat.id,
            message_id: message.message_id,
            reply_markup: { inline_keyboard: keyboard }
          });
        }

        return response();
      }

      // =========================================
      // TELEGRAM: ПРИНЯТИЕ ЗАКАЗА
      // =========================================
      if (data.startsWith("accept_order:")) {
        if (
          !message ||
          String(message.chat.id) !== STAFF_CHAT_ID
        ) {
          await answerCallback(
            token,
            callback,
            "Нет доступа к управлению заказом"
          );
          return response();
        }

        const orderId = data.slice("accept_order:".length);

        if (!orderId) {
          await answerCallback(token, callback, "Не указан ID заказа");
          return response();
        }

        if (!supabaseUrl || !supabaseKey) {
          await answerCallback(
            token,
            callback,
            "Не настроена бонусная система"
          );
          return response();
        }

        // Ищем бонусную запись. У гостевых заказов её может не быть.
        const rows = await supabaseRequest(
          supabaseUrl,
          supabaseKey,
          `/rest/v1/loyalty_orders?order_id=eq.${encodeURIComponent(orderId)}&select=order_id,telegram_user_id,status`
        );

        const loyaltyOrder = Array.isArray(rows) ? rows[0] : null;

        if (loyaltyOrder?.status === "cancelled") {
          await answerCallback(token, callback, "Заказ уже отменён");
          return response();
        }

        if (loyaltyOrder?.status === "completed") {
          await answerCallback(token, callback, "Заказ уже выдан");
          return response();
        }

        if (loyaltyOrder?.status === "pending") {
          await supabaseRequest(
            supabaseUrl,
            supabaseKey,
            `/rest/v1/loyalty_orders?order_id=eq.${encodeURIComponent(orderId)}&status=eq.pending`,
            {
              method: "PATCH",
              headers: { Prefer: "return=representation" },
              body: JSON.stringify({ status: "accepted" })
            }
          );
        }

        await answerCallback(token, callback, "Заказ принят ✅");

        await editKeyboard(token, message, [[{
          text: "📦 Заказ принят — выдать",
          callback_data: `complete_order:${orderId}`
        }]]);

        if (loyaltyOrder?.telegram_user_id) {
          await sendCustomerMessage(
            token,
            loyaltyOrder.telegram_user_id,
            "🧑‍🍳 Ваш заказ принят и передан на кухню.\n\nСпасибо, что выбираете АВ ❤️"
          );
        }

        return response();
      }

      // =========================================
      // TELEGRAM: ЗАКАЗ ВЫДАН КЛИЕНТУ
      // =========================================
      if (data.startsWith("complete_order:")) {
        if (
          !message ||
          String(message.chat.id) !== STAFF_CHAT_ID
        ) {
          await answerCallback(
            token,
            callback,
            "Нет доступа к управлению заказом"
          );
          return response();
        }

        const orderId = data.slice("complete_order:".length);

        if (!orderId || !supabaseUrl || !supabaseKey) {
          await answerCallback(
            token,
            callback,
            "Не удалось обработать заказ"
          );
          return response();
        }

        const rows = await supabaseRequest(
          supabaseUrl,
          supabaseKey,
          `/rest/v1/loyalty_orders?order_id=eq.${encodeURIComponent(orderId)}&select=order_id,telegram_user_id,status`
        );

        const loyaltyOrder = Array.isArray(rows) ? rows[0] : null;

        // Гостевой заказ не участвует в бонусной системе.
        if (!loyaltyOrder) {
          await answerCallback(
            token,
            callback,
            "Заказ выдан. Бонусная запись отсутствует."
          );

          await editKeyboard(token, message, [[{
            text: "✅ Заказ выдан",
            callback_data: "already_completed"
          }]]);

          return response();
        }

        if (loyaltyOrder.status === "cancelled") {
          await answerCallback(token, callback, "Заказ отменён");
          return response();
        }

        if (loyaltyOrder.status === "pending") {
          await answerCallback(
            token,
            callback,
            "Сначала примите заказ"
          );
          return response();
        }

        if (loyaltyOrder.status === "completed") {
          await answerCallback(token, callback, "Заказ уже выдан");
          return response();
        }

        const result = await supabaseRequest(
          supabaseUrl,
          supabaseKey,
          "/rest/v1/rpc/complete_loyalty_order",
          {
            method: "POST",
            body: JSON.stringify({ p_order_id: orderId })
          }
        );

        // RPC может вернуть объект либо массив объектов.
        const completion = Array.isArray(result) ? result[0] : result;

        if (!completion || completion.success !== true) {
          console.error("Order completion failed:", completion);

          await answerCallback(
            token,
            callback,
            "Не удалось завершить заказ. Проверьте статус."
          );
          return response();
        }

        await answerCallback(token, callback, "Заказ выдан ✅");

        await editKeyboard(token, message, [[{
          text: "✅ Заказ выдан",
          callback_data: "already_completed"
        }]]);

        const earned = Math.max(
          0,
          Number(completion.points_earned) || 0
        );

        await sendCustomerMessage(
          token,
          loyaltyOrder.telegram_user_id,
          earned > 0
            ? `❤️ Спасибо за заказ в АВ!\n\nНачислено бонусов: ${earned} ₽.\nИх можно использовать для оплаты до 20% стоимости товаров в следующем заказе.`
            : "❤️ Спасибо за заказ в АВ!\n\nЗаказ выдан. Будем рады видеть вас снова."
        );

        return response();
      }

      return response();
    } catch (error) {
      console.error("Telegram webhook error:", error);
      return response();
    }
  }
};
