const COUNTER_KEY = "howe-alpha-node:visits";

function getRedisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

async function runRedis(command) {
  const { url, token } = getRedisConfig();
  if (!url || !token) {
    return { configured: false };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error(`Redis request failed with ${response.status}`);
  }

  return { configured: true, payload: await response.json() };
}

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");

  if (!["GET", "POST"].includes(request.method)) {
    response.setHeader("Allow", "GET, POST");
    response.status(405).json({ error: "method_not_allowed" });
    return;
  }

  try {
    const command = request.method === "POST"
      ? ["INCR", COUNTER_KEY]
      : ["GET", COUNTER_KEY];
    const result = await runRedis(command);

    if (!result.configured) {
      response.status(503).json({
        error: "storage_not_configured",
        message: "Set KV_REST_API_URL and KV_REST_API_TOKEN on Vercel.",
      });
      return;
    }

    const value = result.payload?.result ?? 0;
    response.status(200).json({ count: Number(value) || 0 });
  } catch (error) {
    response.status(500).json({ error: "counter_unavailable" });
  }
};
