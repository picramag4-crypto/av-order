
function isLunchDiscountTime() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Moscow",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date());

  const weekday = parts.find(
    part => part.type === "weekday"
  )?.value;

  const hour = Number(
    parts.find(part => part.type === "hour")?.value
  );

  const isWeekday = [
    "Mon", "Tue", "Wed", "Thu", "Fri"
  ].includes(weekday);

  return isWeekday && hour >= 12 && hour < 16;
}

async function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

// Проверяем подлинность данных Telegram Mini App.
async function verifyTelegramInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  try {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get("hash");

    if (!receivedHash) return null;

   params.delete("hash");

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const encoder = new TextEncoder();

    const secretKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const secret = await crypto.subtle.sign(
      "HMAC",
      secretKey,
      encoder.encode(botToken)
    );

    const validationKey = await crypto.subtle.importKey(
      "raw",
      secret,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const calculatedHash = [...new Uint8Array(
      await crypto.subtle.sign(
        "HMAC",
        validationKey,
        encoder.encode(dataCheckString)
      )
    )]
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");

    if (calculatedHash.length !== receivedHash.length) return null;

    let difference = 0;
    for (let i = 0; i < calculatedHash.length; i++) {
      difference |= calculatedHash.charCodeAt(i) ^ receivedHash.charCodeAt(i);
    }

    if (difference !== 0) return null;

    const authDate = Number(params.get("auth_date"));
    if (!authDate || Date.now() / 1000 - authDate > 86400) {
      return null;
    }

    const user = JSON.parse(params.get("user") || "null");
    if (!user?.id) return null;

    return String(user.id);
  } catch {
    return null;
  }
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    try {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const staffChatId = "-1004224118459";
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!token) {
        return jsonResponse(
          { error: "Telegram token is missing" },
          500
        );
      }

      const order = await request.json();

      if (!order.text || typeof order.text !== "string") {
        return jsonResponse({ error: "Order text is missing" }, 400);
      }

      // Не доверяем telegramUserId из тела запроса:
      // пользователь определяется по проверенным данным Telegram.
      const telegramUserId = await verifyTelegramInitData(
        order.initData,
        token
      );

      const orderId = crypto.randomUUID();

console.log("Order loyalty diagnostics", {
  hasInitData: Boolean(order.initData),
  verifiedTelegramUser: Boolean(telegramUserId),
  hasPointsToRedeem: order.pointsToRedeem !== undefined,
  hasSupabaseConfig: Boolean(supabaseUrl && supabaseKey)
});

      
      // Сервер самостоятельно рассчитывает скидку и сумму товаров.
      if (
  Number(order.pointsToRedeem || 0) > 0 &&
  !telegramUserId
) {
  return jsonResponse(
    { error: "Telegram verification required to redeem points" },
    401
  );
}
      if (telegramUserId && order.pointsToRedeem !== undefined) {
        if (!supabaseUrl || !supabaseKey) {
          return jsonResponse(
            { error: "Supabase environment variables are missing" },
            500
          );
        }

        const originalSubtotal = Number(order.originalSubtotal);
        const pointsToRedeem = Number(order.pointsToRedeem);

        if (
          !Number.isSafeInteger(originalSubtotal) ||
          originalSubtotal < 0 ||
          !Number.isSafeInteger(pointsToRedeem) ||
          pointsToRedeem < 0
        ) {
          return jsonResponse(
            { error: "Invalid loyalty order values" },
            400
          );
        }

        // Бонусы и обеденная скидка взаимоисключающие.
        const lunchDiscountApplied =
          pointsToRedeem === 0 && isLunchDiscountTime();

        const discount = lunchDiscountApplied
          ? Math.round(originalSubtotal * 0.2)
          : 0;

        const goodsTotal = originalSubtotal - discount;

        // Проверяем лимит списания на сервере.
        if (pointsToRedeem > Math.floor(goodsTotal * 0.2)) {
          return jsonResponse(
            {
              error: "Loyalty redemption limit exceeded",
              maxPoints: Math.floor(goodsTotal * 0.2)
            },
            400
          );
        }

       
const rpcResponse = await fetch(
  `${supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/redeem_loyalty_points`,
  {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      p_order_id: orderId,
      p_telegram_user_id: telegramUserId,
      p_goods_total: goodsTotal,
      p_points_to_redeem: pointsToRedeem,
      p_lunch_discount_applied: lunchDiscountApplied
    })
  }
);

const rpcData = await rpcResponse.json().catch(() => null);

if (!rpcResponse.ok || rpcData?.success !== true) {
  console.error("Loyalty redemption failed:", rpcData);

  return jsonResponse(
    {
      error: "Loyalty operation failed",
      details: rpcData
    },
    400
  );
}
}

// Отправка заказа сотрудникам
const telegramUrl =
  `https://api.telegram.org/bot${token}/sendMessage`;

const staffText =
  "🍔 НОВЫЙ ЗАКАЗ\n" +
  `🧾 № ${orderId}\n\n` +
  order.text;


      // Сначала отправляем заказ сотрудникам.
      const staffResponse = await fetch(telegramUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: staffChatId,
          text: staffText,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Принять заказ",
                  callback_data: `accept_order:${orderId}`
                }
              ]
            ]
          }
        })
      });

      const staffData = await staffResponse.json();

      if (!staffResponse.ok || !staffData.ok) {
        console.error("Telegram staff message failed:", staffData);

        // Если бонусы уже списаны, заказ нельзя просто забыть:
        // сообщаем об ошибке для ручной проверки и возврата.
        return jsonResponse(
          {
            error: "Telegram error",
            details: staffData,
            orderId,
            loyaltyMayNeedRefund: Boolean(telegramUserId)
          },
          500
        );
      }

      // Подтверждение отправляем только пользователю,
      // которого удалось проверить через Telegram initData.
      if (telegramUserId) {
        const customerText =
          "✅ Ваш заказ получен!\n\n" +
          order.text +
          "\n\nЗаказ передан сотрудникам.\n" +
          "Спасибо за заказ в АВ ❤️";

        const customerResponse = await fetch(telegramUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramUserId,
            text: customerText
          })
        });

        if (!customerResponse.ok) {
          console.error(
            "Customer notification failed:",
            await customerResponse.text()
          );
        }
      }

      return jsonResponse({ ok: true, orderId });
    } catch (error) {
      console.error(error);

      return jsonResponse(
        {
          error: "Failed to send order",
          details: String(error)
        },
        500
      );
    }
  }
};
