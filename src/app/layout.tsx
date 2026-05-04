import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
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

/** 모바일 헤더 프로필 이니셜 전용 — 좁은 고딕 display */
const oswaldProfileMonogram = Oswald({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-profile-monogram",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
  ],
};

export const metadata: Metadata = {
  title: "AlphA Holdings — Report Archive",
  description: "스냅샷 기반 개인 투자 리포트 아카이브",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AlphA Holdings",
  },
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
    <html
      lang="ko"
      className={`${inter.variable} ${oswaldProfileMonogram.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="overflow-x-hidden bg-neutral-50 font-sans antialiased dark:bg-neutral-950">
        <ThemeProvider>
          <div className="flex min-h-screen min-w-0 flex-col">
            <TopNavbar />
            {/* 모바일: 플로팅 탭 + 홈 인디케이터(safe-area) — md 이상에서는 일반 패딩 */}
            {/* 모바일: 플로팅 도크 + 홈바 여유까지 본문이 가리지 않게 */}
            <main className="flex-1 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+8rem)] pt-6 md:px-10 md:pb-10 md:py-10">
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
