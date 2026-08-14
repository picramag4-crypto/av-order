export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    try {
      const update = await request.json();
      const callback = update.callback_query;

      if (!callback) {
        return new Response("OK", { status: 200 });
      }

      const token = process.env.TELEGRAM_BOT_TOKEN;
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!token) {
        return new Response("OK", { status: 200 });
      }

      const data = callback.data || "";

      if (data.startsWith("accept_order:")) {
        const parts = data.split(":");

        const telegramUserId = parts[1];
        const loyaltyDrinks = Math.max(
          0,
          Number(parts[2]) || 0
        );

        const answerUrl =
          "https://api.telegram.org/bot" +
          token +
          "/answerCallbackQuery";

        await fetch(answerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            callback_query_id: callback.id,
            text: "Заказ принят ✅"
          })
        });

        const editUrl =
          "https://api.telegram.org/bot" +
          token +
          "/editMessageReplyMarkup";

        await fetch(editUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: callback.message.chat.id,
            message_id: callback.message.message_id,
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "✅ Заказ принят",
                    callback_data: "already_accepted"
                  }
                ]
              ]
            }
          })
        });

        let newDrinksCount = null;

        // Начисляем напитки в карту лояльности
        if (
          telegramUserId &&
          telegramUserId !== "no_user" &&
          loyaltyDrinks > 0 &&
          supabaseUrl &&
          supabaseKey
        ) {
          const getUrl =
            supabaseUrl +
            "/rest/v1/loyalty?telegram_user_id=eq." +
            encodeURIComponent(telegramUserId) +
            "&select=telegram_user_id,drinks_count";

          const getResponse = await fetch(getUrl, {
            method: "GET",
            headers: {
              "apikey": supabaseKey,
              "Authorization": "Bearer " + supabaseKey,
              "Content-Type": "application/json"
            }
          });

          const rows = await getResponse.json();

          if (getResponse.ok) {
            const oldCount =
              rows.length > 0
                ? Number(rows[0].drinks_count || 0)
                : 0;

            newDrinksCount =
              oldCount + loyaltyDrinks;

            if (rows.length > 0) {
              const updateUrl =
                supabaseUrl +
                "/rest/v1/loyalty?telegram_user_id=eq." +
                encodeURIComponent(telegramUserId);

              await fetch(updateUrl, {
                method: "PATCH",
                headers: {
                  "apikey": supabaseKey,
                  "Authorization":
                    "Bearer " + supabaseKey,
                  "Content-Type":
                    "application/json"
                },
                body: JSON.stringify({
                  drinks_count: newDrinksCount,
                  updated_at:
                    new Date().toISOString()
                })
              });

            } else {
              const insertUrl =
                supabaseUrl +
                "/rest/v1/loyalty";

              await fetch(insertUrl, {
                method: "POST",
                headers: {
                  "apikey": supabaseKey,
                  "Authorization":
                    "Bearer " + supabaseKey,
                  "Content-Type":
                    "application/json"
                },
                body: JSON.stringify({
                  telegram_user_id:
                    telegramUserId,
                  drinks_count:
                    newDrinksCount
                })
              });
            }
          }
        }

        // Сообщение гостю
        if (
          telegramUserId &&
          telegramUserId !== "no_user"
        ) {
          const sendUrl =
            "https://api.telegram.org/bot" +
            token +
            "/sendMessage";

          let customerText =
            "✅ Ваш заказ принят сотрудниками.\n\n" +
            "Заказ передан на кухню.";

          if (
            loyaltyDrinks > 0 &&
            newDrinksCount !== null
          ) {
            const position =
              newDrinksCount % 10;

            customerText +=
              "\n\n☕ На карту лояльности начислено: " +
              loyaltyDrinks;

            customerText +=
              "\nВаша карта: " +
              position +
              " из 10";
          }

          await fetch(sendUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              chat_id: telegramUserId,
              text: customerText
            })
          });
        }
      }

      return new Response("OK", { status: 200 });

    } catch (error) {
      console.error(error);
      return new Response("OK", { status: 200 });
    }
  }
};
