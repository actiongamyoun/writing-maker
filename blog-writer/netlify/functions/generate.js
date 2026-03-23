const Anthropic = require("@anthropic-ai/sdk");

exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  try {
    const { title, type, mood, length, purpose, tags, restaurantName, restaurantAddr, photoDesc, customStyle } =
      JSON.parse(event.body);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const lengthMap = { "짧게": "500자 내외", "보통": "1000자 내외", "길게": "1500자 이상" };

    const systemPrompt = `너는 네이버 블로그 전문 작가야. 아래 스타일 규칙을 반드시 따라.

[스타일]
- AI 냄새 절대 금지. 실제 사람이 쓴 구어체 반말
- 문장 끝: ~했음, ~인듯, ~아님, ~좋음, ~임, ~추천함, ~였음
- ㅋㅋ, ㄹㅇ, 진짜, 솔직히, 존맛 등 자연스럽게 사용
- 이모지 가끔 사용
- "안녕하세요", "오늘은 ~알아보겠습니다" 절대 금지
${customStyle ? `\n[추가 말투]\n${customStyle}` : ""}`;

    let userPrompt = `아래 조건으로 네이버 블로그 글 써줘:

제목: ${title || "(자유롭게)"}
유형: ${type}
분위기: ${mood}
길이: ${lengthMap[length] || "1000자 내외"}
핵심내용: ${purpose || "(자유롭게)"}
해시태그: ${tags}`;

    if (restaurantName) {
      userPrompt += `\n\n[음식점]\n이름: ${restaurantName}\n위치: ${restaurantAddr || ""}\n→ 웹 검색으로 대표메뉴, 가격대, 특징 찾아서 글에 자연스럽게 녹여줘`;
    }

    if (photoDesc) {
      userPrompt += `\n\n[사진 설명]\n${photoDesc}\n→ 글 중간 [📷 설명] 형식으로 사진 위치 표시해줘`;
    }

    userPrompt += `\n\n글 마지막에 해시태그 붙여줘.`;

    // 웹검색이 필요한 경우(음식점)와 아닌 경우 분리
    let message;
    if (restaurantName) {
      // 웹검색 포함
      message = await client.beta.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        betas: ["web-search-2025-03-05"],
      });
    } else {
      // 웹검색 없이
      message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
    }

    const text = message.content.filter(b => b.type === "text").map(b => b.text).join("");

    return { statusCode: 200, headers, body: JSON.stringify({ text }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
