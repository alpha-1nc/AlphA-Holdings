# 종목 로고 (로컬 PNG)

이 폴더는 **종목(티커/종목코드)별 로고 PNG**를 직접 보관하는 곳입니다.  
Next.js `public` 디렉터리이므로 브라우저에서는 `/logos/{파일명}` 으로 접근할 수 있습니다.

> 예: `public/logos/GOOGL.png` → `https://your-domain/logos/GOOGL.png`

---

## 파일명 규칙

| 구분 | 규칙 | 예시 |
|------|------|------|
| 미국·글로벌 주식 | **티커(심볼) 대문자** + `.png` | `UNH.png`, `GOOGL.png`, `META.png`, `QCOM.png` |
| 한국 ETF·주식 | **종목코드(6자리)** + `.png` | `0015B0.png`, `360750.png`, `379810.png` |

- 공백·특수문자 없이 **DB `Holding.ticker` / `PortfolioItem.ticker` 값과 동일**하게 맞춥니다.
- 확장자는 소문자 `.png` 권장.

### 코드와의 매칭 키

현재 앱은 로고를 찾을 때 **`ticker` 필드**를 키로 사용합니다.

- `Holding`, `PortfolioItem`, `WatchlistItem`, `PortfolioStrategy` 모두 `ticker` 컬럼 기준.
- 통화(`USD`/`KRW`)나 출처(`TOSS`/`KIS`)별로 파일명이 달라지지 **않습니다**.
- FMP 자동 fetch(`getFmpLogoUrl`)도 `ticker.toUpperCase()` 로 URL을 만듭니다.

> **현재 코드 상태:** `/logos/` 로컬 경로를 읽는 로직이 **연결되어 있습니다**.  
> `src/lib/ticker-logo.ts`의 `getLocalLogoUrl()`이 `/logos/{TICKER}.png` 경로를 반환하며,  
> `ticker-avatar.tsx`와 `stock-logo.tsx`에서 이 경로를 우선 사용합니다.  
> 실패 시(파일이 없거나 로드 실패) **이니셜 원형 fallback**으로 넘어갑니다.

---

## 권장 이미지 규격

- **비율:** 정사각형 (1:1)
- **해상도:** 256×256 또는 512×512 px
- **배경:** 투명 (PNG alpha)
- **여백:** 종목 로고가 원/둥근 사각형 안에 꽉 차도록 — 불필요한 패딩 최소화
- **스타일:** 토스·증권앱처럼 단색/투명 배경 + 선명한 심볼

UI(`TickerAvatar`)는 로고를 원형 컨테이너 **76% 크기**로 `object-contain` 표시합니다.

---

## 로고가 없을 때 (Fallback)

PNG 파일이 없거나, URL 로드에 실패하면 UI가 자동으로 **이니셜 원(avatar)** 을 표시합니다.

- 티커에서 영문·숫자·한글만 추출 후 앞 1~2글자 사용 (예: `GOOGL` → `GO`, `0015B0` → `00`)
- 별도 placeholder 이미지를 넣을 필요 없음

---

## 한국 ETF 로고 가이드

한국 상장 ETF는 기업 단일 로고가 없는 경우가 많습니다. 아래 중 하나를 권장합니다.

1. **운용사 브랜드 로고** — TIGER(미래에셋), KODEX(삼성), KoAct(삼성액티브) 등
2. **이니셜 fallback** — 로고 파일 없이 `36`, `37`, `00` 등 이니셜만 사용 (깔끔함 유지)

운용사 로고를 쓸 경우에도 **파일명은 종목코드**(`360750.png` 등)를 유지합니다.

---

## 준비할 로고 체크리스트

프로필: **AlphA Holdings Portfolio** (`.env`의 `SYNC_PROFILE_ID`로 지정)  
값은 환경마다 다름 — 로컬 DB와 서버 DB의 Profile ID가 서로 다르므로  
각 환경의 `.env`에서 확인할 것.  
기준: `Holding` 테이블 현재 보유 종목 (2026-06-19)

| 파일명 | 종목명 | 통화 | 계좌 | 출처 | 준비 |
|--------|--------|------|------|------|------|
| `0015B0.png` | KoAct 미국나스닥성장기업액티브 | KRW | ISA | KIS | ☐ |
| `360750.png` | TIGER 미국S&P500 | KRW | ISA | KIS | ☐ |
| `379810.png` | KODEX 미국나스닥100 | KRW | ISA | KIS | ☐ |
| `GOOGL.png` | 알파벳 A | USD | 미국 직투 | TOSS | ☐ |
| `META.png` | 메타 | USD | 미국 직투 | TOSS | ☐ |
| `QCOM.png` | 퀄컴 | USD | 미국 직투 | TOSS | ☐ |
| `UNH.png` | 유나이티드헬스 그룹 | USD | 미국 직투 | TOSS | ☐ |

**총 7종목** — PNG를 이 폴더에 넣으면 위 파일명과 1:1 대응됩니다.

---

## 빠른 추가 방법

1. PNG 준비 (위 규격)
2. `public/logos/{TICKER}.png` 로 저장
3. (코드 연동 후) 앱 새로고침 — 캐시 이슈 시 hard refresh

`.gitignore`에 로고 PNG를 제외하지 않았다면 Git에 함께 커밋할 수 있습니다.
