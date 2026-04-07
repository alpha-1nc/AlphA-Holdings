import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TopNavbar } from "@/components/layout/top-navbar";
import { MobileBottomTabBar } from "@/components/layout/mobile-bottom-tab-bar";
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
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "256x256" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
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
          <div className="flex min-h-screen min-w-0 flex-col">
            <TopNavbar />
            <main className="flex-1 px-4 pb-24 pt-6 md:px-10 md:py-10 md:pb-10">
              {children}
            </main>
            <MobileBottomTabBar />
          </div>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
