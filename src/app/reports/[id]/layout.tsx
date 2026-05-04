import { getReportById } from "@/app/actions/reports";
import {
  MobileBottomNavOverrideProvider,
} from "@/components/layout/mobile-bottom-nav-override";
import { getBottomTabIndexForReportType } from "@/lib/nav-items";

export default async function ReportByIdLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}>) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  let tabOverride: number | null = null;

  if (Number.isInteger(id) && id > 0) {
    try {
      const report = await getReportById(id);
      if (report) {
        tabOverride = getBottomTabIndexForReportType(report.type);
      }
    } catch {
      tabOverride = null;
    }
  }

  return (
    <MobileBottomNavOverrideProvider value={tabOverride}>
      {children}
    </MobileBottomNavOverrideProvider>
  );
}
