# 블로그 작가 PWA - 배포 가이드

## 📁 폴더 구조
```
blog-writer/
├── netlify/functions/
│   ├── generate.js       ← Claude AI 글 생성
│   └── search-place.js   ← Google Maps 음식점 검색
├── public/
│   ├── index.html        ← 메인 앱 (PWA)
│   ├── manifest.json     ← PWA 설정
│   └── icons/            ← 앱 아이콘 (직접 추가)
├── .env.example          ← 환경변수 예시
├── .gitignore
├── netlify.toml
└── package.json
```

---

## 🚀 배포 순서

### 1단계. GitHub 업로드
```bash
cd blog-writer
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/your-username/blog-writer.git
git push -u origin main
```

### 2단계. Netlify 배포
1. https://netlify.com 접속 → GitHub 로그인
2. "Add new site" → "Import an existing project"
3. GitHub 저장소 선택 후 Deploy

### 3단계. 환경변수 설정 (필수!)
Netlify 대시보드 → Site settings → Environment variables

| 변수명 | 값 | 필수 |
|--------|-----|------|
| `ANTHROPIC_API_KEY` | sk-ant-... | ✅ 필수 |
| `GOOGLE_MAPS_API_KEY` | AIza... | 음식점 검색 시 필요 |

### 4단계. Redeploy
Deploys → Trigger deploy → Deploy site

---

## 📱 홈화면에 추가

**iPhone (Safari)**
1. Safari에서 앱 URL 열기
2. 하단 공유버튼(□↑) 탭
3. "홈 화면에 추가" 탭
4. 완료! 앱 아이콘으로 실행

**Android (Chrome)**
1. Chrome에서 앱 URL 열기
2. 점3개(⋮) → "홈 화면에 추가"
3. 완료!

---

## 📝 네이버 블로그 올리기 방법
1. 앱에서 글 생성
2. "N 네이버 블로그에 올리기" 버튼 탭
3. 글이 자동 복사됨 + 네이버 앱 글쓰기 화면 열림
4. 본문에 붙여넣기 → 발행!

---

## 🔑 Google Maps API 키 발급 (선택)
1. https://console.cloud.google.com 접속
2. 새 프로젝트 생성
3. Places API 활성화
4. API 키 발급 후 Netlify 환경변수에 입력
