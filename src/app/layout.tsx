import type { Metadata, Viewport } from "next";
import { Geist, Inter, Oswald } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/** uitripled stocks-dashboard 레퍼런스와 동일한 UI 폰트 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
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
      className={`${inter.variable} ${geistSans.variable} ${oswaldProfileMonogram.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="overflow-x-hidden bg-background font-sans antialiased">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
