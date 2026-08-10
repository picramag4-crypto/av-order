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

      const answerUrl =
        "https://api.telegram.org/bot" +
        token +
        "/answerCallbackQuery";

      const editUrl =
        "https://api.telegram.org/bot" +
        token +
        "/editMessageReplyMarkup";


      if (callback.data === "accept_order") {

        await fetch(answerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            callback_query_id: callback.id,
            text: "Заказ принят ✅"
          })
        });

        await fetch(editUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🍳 Готовится",
                    callback_data: "cooking_order"
                  }
                ],
                [
                  {
                    text: "❌ Отменить",
                    callback_data: "cancel_order"
                  }
                ]
              ]
            }
          })
        });

      }


      else if (callback.data === "cooking_order") {

        await fetch(answerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            callback_query_id: callback.id,
            text: "Заказ готовится 🍳"
          })
        });

        await fetch(editUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            reply_markup: {
              inline_keyboard: [
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
                  }
                ],
                [
                  {
                    text: "❌ Отменить",
                    callback_data: "cancel_order"
                  }
                ]
              ]
            }
          })
        });

      }


      else {
        await fetch(answerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            callback_query_id: callback.id,
            text: "Статус пока не подключен"
          })
        });
      }


      return new Response("OK", { status: 200 });

    } catch (error) {

      console.error(error);

      return new Response("OK", { status: 200 });
    }
  }
};
