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
    const {
      title, type, mood, length, purpose, tags,
      restaurantName, restaurantAddr, photoDesc, customStyle,
      trendMode, trendingVideos // 자동 모드일 때 프론트에서 전달
    } = JSON.parse(event.body);

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

    let userPrompt;

    if (trendMode === "auto" && trendingVideos?.length) {
      const videoList = trendingVideos.map((v, i) => `${i+1}. "${v.title}" (${v.channel})`).join("\n");

      userPrompt = `지금 유튜브 한국 급상승 영상 Top5야:
${videoList}

다음 순서로 블로그 글 작성해줘:
STEP 1: 위 주제 중 블로그 글로 쓰기 좋은 것 1개 선택
STEP 2: 선택한 주제로 웹 검색해서 관련 정보 충분히 수집
STEP 3: 수집한 정보 바탕으로 블로그 글 작성

[글 조건]
분위기: ${mood}
길이: ${lengthMap[length] || "1000자 내외"}
해시태그: ${tags}
${purpose ? `추가 요청: ${purpose}` : ""}

글 마지막에 해시태그 붙여줘.`;

    } else {
      userPrompt = `아래 조건으로 네이버 블로그 글 써줘:

제목: ${title || "(자유롭게)"}
유형: ${type}
분위기: ${mood}
길이: ${lengthMap[length] || "1000자 내외"}
핵심내용: ${purpose || "(자유롭게)"}
해시태그: ${tags}`;

      if (restaurantName) {
        userPrompt += `\n\n[음식점]\n이름: ${restaurantName}\n위치: ${restaurantAddr || ""}\n→ 웹 검색으로 대표메뉴, 가격대, 특징 찾아서 자연스럽게 녹여줘`;
      }
      if (photoDesc) {
        userPrompt += `\n\n[사진 설명]\n${photoDesc}\n→ 글 중간 [📷 설명] 형식으로 위치 표시해줘`;
      }
      userPrompt += `\n\n글 마지막에 해시태그 붙여줘.`;
    }

    const message = await client.beta.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      betas: ["web-search-2025-03-05"],
    });

    const text = message.content.filter(b => b.type === "text").map(b => b.text).join("");
    return { statusCode: 200, headers, body: JSON.stringify({ text }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
