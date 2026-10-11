export default {
  async fetch(request) {
    try {
      if (request.method !== "GET") {
        return json({ error: "Method not allowed" }, 405);
      }

      const token = process.env.TELEGRAM_BOT_TOKEN;
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!token || !supabaseUrl || !supabaseKey) {
        return json({ error: "Server configuration is missing" }, 500);
      }

      const url = new URL(request.url);
      const initData = url.searchParams.get("initData");

      if (!initData) {
        return json({ error: "Telegram initData is required" }, 401);
      }

      const telegramUser = await verifyTelegramInitData(initData, token);

      if (!telegramUser?.id) {
        return json({ error: "Invalid Telegram user" }, 401);
      }

      const apiUrl = new URL(
        supabaseUrl + "/rest/v1/loyalty_transactions"
      );

      apiUrl.searchParams.set(
        "telegram_user_id",
        "eq." + String(telegramUser.id)
      );
      apiUrl.searchParams.set(
        "select",
        "order_id,operation,points,created_at"
      );
      apiUrl.searchParams.set("order", "created_at.desc");
      apiUrl.searchParams.set("limit", "50");

      const response = await fetch(apiUrl.toString(), {
        headers: {
          apikey: supabaseKey,
          Authorization: "Bearer " + supabaseKey
        }
      });

      const rows = await response.json();

      if (!response.ok) {
        console.error("Supabase history error:", rows);
        return json({ error: "Could not load loyalty history" }, 500);
      }

      return json({
        ok: true,
        history: rows.map(row => ({
          orderId: row.order_id,
          operation: row.operation,
          points: Number(row.points),
          createdAt: row.created_at
        }))
      });
    } catch (error) {
      console.error("Loyalty history error:", error);
      return json({ error: "Failed to load loyalty history" }, 500);
    }
  }
};

async function verifyTelegramInitData(initData, botToken) {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const userText = params.get("user");

  if (!receivedHash || !authDate || !userText) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  if (authDate > now + 60 || now - authDate > 86400) {
    return null;
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const encoder = new TextEncoder();

  const hmacKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const secretKey = await crypto.subtle.sign(
    "HMAC",
    hmacKey,
    encoder.encode(botToken)
  );

  const validationKey = await crypto.subtle.importKey(
    "raw",
    secretKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    validationKey,
    encoder.encode(dataCheckString)
  );

  const calculatedHash = [...new Uint8Array(signature)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");

  if (!constantTimeEqual(calculatedHash, receivedHash)) {
    return null;
  }

  try {
    return JSON.parse(userText);
  } catch {
    return null;
  }
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}
