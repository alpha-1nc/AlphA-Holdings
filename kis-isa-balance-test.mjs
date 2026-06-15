#!/usr/bin/env node
/**
 * KIS(한국투자증권) ISA 잔고조회 테스트
 * ------------------------------------------------------------------
 * 목적: ISA 계좌가 국내주식 잔고조회 API(TTTC8434R)로 조회되는지 확인.
 *       → 되면 AlphA Holdings에서 ISA 자동 동기화 가능.
 *       → 안 되면(빈 응답/에러) ISA는 수동 기재로 확정.
 *
 * ⚠️ 보안: appkey / appsecret / 계좌번호는 절대 코드에 직접 쓰지 말고
 *          아래처럼 환경변수로 넣어서 실행할 것. 결과를 채팅에 붙일 때도
 *          키·계좌번호·평가금액 같은 실제 값은 빼고 "됐다/안됐다 + 종목 개수"만 공유.
 *
 * 실행 (Node 18+ 필요, 내장 fetch 사용):
 *   KIS_APP_KEY=xxxx \
 *   KIS_APP_SECRET=xxxx \
 *   KIS_CANO=12345678 \         # ISA 계좌번호 앞 8자리
 *   KIS_ACNT_PRDT_CD=22 \       # ISA 계좌번호 뒤 2자리(상품코드)
 *   node kis-isa-balance-test.mjs
 * ------------------------------------------------------------------
 */

const BASE = "https://openapi.koreainvestment.com:9443"; // 실전투자 도메인

const { KIS_APP_KEY, KIS_APP_SECRET, KIS_CANO, KIS_ACNT_PRDT_CD } = process.env;

if (!KIS_APP_KEY || !KIS_APP_SECRET || !KIS_CANO || !KIS_ACNT_PRDT_CD) {
  console.error(
    "❌ 환경변수 누락. KIS_APP_KEY, KIS_APP_SECRET, KIS_CANO, KIS_ACNT_PRDT_CD 모두 필요합니다."
  );
  process.exit(1);
}

// ── 1) 접근토큰 발급 ────────────────────────────────────────────────
// 주의: KIS 토큰은 24h 유효하고 발급 호출에 throttle(분당 1회 수준)이 있음.
//       이 테스트는 1회용이라 캐싱 없이 바로 발급함.
async function getAccessToken() {
  const res = await fetch(`${BASE}/oauth2/tokenP`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: KIS_APP_KEY,
      appsecret: KIS_APP_SECRET,
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`토큰 발급 실패: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// ── 2) 국내주식 잔고조회 (TTTC8434R) ──────────────────────────────
async function inquireBalance(token) {
  const params = new URLSearchParams({
    CANO: KIS_CANO,
    ACNT_PRDT_CD: KIS_ACNT_PRDT_CD,
    AFHR_FLPR_YN: "N",        // 시간외단일가 여부
    OFL_YN: "",               // 오프라인 여부(미사용)
    INQR_DVSN: "00",          // 00: 전체
    UNPR_DVSN: "01",          // 단가구분 기본
    FUND_STTL_ICLD_YN: "N",   // 펀드결제분 포함여부
    FNCG_AMT_AUTO_RDPT_YN: "N",
    PRCS_DVSN: "00",          // 00: 전일매매 포함
    CTX_AREA_FK100: "",
    CTX_AREA_NK100: "",
  });

  const res = await fetch(
    `${BASE}/uapi/domestic-stock/v1/trading/inquire-balance?${params}`,
    {
      method: "GET",
      headers: {
        "content-type": "application/json; charset=utf-8",
        authorization: `Bearer ${token}`,
        appkey: KIS_APP_KEY,
        appsecret: KIS_APP_SECRET,
        tr_id: "TTTC8434R", // 실전 국내주식 잔고조회
        custtype: "P",       // 개인
      },
    }
  );
  return res.json();
}

// ── 실행 ────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log("🔑 토큰 발급 중...");
    const token = await getAccessToken();
    console.log("✅ 토큰 발급 성공\n");

    console.log("📊 ISA 잔고조회 중...");
    const result = await inquireBalance(token);

    // rt_cd: "0" = 정상
    if (result.rt_cd !== "0") {
      console.log("\n⚠️  API가 정상코드(0)를 안 줬어요. ISA 미지원이거나 파라미터 문제일 수 있음.");
      console.log(`    msg_cd: ${result.msg_cd}`);
      console.log(`    msg1  : ${result.msg1}`);
      console.log("\n👉 이 경우 ISA는 이 API로는 자동 조회 불가 → 수동 기재로 확정.");
      return;
    }

    const holdings = result.output1 ?? [];
    const summary = result.output2?.[0] ?? {};

    console.log(`\n✅ 정상 응답 (rt_cd=0)`);
    console.log(`   보유 종목 수: ${holdings.length}건`);

    if (holdings.length === 0) {
      console.log("\n⚠️  정상 응답이지만 보유종목이 0건이에요.");
      console.log("    → ISA에 주식 보유가 있는데도 0건이면, 이 API가 ISA를 안 잡는다는 신호.");
      console.log("    → 진짜 비어있는 거면 ETF/주식 1주 넣고 다시 테스트해보면 확실해짐.");
      return;
    }

    console.log("\n📈 보유 종목 (로컬 확인용 — 채팅엔 붙이지 말 것):");
    for (const h of holdings) {
      // 종목명 / 보유수량 / 평가금액
      console.log(
        `   - ${h.prdt_name} | ${h.hldg_qty}주 | 평가 ${h.evlu_amt}원 | 손익 ${h.evlu_pfls_amt}원`
      );
    }
    console.log("\n🎉 ISA 자동 동기화 가능! → AlphA Holdings에 KIS(source=KIS) 연동 진행하면 됨.");
    console.log("   (채팅엔 '됐어, N종목 나옴'만 알려주면 충분해. 종목명·금액은 빼고.)");
  } catch (e) {
    console.error("\n❌ 실패:", e.message);
    console.error("   토큰 발급 단계에서 막혔으면 appkey/secret 또는 실전계좌 서비스 신청 여부 확인.");
  }
})();
