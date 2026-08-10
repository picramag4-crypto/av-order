export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    try {
      const update = await request.json();
      const callback = update.callback_query;

      if (!callback) {
        return new Response("OK", { status: 200 });
      }

      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = callback.message.chat.id;
      const messageId = callback.message.message_id;

      async function answer(text) {
        await fetch(
          `https://api.telegram.org/bot${token}/answerCallbackQuery`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              callback_query_id: callback.id,
              text: text
            })
          }
        );
      }

      async function setButtons(inlineKeyboard) {
        await fetch(
          `https://api.telegram.org/bot${token}/editMessageReplyMarkup`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: messageId,
              reply_markup: {
                inline_keyboard: inlineKeyboard
              }
            })
          }
        );
      }

      if (callback.data === "accept_order") {
        await answer("Заказ принят ✅");

        await setButtons([
          [
            {
              text: "🍳 Готовится",
              callback_data: "cooking_order"
            }
          ],
          [
            {
              text: "✅ Готов",
              callback_data: "ready_order"
            },
            {
              text: "❌ Отменить",
              callback_data: "cancel_order"
            }
          ]
        ]);
      }

      else if (callback.data === "cooking_order") {
        await answer("Заказ готовится 🍳");

        await setButtons([
          [
            {
              text: "🍳 Заказ готовится",
              callback_data: "already_cooking"
            }
          ],
          [
            {
              text: "✅ Готов",
              callback_data: "ready_order"
            },
            {
              text: "❌ Отменить",
              callback_data: "cancel_order"
            }
          ]
        ]);
      }

      else if (callback.data === "ready_order") {
        await answer("Заказ готов ✅");

        await setButtons([
          [
            {
              text: "✅ ЗАКАЗ ГОТОВ",
              callback_data: "already_ready"
            }
          ]
        ]);
      }

      else if (callback.data === "cancel_order") {
        await answer("Заказ отменён ❌");

        await setButtons([
          [
            {
              text: "❌ ЗАКАЗ ОТМЕНЁН",
              callback_data: "already_cancelled"
            }
          ]
        ]);
      }

      else {
        await answer("Статус уже установлен");
      }

      return new Response("OK", { status: 200 });

    } catch (error) {
      console.error(error);

      return new Response("OK", { status: 200 });
    }
  }
};
