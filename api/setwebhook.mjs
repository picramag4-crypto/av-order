export default {
  async fetch() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const webhookUrl = "https://av-order.vercel.app/api/telegram";

    if (!token) {
      return new Response(
        JSON.stringify({ ok: false, error: "TOKEN_MISSING" }),
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
          allowed_updates: ["callback_query"]
        })
      }
    );

    const result = await response.json();

    return new Response(
      JSON.stringify(result),
      {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
