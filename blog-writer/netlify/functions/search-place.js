const https = require("https");

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  const { query } = event.queryStringParameters || {};
  if (!query) return { statusCode: 400, headers, body: JSON.stringify({ error: "query required" }) };

  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=ko&type=restaurant&key=${apiKey}`;
    const raw = await httpsGet(url);
    const data = JSON.parse(raw);

    const results = (data.results || []).slice(0, 5).map((p) => ({
      name: p.name,
      address: (p.formatted_address || "").replace("대한민국 ", ""),
      rating: p.rating,
      totalRatings: p.user_ratings_total,
      placeId: p.place_id,
      category: (p.types || [])
        .filter((t) => !["point_of_interest", "establishment", "food"].includes(t))
        .slice(0, 2).join(", "),
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ results }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
