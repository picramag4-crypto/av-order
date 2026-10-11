export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const setupKey = process.env.WEBHOOK_SETUP_KEY;
    const providedKey = request.headers.get("x-webhook-setup-key");

    if (!setupKey || providedKey !== setupKey) {
      return new Response("Forbidden", { status: 403 });
    }

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

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret,
          allowed_updates: ["callback_query"]
        })
      }
    );

    const result = await telegramResponse.json();

    return new Response(JSON.stringify(result), {
      status: telegramResponse.status,
      headers: { "Content-Type": "application/json" }
    });
  }
};
