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
      restaurantName, restaurantAddr, customStyle,
      trendMode, trendingVideos,
      photos
    } = JSON.parse(event.body);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const lengthMap = { "짧게": "800자 내외", "보통": "1500자 내외", "길게": "2500자 이상" };

    const systemPrompt = `너는 네이버 블로그 SEO 전문 작가야. 아래 규칙을 반드시 따라.

[글쓰기 스타일]
- AI 냄새 절대 금지. 실제 사람이 쓴 구어체 반말
- 문장 끝: ~했음, ~인듯, ~아님, ~좋음, ~임, ~추천함, ~였음
- ㅋㅋ, ㄹㅇ, 진짜, 솔직히 등 자연스럽게 사용
- 이모지 가끔 자연스럽게 사용
- "안녕하세요", "오늘은 ~알아보겠습니다" 절대 금지
${customStyle ? `\n[추가 말투]\n${customStyle}` : ""}

[네이버 SEO 규칙 - 반드시 준수]
1. 제목에 핵심 키워드 반드시 포함
2. 첫 문단에 핵심 키워드 2~3회 자연스럽게 포함
3. 소제목(##)마다 키워드 변형어 포함
4. 글 중간중간 키워드 관련 검색어 자연스럽게 녹이기
5. 객관적 정보(수치, 통계, 사실) 반드시 포함
6. 문단은 3~5줄로 나눠서 가독성 높이기
7. 마지막에 핵심 키워드 포함한 요약 문단 추가
8. 해시태그는 핵심 키워드 위주로 15개 이상`;

    let userPrompt;

    if (trendMode === "auto" && trendingVideos?.length) {
      const videoList = trendingVideos.map((v, i) => `${i+1}. "${v.title}" (${v.channel})`).join("\n");
      userPrompt = `지금 유튜브 한국 급상승 Top5:\n${videoList}\n\n아래 순서로 진행해줘:
STEP 1: 블로그 글로 쓰기 좋은 주제 1개 선택
STEP 2: 해당 주제로 네이버 상위노출 5개 글 구조 분석 (웹검색)
STEP 3: 해당 주제 관련 객관적 정보/수치/사실 웹검색으로 수집
STEP 4: 분석한 구조와 수집한 정보로 블로그 글 작성

[글 조건]
분위기: ${mood}
길이: ${lengthMap[length] || "1500자 내외"}
해시태그: ${tags}
${purpose ? `추가 요청: ${purpose}` : ""}

글 마지막에 해시태그 15개 이상 붙여줘.`;

    } else {
      const keyword = title || purpose || restaurantName || "주제";
      userPrompt = `아래 순서로 네이버 블로그 글 작성해줘:

STEP 1: "${keyword}" 키워드로 네이버 상위노출 글 5개 구조/형식 분석 (웹검색)
STEP 2: "${keyword}" 관련 객관적 정보, 수치, 팁 웹검색으로 수집
${restaurantName ? `STEP 3: "${restaurantName}" 음식점 정보 웹검색 (메뉴, 가격, 특징)\n` : ""}
[글 조건]
제목: ${title || "(키워드 포함해서 자유롭게)"}
유형: ${type}
분위기: ${mood}
길이: ${lengthMap[length] || "1500자 내외"}
핵심내용: ${purpose || "(자유롭게)"}
해시태그: ${tags}
${restaurantName ? `음식점: ${restaurantName} / 위치: ${restaurantAddr || ""}` : ""}

글 마지막에 핵심 키워드 포함 해시태그 15개 이상 붙여줘.`;
    }

    const userContent = [];

    if (photos && photos.length > 0) {
      userPrompt += `\n\n[사진 ${photos.length}장 첨부됨]
→ 각 사진을 직접 분석해서:
  1. 사진에서 느껴지는 감정/분위기를 글에 자연스럽게 녹여줘
  2. 사진 속 음식/장소/상황을 생생하게 묘사해줘
  3. 글 중간 적절한 위치에 [📷 사진설명] 형식으로 사진 위치 표시해줘`;

      photos.forEach(p => {
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: p.type || "image/jpeg", data: p.data }
        });
      });
    }

    userContent.push({ type: "text", text: userPrompt });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
         });

    const text = message.content.filter(b => b.type === "text").map(b => b.text).join("");
    return { statusCode: 200, headers, body: JSON.stringify({ text }) };

  } catch (err) {
    console.error("generate error:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
