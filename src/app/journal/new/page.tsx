import { JournalNewClient } from "./journal-new-client";

export default async function JournalNewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  return <JournalNewClient initialPeriod={params.period} />;
}
