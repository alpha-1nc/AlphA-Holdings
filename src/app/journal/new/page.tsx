import { PageContainer } from "@/components/layout/page-container";
import { JournalNewClient } from "./journal-new-client";

function normalizePeriodParam(period: string | undefined): string | undefined {
  if (period == null) return undefined;
  const trimmed = period.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export default async function JournalNewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const initialPeriod = normalizePeriodParam(params.period);

  return (
    <PageContainer>
      <JournalNewClient initialPeriod={initialPeriod} />
    </PageContainer>
  );
}
