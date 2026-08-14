export default {
  async fetch(request) {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return json(
          { error: "Supabase configuration is missing" },
          500
        );
      }

      // =========================
      // GET — узнать баланс
      // =========================
      if (request.method === "GET") {
        const url = new URL(request.url);
        const telegramUserId =
          url.searchParams.get("telegramUserId");

        if (!telegramUserId) {
          return json(
            { error: "telegramUserId is required" },
            400
          );
        }

        const apiUrl =
          supabaseUrl +
          "/rest/v1/loyalty?telegram_user_id=eq." +
          encodeURIComponent(telegramUserId) +
          "&select=telegram_user_id,drinks_count";

        const dbResponse = await fetch(apiUrl, {
          method: "GET",
          headers: supabaseHeaders(supabaseKey)
        });

        const rows = await dbResponse.json();

        if (!dbResponse.ok) {
          return json(
            {
              error: "Supabase error",
              details: rows
            },
            500
          );
        }

        const drinksCount =
          rows.length > 0
            ? Number(rows[0].drinks_count || 0)
            : 0;

        return json({
          ok: true,
          drinksCount: drinksCount
        });
      }

      // =========================
      // POST — добавить напитки
      // =========================
      if (request.method === "POST") {
        const body = await request.json();

        const telegramUserId =
          body.telegramUserId;

        const drinksToAdd =
          Number(body.drinks || 1);

        if (!telegramUserId) {
          return json(
            { error: "telegramUserId is required" },
            400
          );
        }

        if (
          !Number.isInteger(drinksToAdd) ||
          drinksToAdd < 1
        ) {
          return json(
            { error: "drinks must be a positive integer" },
            400
          );
        }

        // Сначала узнаём текущий счётчик
        const getUrl =
          supabaseUrl +
          "/rest/v1/loyalty?telegram_user_id=eq." +
          encodeURIComponent(telegramUserId) +
          "&select=telegram_user_id,drinks_count";

        const getResponse = await fetch(getUrl, {
          method: "GET",
          headers: supabaseHeaders(supabaseKey)
        });

        const rows = await getResponse.json();

        if (!getResponse.ok) {
          return json(
            {
              error: "Supabase read error",
              details: rows
            },
            500
          );
        }

        const oldCount =
          rows.length > 0
            ? Number(rows[0].drinks_count || 0)
            : 0;

        const newCount =
          oldCount + drinksToAdd;

        // Если клиент уже существует
        if (rows.length > 0) {
          const updateUrl =
            supabaseUrl +
            "/rest/v1/loyalty?telegram_user_id=eq." +
            encodeURIComponent(telegramUserId);

          const updateResponse =
            await fetch(updateUrl, {
              method: "PATCH",
              headers: {
                ...supabaseHeaders(supabaseKey),
                "Prefer": "return=representation"
              },
              body: JSON.stringify({
                drinks_count: newCount,
                updated_at:
                  new Date().toISOString()
              })
            });

          const result =
            await updateResponse.json();

          if (!updateResponse.ok) {
            return json(
              {
                error: "Supabase update error",
                details: result
              },
              500
            );
          }
        }

        // Если это первый напиток клиента
        else {
          const insertUrl =
            supabaseUrl +
            "/rest/v1/loyalty";
          const insertResponse =
            await fetch(insertUrl, {
              method: "POST",
              headers: {
                ...supabaseHeaders(supabaseKey),
                "Prefer": "return=representation"
              },
              body: JSON.stringify({
                telegram_user_id:
                  telegramUserId,
                drinks_count:
                  newCount
              })
            });

          const result =
            await insertResponse.json();

          if (!insertResponse.ok) {
            return json(
              {
                error: "Supabase insert error",
                details: result
              },
              500
            );
          }
        }

        return json({
          ok: true,
          previousCount: oldCount,
          added: drinksToAdd,
          drinksCount: newCount
        });
      }

      return json(
        { error: "Method not allowed" },
        405
      );

    } catch (error) {
      console.error(error);

      return json(
        {
          error: "Failed to process loyalty",
          details: String(error)
        },
        500
      );
    }
  }
};


// =========================
// Вспомогательные функции
// =========================

function supabaseHeaders(key) {
  return {
    "apikey": key,
    "Authorization": "Bearer " + key,
    "Content-Type": "application/json"
  };
}


function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status: status,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
