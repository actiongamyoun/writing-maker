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
    const { title, type, mood, length, purpose, tags, restaurantInfo, photoDescriptions, customStyle } =
      JSON.parse(event.body);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const lengthMap = { "짧게": "500자 내외", "보통": "1000자 내외", "길게": "1500자 이상" };

    const systemPrompt = `너는 네이버 블로그 전문 작가야. 아래 스타일 규칙을 반드시 따라야 해.

[글쓰기 스타일 규칙]
- 절대 AI가 쓴 것처럼 정중하거나 딱딱하게 쓰지 마
- 실제 사람이 쓴 것처럼 구어체 반말로 써
- 문장 끝은 "~했음", "~인듯", "~아님", "~좋음", "~다름", "~임", "~인거 같음", "~추천함", "~였음" 처럼 끝내
- "ㅋㅋ", "ㄹㅇ", "진짜", "솔직히", "개", "존맛" 같은 자연스러운 구어 표현 써도 됨
- 이모지 가끔씩 자연스럽게 사용
- 절대 "안녕하세요", "오늘은 ~에 대해 알아보겠습니다" 같은 AI 표현 금지
- 진짜 내가 직접 경험한 것처럼 생생하게 써
${customStyle ? `\n[추가 말투/표현]\n${customStyle}` : ""}`;

    let userPrompt = `아래 조건으로 네이버 블로그 글 써줘:

제목: ${title || "(자유롭게 정해줘)"}
유형: ${type}
분위기: ${mood}
길이: ${lengthMap[length] || "1000자 내외"}
핵심내용: ${purpose || "(자유롭게)"}
해시태그: ${tags}`;

    if (restaurantInfo) {
      userPrompt += `\n\n[음식점 정보]
이름: ${restaurantInfo.name}
주소: ${restaurantInfo.address || ""}
카테고리: ${restaurantInfo.category || ""}
평점: ${restaurantInfo.rating || ""}
→ 이 정보 자연스럽게 글에 녹여줘. 메뉴 추천이랑 방문 팁도 포함`;
    }

    if (photoDescriptions && photoDescriptions.length > 0) {
      userPrompt += `\n\n[사진 정보]\n${photoDescriptions.join("\n")}\n→ 글 중간에 [📷 사진설명] 형식으로 사진 위치 표시해줘`;
    }

    userPrompt += `\n\n글 마지막에 해시태그 붙여줘.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ text: message.content[0].text }),
    };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
