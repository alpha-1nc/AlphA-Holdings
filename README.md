# AlphA Holdings

포트폴리오 관리 및 투자 리포트 작성 플랫폼

## 주요 기능

- 📊 포트폴리오 관리 (다중 통화 지원: USD, KRW, JPY)
- 📝 월간/분기별 투자 리포트 작성
- 💼 계좌별 자산 관리 (미국 직투, ISA, 일본 직투, 현금)
- 📈 포트폴리오 시각화 (도넛 차트)
- 🔍 티커 검색 및 메타데이터 관리

## 기술 스택

- **Framework**: Next.js 16
- **Database**: Prisma + SQLite
- **UI**: React 19, Tailwind CSS, shadcn/ui
- **Charts**: Recharts

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 참고하여 `.env` 파일을 생성하세요:

```bash
cp .env.example .env
```

`.env` 파일에 다음 내용을 추가하세요:

```env
DATABASE_URL="file:./dev.db"
NODE_ENV="development"
```

### 3. 데이터베이스 마이그레이션

```bash
npx prisma migrate dev
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 프로젝트 구조

```
├── prisma/              # Prisma 스키마 및 마이그레이션
├── src/
│   ├── app/            # Next.js App Router 페이지 및 API
│   ├── components/     # React 컴포넌트
│   ├── lib/            # 유틸리티 함수 및 설정
│   └── constants/      # 상수 정의
└── public/             # 정적 파일
```

## 주의사항

- **데이터베이스 파일**: `prisma/dev.db`는 로컬에만 저장되며 Git에 커밋되지 않습니다.
- **환경 변수**: `.env` 파일은 절대 커밋하지 마세요. `.env.example`을 참고하세요.
- **GitHub 토큰**: `git remote` URL에 토큰을 넣지 마세요. `https://github.com/...` 형태만 사용하고, 푸시 시 macOS 키체인·Git Credential Manager·SSH 키로 인증합니다. 예전에 URL에 넣었던 토큰은 [GitHub → Settings → Developer settings](https://github.com/settings/tokens)에서 **즉시 폐기**하세요.
- **Pre-commit 훅**: 이 저장소를 클론한 뒤 한 번 실행하면, 커밋에 `ghp_` / `github_pat_` 패턴이 섞이는 것을 막습니다.

```bash
npm run git:hooks
```

- **배포(Vercel 등)**: API 키·`DATABASE_URL`은 호스팅 콘솔의 **Environment Variables**에만 넣고, 저장소에는 넣지 않습니다. 코드 변경 후 배포하면 콘솔에 설정한 값이 그대로 적용됩니다.

## 라이선스

Private

안전하게 푸시하는 방법:
# 1. 변경된 파일 확인
git status

# 2. 데이터베이스 파일이 있는지 확인 (없어야 정상)
git status | grep "\.db"

# 3. 스테이징
git add .

# 4. 다시 한 번 확인 (데이터베이스 파일이 없어야 함)
git status

# 5. 커밋 및 푸시
git commit -m "커밋 메시지"
git push