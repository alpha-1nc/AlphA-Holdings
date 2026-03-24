import type { NextConfig } from "next";

/**
 * Cloudflare / 리버스 프록시 뒤에서 접속할 때 브라우저 Origin(공개 도메인)과
 * 앱이 보는 Host가 달라 Server Actions(AI 생성 등)가 막히는 경우가 있음.
 * 빌드 시점에 .env.production 등에 SERVER_ACTION_ALLOWED_ORIGINS 를 두면 next build 가 읽음.
 */
function parseServerActionAllowedOrigins(): string[] | undefined {
  const raw = process.env.SERVER_ACTION_ALLOWED_ORIGINS?.trim();
  if (!raw) return undefined;
  const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
}

const serverActionAllowedOrigins = parseServerActionAllowedOrigins();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "unavatar.io",
        pathname: "/**",
      },
    ],
  },
  ...(serverActionAllowedOrigins && {
    experimental: {
      serverActions: {
        allowedOrigins: serverActionAllowedOrigins,
      },
    },
  }),
};

export default nextConfig;
