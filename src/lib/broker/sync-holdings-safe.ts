import { syncHoldings } from "@/lib/broker/sync-engine";
import { TossApiError } from "@/lib/broker/toss-client";

const DEFAULT_RETRY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableSyncError(error: unknown): boolean {
  if (error instanceof TossApiError) {
    return error.status === 429 || error.message.includes("EGW00133");
  }
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("429") || msg.includes("EGW00133");
}

function retryDelayMs(error: unknown): number {
  if (error instanceof TossApiError && error.retryAfterSec != null && error.retryAfterSec > 0) {
    return error.retryAfterSec * 1000;
  }
  return DEFAULT_RETRY_MS;
}

export type SyncHoldingsSafeResult =
  | { ok: true; usdRate: number }
  | { ok: false; error: string };

/** 저장 시 1회 동기화. 429/EGW00133 시 Retry-After(또는 1.5s) 후 1회 재시도 */
export async function syncHoldingsSafe(): Promise<SyncHoldingsSafeResult> {
  try {
    const result = await syncHoldings();
    return { ok: true, usdRate: result.usdRate };
  } catch (firstError) {
    if (!isRetryableSyncError(firstError)) {
      const msg = firstError instanceof Error ? firstError.message : String(firstError);
      console.warn("[journal-sync] 동기화 실패:", msg);
      return { ok: false, error: msg };
    }

    const waitMs = retryDelayMs(firstError);
    console.warn(`[journal-sync] rate limit — ${waitMs}ms 후 1회 재시도`);
    await sleep(waitMs);

    try {
      const result = await syncHoldings();
      return { ok: true, usdRate: result.usdRate };
    } catch (retryError) {
      const msg = retryError instanceof Error ? retryError.message : String(retryError);
      console.warn("[journal-sync] 재시도 후에도 실패:", msg);
      return { ok: false, error: msg };
    }
  }
}
