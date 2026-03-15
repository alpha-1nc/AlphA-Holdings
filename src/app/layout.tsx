import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopNavbar } from "@/components/layout/top-navbar";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AlphA Holdings — Report Archive",
  description: "스냅샷 기반 개인 투자 리포트 아카이브",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={inter.variable} suppressHydrationWarning>
      <body className="overflow-x-hidden bg-neutral-50 font-sans antialiased dark:bg-neutral-950">
        <ThemeProvider>
          <div className="flex min-h-screen flex-col">
            <TopNavbar />
            <main className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
          </div>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
