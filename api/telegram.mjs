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

      if (callback.data === "accept_order") {
        const answerUrl =
          "https://api.telegram.org/bot" +
          token +
          "/answerCallbackQuery";

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

        const editUrl =
          "https://api.telegram.org/bot" +
          token +
          "/editMessageReplyMarkup";

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
                    text: "✅ Заказ принят",
                    callback_data: "already_accepted"
                  }
                ]
              ]
            }
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
