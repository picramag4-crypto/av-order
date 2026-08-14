export default {
  async fetch(request) {
    try {
      const baseUrl = new URL(request.url).origin;

      const response = await fetch(
        baseUrl + "/api/loyalty",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            telegramUserId: "123",
            drinks: 1
          })
        }
      );

      const result = await response.json();

      return new Response(
        JSON.stringify(result),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({
          error: String(error)
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }
  }
};
