export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const staffChatId = "-1004224118459";

      if (!token) {
        return new Response(
          JSON.stringify({ error: "Telegram token is missing" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const order = await request.json();

      const text =
        "🍔 НОВЫЙ ЗАКАЗ\n\n" +
        (order.text || "Новый заказ");

      const telegramUrl =
        "https://api.telegram.org/bot" +
        token +
        "/sendMessage";

      // Отправляем ОДНО сообщение сотрудникам с кнопкой
      const staffResponse = await fetch(telegramUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: staffChatId,
          text: text,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Принять заказ",
                  callback_data:
                    "accept_order:" +
                    (order.telegramUserId || "no_user")
                }
              ]
            ]
          }
        })
      });

      const staffData = await staffResponse.json();

      if (!staffResponse.ok) {
        return new Response(
          JSON.stringify({
            error: "Telegram error",
            details: staffData
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // Подтверждение гостю, что заказ получен
      if (order.telegramUserId) {
        const customerText =
          "✅ Ваш заказ получен!\n\n" +
          (order.text || "Заказ успешно оформлен.") +
          "\n\nЗаказ передан сотрудникам.\n" +
          "Спасибо за заказ в АВ Бургер ❤️";

        await fetch(telegramUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: order.telegramUserId,
            text: customerText
          })
        });
      }

      return new Response(
        JSON.stringify({ ok: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      console.error(error);

      return new Response(
        JSON.stringify({
          error: "Failed to send order",
          details: String(error)
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  }
};
