"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Plus, Moon, Sun, Lock, Unlock } from "lucide-react";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { GooeyYearTabs } from "@/components/journal/gooey-year-tabs";
import { CountUp } from "@/components/ui/count-up";
import { Switch } from "@/components/ui/m3-switch";
import {
  AppleLiquidGlassSwitcher,
  type LiquidGlassTheme,
} from "@/components/ui/apple-liquid-glass-switcher";

const DEMO_YEAR_TABS = [
  {
    year: "2026",
    entries: [
      { id: "j-2026-01", period: "2026.01 · 1월 일지", keyword: "리밸런싱" },
      { id: "j-2026-02", period: "2026.02 · 2월 일지", keyword: "현금 비중 확대" },
    ],
  },
  {
    year: "2025",
    entries: [
      { id: "r-2025-q4", period: "2025 Q4 · 분기 리포트", keyword: "반도체 비중" },
      { id: "r-2025-q3", period: "2025 Q3 · 분기 리포트", keyword: "배당 재투자" },
      { id: "j-2025-12", period: "2025.12 · 12월 일지", keyword: "연말 점검" },
      { id: "r-2025-q2", period: "2025 Q2 · 분기 리포트", keyword: "ETF 확대" },
    ],
  },
  {
    year: "2024",
    entries: [
      { id: "r-2024-q4", period: "2024 Q4 · 분기 리포트", keyword: "ISA 전환" },
      { id: "j-2024-06", period: "2024.06 · 6월 일지", keyword: "초기 매수" },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────
   6-1단계 디자인 검수 페이지.
   여기서 색·블러·간격·모션을 한눈에 확인한다.
   실제 화면에는 아직 적용하지 않는다.
   ───────────────────────────────────────────────────────────── */

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
          {title}
        </h2>
        {desc ? <p className="label-dim">{desc}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({
  label,
  value,
  cssValue,
}: {
  label: string;
  value: string;
  cssValue: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-20 w-full rounded-2xl border border-[var(--glass-border)]"
        style={{ background: cssValue }}
      />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
        <span className="label-dim" style={{ textTransform: "none" }}>
          {value}
        </span>
      </div>
    </div>
  );
}

export default function DesignPreviewPage() {
  const [liquidGlassTheme, setLiquidGlassTheme] = useState<LiquidGlassTheme>("light");
  const [swStandard, setSwStandard] = useState(false);
  const [swIcons, setSwIcons] = useState(true);
  const [swCustom, setSwCustom] = useState(true);
  const [swDanger, setSwDanger] = useState(false);

  // 검수 페이지 — 진입 시 강제로 다크 모드 적용 (이탈 시 복구)
  useEffect(() => {
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!hadDark) root.classList.remove("dark");
    };
  }, []);

  return (
    <div className="relative">
      <AmbientBackground />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-20 py-4">
        {/* 1. 타이틀 */}
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Design Preview
          </h1>
          <p className="max-w-xl text-sm text-[var(--text-secondary)]">
            다크 전용 글래스모피즘 디자인 토큰 검수 페이지. 색·블러·간격·모션을 확인한 뒤
            실제 화면에 적용합니다.
          </p>
        </header>

        {/* 2. 색상 팔레트 */}
        <Section title="색상 팔레트" desc="배경·표면·텍스트 위계·상승/하락 (포인트 컬러 없음)">
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            <Swatch label="bg" value="#101216" cssValue="var(--bg)" />
            <Swatch label="surface" value="#15181e" cssValue="var(--surface)" />
            <Swatch label="surface-2" value="#1b1f27" cssValue="var(--surface-2)" />
            <Swatch
              label="text-primary"
              value="#f4f5f7"
              cssValue="var(--text-primary)"
            />
            <Swatch
              label="text-secondary"
              value="rgba(.., 0.58)"
              cssValue="var(--text-secondary)"
            />
            <Swatch
              label="text-tertiary"
              value="rgba(.., 0.34)"
              cssValue="var(--text-tertiary)"
            />
            <Swatch label="up (상승)" value="#4ade80" cssValue="var(--up)" />
            <Swatch label="down (하락)" value="#f87171" cssValue="var(--down)" />
          </div>
        </Section>

        {/* 3. 숫자 타이포 */}
        <Section title="숫자 타이포" desc="num-hero · num-lg · label-dim + CountUp">
          <div className="glass-solid flex flex-col gap-4 p-8">
            <span className="label-dim">평가금액</span>
            <CountUp
              value={7629323}
              prefix="₩"
              className="num-hero text-[var(--text-primary)]"
            />
            <div className="flex items-baseline gap-3">
              <span className="num-lg" style={{ color: "var(--up)" }}>
                +7.99%
              </span>
              <span className="num-lg text-[var(--text-secondary)]">
                +₩564,210
              </span>
            </div>
          </div>
        </Section>

        {/* 4. 글래스 카드 샘플 3종 */}
        <Section
          title="글래스 카드"
          desc="다층 inset 반사 + saturate — 기본(호버 떠오름) · 솔리드 · 대시보드형"
        >
          <div className="grid grid-cols-1 gap-[var(--gap-card)] md:grid-cols-3">
            <div className="glass-card glass-card-hover flex flex-col gap-3 p-[var(--pad-card)]">
              <span className="label-dim">glass-card · hover</span>
              <p className="text-sm text-[var(--text-secondary)]">
                마우스를 올리면 떠오르며 엣지 반사가 강해집니다.
              </p>
            </div>

            <div className="glass-solid flex flex-col gap-3 p-[var(--pad-card)]">
              <span className="label-dim">glass-solid</span>
              <p className="text-sm text-[var(--text-secondary)]">
                동일 반사 기법, 배경 불투명도만 높여 숫자 가독성 확보.
              </p>
            </div>

            <div className="glass-card glass-card-hover flex flex-col gap-2 p-[var(--pad-card)]">
              <span className="label-dim">총 수익</span>
              <CountUp
                value={1284500}
                prefix="₩"
                className="num-lg text-[var(--text-primary)]"
              />
              <span className="text-sm" style={{ color: "var(--up)" }}>
                +18.2%
              </span>
            </div>
          </div>
        </Section>

        {/* 5. 버튼/뱃지 샘플 */}
        <Section
          title="버튼 · 뱃지"
          desc="글래스 primary/ghost (호버 시 떠오름+빛번짐, 클릭 시 눌림) + 상승·하락 뱃지"
        >
          <div className="glass-solid flex flex-wrap items-center gap-4 p-8">
            <button type="button" className="btn-glass">
              <Plus className="size-4" />
              종목 추가
            </button>
            <button type="button" className="btn-glass">
              리포트 열기
              <ArrowRight className="btn-arrow size-4" />
            </button>
            <button type="button" className="btn-glass-ghost">
              고스트 버튼
              <ArrowRight className="btn-arrow size-4" />
            </button>

            <span
              className="rounded-[var(--radius-pill)] px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--up-soft)", color: "var(--up)" }}
            >
              ▲ +7.99%
            </span>
            <span
              className="rounded-[var(--radius-pill)] px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--down-soft)", color: "var(--down)" }}
            >
              ▼ −2.31%
            </span>
          </div>
        </Section>

        {/* 5b. 빛 위 글래스 비교 — 앰비언트 빛 + 다층 반사 */}
        <Section
          title="빛 위 글래스 (반사 비교)"
          desc="앰비언트 빛 덩어리 위에서 glass-card vs glass-solid — inset 하이라이트·표면 띠·호버 떠오름"
        >
          <div className="grid grid-cols-1 gap-[var(--gap-card)] sm:grid-cols-2">
            <div className="glass-card glass-card-hover flex min-h-[220px] flex-col justify-between gap-4 p-[var(--pad-card)]">
              <div className="flex flex-col gap-2">
                <span className="label-dim">glass-card · 투명</span>
                <CountUp
                  value={7629323}
                  prefix="₩"
                  className="num-lg text-[var(--text-primary)]"
                />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-medium" style={{ color: "var(--up)" }}>
                  +7.99%
                </span>
                <span className="text-sm text-[var(--text-secondary)]">+₩564,210</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                뒤 빛이 blur+saturate로 비치고, 상단 표면 하이라이트가 유리 두께를
                만듭니다. 호버로 반사 강화.
              </p>
            </div>
            <div className="glass-solid flex min-h-[220px] flex-col justify-between gap-4 p-[var(--pad-card)]">
              <div className="flex flex-col gap-2">
                <span className="label-dim">glass-solid · 데이터용</span>
                <CountUp
                  value={7629323}
                  prefix="₩"
                  className="num-lg text-[var(--text-primary)]"
                />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-medium" style={{ color: "var(--up)" }}>
                  +7.99%
                </span>
                <span className="text-sm text-[var(--text-secondary)]">+₩564,210</span>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                같은 반사 구조, 배경 8% white로 더 솔리드. 숫자·표 가독성 우선.
              </p>
            </div>
          </div>
        </Section>

        {/* 6. 계좌별 비중 바 */}
        <Section
          title="계좌별 비중 바"
          desc="직투 · ISA · 연금을 하나의 누적 바로 (무채색 톤 차이로 구분)"
        >
          <div className="glass-solid flex flex-col gap-5 p-8">
            <div className="flex h-4 w-full overflow-hidden rounded-[var(--radius-pill)]">
              <div
                style={{ width: "52%", background: "rgba(255,255,255,0.85)" }}
                title="직투"
              />
              <div
                style={{ width: "31%", background: "rgba(255,255,255,0.45)" }}
                title="ISA"
              />
              <div
                style={{ width: "17%", background: "rgba(255,255,255,0.22)" }}
                title="연금"
              />
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              {[
                { label: "직투", pct: "52%", o: 0.85 },
                { label: "ISA", pct: "31%", o: 0.45 },
                { label: "연금", pct: "17%", o: 0.22 },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: `rgba(255,255,255,${r.o})` }}
                  />
                  <span className="text-sm text-[var(--text-primary)]">{r.label}</span>
                  <span className="label-dim" style={{ textTransform: "none" }}>
                    {r.pct}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* 7. 연도 탭 (원본 Gooey) */}
        <Section
          title="연도 탭 (원본 Gooey)"
          desc="흰 패널 + 검은 글씨 대비로 끈적한 gooey 변형. 'Disable filter'로 on/off 비교"
        >
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--glass-border)] bg-black/40">
            <GooeyYearTabs
              years={DEMO_YEAR_TABS}
              onSelect={(id) => console.log("journal select:", id)}
            />
          </div>
        </Section>

        {/* 8. 세그먼트 스위처 (원본 Apple Liquid Glass) */}
        <Section
          title="세그먼트 스위처 (원본 Apple Liquid Glass)"
          desc="light(파랑) · dark(시안) · dim(핑크/보라) — 해/달/노을 3단. 전환 squish·굴절 필터 확인"
        >
          <AppleLiquidGlassSwitcher
            value={liquidGlassTheme}
            onValueChange={setLiquidGlassTheme}
          />
          <p className="text-sm text-[var(--text-secondary)]">
            선택 테마:{" "}
            <span className="text-[var(--text-primary)]">{liquidGlassTheme}</span>
            {" · "}
            light/dark = 파란 계열, dim = 핑크/보라 (원본 CodePen 그대로)
          </p>
        </Section>

        {/* 9. 토글 (원본 MD3 Switch — 오디오 제거) */}
        <Section
          title="토글 (원본 MD3 Switch)"
          desc="스프링 물리·핸들 늘어남·호버 halo·아이콘 모핑 — 오디오 햅틱만 제거(소리 없음)"
        >
          <div className="flex flex-wrap items-center justify-center gap-8 py-4">
            {/* Standard */}
            <div className="group relative flex aspect-[4/3] w-full max-w-[220px] flex-col items-center rounded-[40px] border border-border/50 bg-card text-card-foreground shadow-xl">
              <div className="absolute top-4 space-y-1 px-4 text-center">
                <h3 className="text-xl font-bold tracking-tight">Standard</h3>
                <p className="text-sm font-medium text-muted-foreground">Spring Physics</p>
              </div>
              <div className="absolute bottom-6 scale-[1.5]">
                <Switch checked={swStandard} onCheckedChange={setSwStandard} />
              </div>
            </div>

            {/* Icon Mode */}
            <div className="group relative flex aspect-[4/3] w-full max-w-[220px] flex-col items-center rounded-[40px] border border-border/50 bg-card text-card-foreground shadow-xl">
              <div className="absolute top-4 space-y-1 px-4 text-center">
                <h3 className="text-xl font-bold tracking-tight">Icon Mode</h3>
                <p className="text-sm font-medium text-muted-foreground">Morphing Handle</p>
              </div>
              <div className="absolute bottom-6 scale-[1.5]">
                <Switch checked={swIcons} onCheckedChange={setSwIcons} showIcons />
              </div>
            </div>

            {/* Custom Icons */}
            <div className="group relative flex aspect-[4/3] w-full max-w-[220px] flex-col items-center rounded-[40px] border border-border/50 bg-card text-card-foreground shadow-xl">
              <div className="absolute top-4 space-y-1 px-4 text-center">
                <h3 className="text-xl font-bold tracking-tight">Custom Icons</h3>
                <p className="text-sm font-medium text-muted-foreground">React Node Support</p>
              </div>
              <div className="absolute bottom-6 scale-[1.5]">
                <Switch
                  checked={swCustom}
                  onCheckedChange={setSwCustom}
                  checkedIcon={<Moon className="h-3.5 w-3.5 fill-current" />}
                  uncheckedIcon={<Sun className="h-3.5 w-3.5 fill-current" />}
                  className="peer-checked:bg-indigo-500 peer-checked:border-indigo-500"
                />
              </div>
            </div>

            {/* Destructive */}
            <div className="group relative flex aspect-[4/3] w-full max-w-[220px] flex-col items-center rounded-[40px] border border-border/50 bg-card text-card-foreground shadow-xl">
              <div className="absolute top-4 space-y-1 px-4 text-center">
                <h3 className="text-xl font-bold tracking-tight text-destructive">Destructive</h3>
                <p className="text-sm font-medium text-muted-foreground">Danger Zone UI</p>
              </div>
              <div className="absolute bottom-6 scale-[1.5]">
                <Switch
                  checked={swDanger}
                  onCheckedChange={setSwDanger}
                  variant="destructive"
                  showIcons
                  checkedIcon={<Lock className="h-3 w-3" />}
                  uncheckedIcon={<Unlock className="h-3 w-3" />}
                />
              </div>
            </div>
          </div>
        </Section>

        <footer className="pb-10">
          <p className="label-dim">
            원본 충실도 검수: gooey 변형·액체 굴절·스프링 토글이 원본 데모 수준인지 확인하세요.
          </p>
        </footer>
      </div>
    </div>
  );
}
