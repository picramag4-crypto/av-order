module.exports = {
  async fetch(request) {
    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = "-1004224118459";

      if (!token) {
        return Response.json(
          { error: "TELEGRAM_BOT_TOKEN is not configured" },
          { status: 500 }
        );
      }

      const order = await request.json();

      const text =
        "🍔 НОВЫЙ ЗАКАЗ\n\n" +
        (order.text || "Получен новый заказ.");

      const telegramResponse = await fetch(
        https://api.telegram.org/bot${token}/sendMessage,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: text
          })
        }
      );

      const telegramResult = await telegramResponse.json();

      if (!telegramResponse.ok) {
        return Response.json(
          {
            error: "Telegram API error",
            details: telegramResult
          },
          { status: 500 }
        );
      }

      return Response.json({ ok: true });
    } catch (error) {
      return Response.json(
        {
          error: "Failed to send order",
          details: String(error)
        },
        { status: 500 }
      );
    }
  }
};
