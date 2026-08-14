export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const telegramUserId = url.searchParams.get("telegramUserId");

      if (!telegramUserId) {
        return new Response(
          JSON.stringify({ error: "telegramUserId is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseKey) {
        return new Response(
          JSON.stringify({ error: "Supabase configuration is missing" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const apiUrl =
        supabaseUrl +
        "/rest/v1/loyalty?telegram_user_id=eq." +
        encodeURIComponent(telegramUserId) +
        "&select=telegram_user_id,drinks_count";

      const dbResponse = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "apikey": supabaseKey,
          "Authorization": "Bearer " + supabaseKey,
          "Content-Type": "application/json"
        }
      });

      const rows = await dbResponse.json();

      if (!dbResponse.ok) {
        return new Response(
          JSON.stringify({
            error: "Supabase error",
            details: rows
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      const drinksCount =
        rows.length > 0
          ? Number(rows[0].drinks_count || 0)
          : 0;

      return new Response(
        JSON.stringify({
          ok: true,
          drinksCount: drinksCount
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );

    } catch (error) {
      console.error(error);

      return new Response(
        JSON.stringify({
          error: "Failed to load loyalty",
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
