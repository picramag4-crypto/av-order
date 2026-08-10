export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = "-1004224118459";
    const order = req.body || {};

    if (!token) {
      return res.status(500).json({ error: "No Telegram token" });
    }

    const text =
      "🍔 НОВЫЙ ЗАКАЗ\n\n" +
      (order.text || "Получен новый заказ с сайта.");

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

    const result = await telegramResponse.json();

    if (!telegramResponse.ok) {
      return res.status(500).json({
        error: "Telegram error",
        details: result
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to send order"
    });
  }
}
