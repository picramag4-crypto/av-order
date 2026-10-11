export default {
  async fetch() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const webhookUrl = "https://av-order.vercel.app/api/telegram";

    if (!token || !secret) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: !token ? "TOKEN_MISSING" : "WEBHOOK_SECRET_MISSING"
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const response = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret,
          allowed_updates: ["callback_query"]
        })
      }
    );

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  }
};
