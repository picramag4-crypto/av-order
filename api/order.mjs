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
      const chatId = "-1004224118459";

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
      const text = "🍔 НОВЫЙ ЗАКАЗ\n\n" + (order.text || "Новый заказ");

      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
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

      const telegramData = await telegramResponse.json();

      if (!telegramResponse.ok) {
        return new Response(
          JSON.stringify({
            error: "Telegram error",
            details: telegramData
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      return new Response(
        JSON.stringify({ ok: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (error) {
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
