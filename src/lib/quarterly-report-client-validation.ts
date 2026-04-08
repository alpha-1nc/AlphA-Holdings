/**
 * 분기별 리포트 작성/수정 — 클라이언트 선검증 (서버 validateReportPayload 와 동일 조건, 안내 문구는 UI용).
 */

export type QuarterlyClientStatus = "DRAFT" | "PUBLISHED";

export type QuarterlyPortfolioRowForValidation = {
  id: string;
  kind: "stock" | "cash";
  ticker: string;
  amount: string;
};

export type QuarterlyNewInvestmentForValidation = {
  id: string;
  originalAmount: number;
};

export type QuarterlyPeriodInput = {
  yearRaw: string;
  quarterRaw: string;
};

export type ValidateQuarterlyReportClientParams = {
  status: QuarterlyClientStatus;
  /** 신규 작성 페이지에서만 전달 */
  period?: QuarterlyPeriodInput;
  usdKrwRaw: string;
  jpyKrwRaw: string;
  usdRate: number;
  jpyRate: number;
  rows: QuarterlyPortfolioRowForValidation[];
  parseAmount: (raw: string) => number;
  newInvestments?: QuarterlyNewInvestmentForValidation[];
  summary: string;
  journal: string;
  strategy: string;
  earningsReview: string;
};

/** DOM id 와 1:1 대응하는 에러 키 */
export const QF = {
  usd: "qf-usd",
  jpy: "qf-jpy",
  year: "qf-year",
  quarter: "qf-quarter",
  portfolio: "qf-portfolio",
  rowTicker: (rowId: string) => `qf-row-${rowId}-ticker`,
  rowAmount: (rowId: string) => `qf-row-${rowId}-amount`,
  newInvAmount: (rowId: string) => `qf-newinv-${rowId}`,
  summary: "qf-summary",
  journal: "qf-journal",
  strategy: "qf-strategy",
  earningsReview: "qf-earnings",
} as const;

const MSG = {
  usd: "USD/KRW 환율을 입력해주세요",
  jpy: "JPY/KRW 환율을 입력해주세요",
  portfolioEmpty: "포트폴리오 스냅샷에 최소 1개 이상 종목을 입력해주세요",
  tickerOnly: "종목 평가액을 입력해주세요",
  amountOnly: "종목명을 입력해주세요",
  cashAmount: "현금 평가액을 입력해주세요",
  newInvZero: "신규 투입금 금액을 입력하거나 해당 행을 삭제해주세요",
  summary: "이번 분기 시장 흐름을 요약해주세요",
  journal: "이번 분기 느낀 점을 기록해주세요",
  strategy: "다음 분기 전략을 작성해주세요",
  earningsReview: "보유 종목의 이번 분기 실적을 기록해주세요",
  year: "연도를 입력해주세요",
  quarter: "분기를 선택해주세요",
  yearRange: "올바른 연도를 입력해주세요",
  quarterRange: "올바른 분기를 선택해주세요",
} as const;

function isRateMissing(raw: string, rate: number): boolean {
  if (!String(raw).trim()) return true;
  if (!Number.isFinite(rate) || rate < 0) return true;
  return rate <= 0;
}

/**
 * 첫 스크롤 대상 필드 id (QF.* 값 중 하나).
 */
export function getFirstQuarterlyErrorFieldId(
  errors: Record<string, string>,
  rowIdsInOrder: string[],
  newInvIdsInOrder: string[],
): string | null {
  const order: string[] = [];
  if (errors[QF.year]) order.push(QF.year);
  if (errors[QF.quarter]) order.push(QF.quarter);
  if (errors[QF.usd]) order.push(QF.usd);
  if (errors[QF.jpy]) order.push(QF.jpy);
  if (errors[QF.portfolio]) order.push(QF.portfolio);
  for (const id of rowIdsInOrder) {
    const tk = QF.rowTicker(id);
    const am = QF.rowAmount(id);
    if (errors[tk]) order.push(tk);
    if (errors[am]) order.push(am);
  }
  for (const id of newInvIdsInOrder) {
    const k = QF.newInvAmount(id);
    if (errors[k]) order.push(k);
  }
  if (errors[QF.summary]) order.push(QF.summary);
  if (errors[QF.journal]) order.push(QF.journal);
  if (errors[QF.strategy]) order.push(QF.strategy);
  if (errors[QF.earningsReview]) order.push(QF.earningsReview);
  return order[0] ?? null;
}

export function validateQuarterlyReportClient(
  p: ValidateQuarterlyReportClientParams,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const { rows, parseAmount, newInvestments = [], status } = p;

  if (p.period) {
    const y = p.period.yearRaw.trim();
    const q = p.period.quarterRaw.trim();
    if (!y) errors[QF.year] = MSG.year;
    else {
      const yearNum = parseInt(y, 10);
      if (Number.isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        errors[QF.year] = MSG.yearRange;
      }
    }
    if (!q) errors[QF.quarter] = MSG.quarter;
    else {
      const quarterNum = parseInt(q, 10);
      if (Number.isNaN(quarterNum) || quarterNum < 1 || quarterNum > 4) {
        errors[QF.quarter] = MSG.quarterRange;
      }
    }
  }

  if (isRateMissing(p.usdKrwRaw, p.usdRate)) errors[QF.usd] = MSG.usd;
  if (isRateMissing(p.jpyKrwRaw, p.jpyRate)) errors[QF.jpy] = MSG.jpy;

  let hasInvalidPartial = false;

  for (const r of rows) {
    const amt = parseAmount(r.amount);
    if (r.kind === "cash") {
      if (amt <= 0) {
        errors[QF.rowAmount(r.id)] = MSG.cashAmount;
        hasInvalidPartial = true;
      }
      continue;
    }
    const hasTicker = r.ticker.trim().length > 0;
    const hasAmount = amt > 0;
    if (hasTicker && !hasAmount) {
      errors[QF.rowAmount(r.id)] = MSG.tickerOnly;
      hasInvalidPartial = true;
    } else if (!hasTicker && hasAmount) {
      errors[QF.rowTicker(r.id)] = MSG.amountOnly;
      hasInvalidPartial = true;
    }
  }

  const validRows = rows.filter((row) => {
    const a = parseAmount(row.amount);
    if (row.kind === "cash") return a > 0;
    return row.ticker.trim().length > 0 && a > 0;
  });

  if (validRows.length === 0 && !hasInvalidPartial) {
    errors[QF.portfolio] = MSG.portfolioEmpty;
  }

  for (const inv of newInvestments) {
    if ((inv.originalAmount || 0) <= 0) {
      errors[QF.newInvAmount(inv.id)] = MSG.newInvZero;
    }
  }

  if (status === "PUBLISHED") {
    if (!p.summary.trim()) errors[QF.summary] = MSG.summary;
    if (!p.journal.trim()) errors[QF.journal] = MSG.journal;
    if (!p.strategy.trim()) errors[QF.strategy] = MSG.strategy;
    if (!p.earningsReview.trim()) errors[QF.earningsReview] = MSG.earningsReview;
  }

  return errors;
}
