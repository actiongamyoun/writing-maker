const https = require("https");

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) throw new Error("YOUTUBE_API_KEY 환경변수가 없음");

    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=KR&maxResults=5&key=${apiKey}`;
    const raw = await httpsGet(url);
    const data = JSON.parse(raw);

    if (!data.items) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: "YouTube API 오류", detail: data }) };
    }

    const videos = data.items.map(v => ({
      title: v.snippet.title,
      channel: v.snippet.channelTitle,
      description: v.snippet.description?.slice(0, 100) || "",
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ videos }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
