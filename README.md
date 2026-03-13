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

## 라이선스

Private
