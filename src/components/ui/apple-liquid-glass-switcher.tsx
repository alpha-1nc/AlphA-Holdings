"use client";

import { useId, useState, type ReactNode } from "react";
import "./apple-liquid-glass-switcher.css";
import { LIQUID_GLASS_MAP_HREF } from "./apple-liquid-glass-filter-data";

/* ──────────────────────────────────────────────────────────────
   Apple Liquid Glass Theme Switcher — 원본(Den Dionigi, CodePen JodwNzX) 100% 복원.
   light / dark / dim 3단 · 해/달/노을 아이콘 · c-previous squish · SVG displacement.
   ────────────────────────────────────────────────────────────── */

export type LiquidGlassTheme = "light" | "dark" | "dim";

const THEMES: { value: LiquidGlassTheme; cOption: "1" | "2" | "3" }[] = [
  { value: "light", cOption: "1" },
  { value: "dark", cOption: "2" },
  { value: "dim", cOption: "3" },
];

function cOptionOf(theme: LiquidGlassTheme): "1" | "2" | "3" {
  return THEMES.find((t) => t.value === theme)?.cOption ?? "1";
}

function SunIcon() {
  return (
    <svg
      className="switcher__icon"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 36 36"
      aria-hidden
    >
      <path
        fill="var(--c)"
        fillRule="evenodd"
        d="M18 12a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
        clipRule="evenodd"
      />
      <path
        fill="var(--c)"
        d="M17 6.038a1 1 0 1 1 2 0v3a1 1 0 0 1-2 0v-3ZM24.244 7.742a1 1 0 1 1 1.618 1.176L24.1 11.345a1 1 0 1 1-1.618-1.176l1.763-2.427ZM29.104 13.379a1 1 0 0 1 .618 1.902l-2.854.927a1 1 0 1 1-.618-1.902l2.854-.927ZM29.722 20.795a1 1 0 0 1-.619 1.902l-2.853-.927a1 1 0 1 1 .618-1.902l2.854.927ZM25.862 27.159a1 1 0 0 1-1.618 1.175l-1.763-2.427a1 1 0 1 1 1.618-1.175l1.763 2.427ZM19 30.038a1 1 0 0 1-2 0v-3a1 1 0 1 1 2 0v3ZM11.755 28.334a1 1 0 0 1-1.618-1.175l1.764-2.427a1 1 0 1 1 1.618 1.175l-1.764 2.427ZM6.896 22.697a1 1 0 1 1-.618-1.902l2.853-.927a1 1 0 1 1 .618 1.902l-2.853.927ZM6.278 15.28a1 1 0 1 1 .618-1.901l2.853.927a1 1 0 1 1-.618 1.902l-2.853-.927ZM10.137 8.918a1 1 0 0 1 1.618-1.176l1.764 2.427a1 1 0 0 1-1.618 1.176l-1.764-2.427Z"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="switcher__icon"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 36 36"
      aria-hidden
    >
      <path
        fill="var(--c)"
        d="M12.5 8.473a10.968 10.968 0 0 1 8.785-.97 7.435 7.435 0 0 0-3.737 4.672l-.09.373A7.454 7.454 0 0 0 28.732 20.4a10.97 10.97 0 0 1-5.232 7.125l-.497.27c-5.014 2.566-11.175.916-14.234-3.813l-.295-.483C5.53 18.403 7.13 11.93 12.017 8.77l.483-.297Zm4.234.616a8.946 8.946 0 0 0-2.805.883l-.429.234A9 9 0 0 0 10.206 22.5l.241.395A9 9 0 0 0 22.5 25.794l.416-.255a8.94 8.94 0 0 0 2.167-1.99 9.433 9.433 0 0 1-2.782-.313c-5.043-1.352-8.036-6.535-6.686-11.578l.147-.491c.242-.745.573-1.44.972-2.078Z"
      />
    </svg>
  );
}

function SunsetIcon() {
  return (
    <svg
      className="switcher__icon"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 36 36"
      aria-hidden
    >
      <path
        fill="var(--c)"
        d="M5 21a1 1 0 0 1 1-1h24a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1ZM12 25a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H13a1 1 0 0 1-1-1ZM15 29a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2h-4a1 1 0 0 1-1-1ZM18 13a6 6 0 0 1 5.915 7h-2.041A4.005 4.005 0 0 0 18 15a4 4 0 0 0-3.874 5h-2.041A6 6 0 0 1 18 13ZM17 7.038a1 1 0 1 1 2 0v3a1 1 0 0 1-2 0v-3ZM24.244 8.742a1 1 0 1 1 1.618 1.176L24.1 12.345a1 1 0 1 1-1.618-1.176l1.763-2.427ZM29.104 14.379a1 1 0 0 1 .618 1.902l-2.854.927a1 1 0 1 1-.618-1.902l2.854-.927ZM6.278 16.28a1 1 0 1 1 .618-1.901l2.853.927a1 1 0 1 1-.618 1.902l-2.853-.927ZM10.137 9.918a1 1 0 0 1 1.618-1.176l1.764 2.427a1 1 0 0 1-1.618 1.176l-1.764-2.427Z"
      />
    </svg>
  );
}

const THEME_ICONS: Record<LiquidGlassTheme, ReactNode> = {
  light: <SunIcon />,
  dark: <MoonIcon />,
  dim: <SunsetIcon />,
};

interface AppleLiquidGlassSwitcherProps {
  value?: LiquidGlassTheme;
  defaultValue?: LiquidGlassTheme;
  onValueChange?: (value: LiquidGlassTheme) => void;
}

export function AppleLiquidGlassSwitcher({
  value,
  defaultValue = "light",
  onValueChange,
}: AppleLiquidGlassSwitcherProps) {
  const groupName = useId();
  const initialTheme = value ?? defaultValue;

  const [internalTheme, setInternalTheme] = useState<LiquidGlassTheme>(initialTheme);
  const activeTheme = value ?? internalTheme;

  const [previousOption, setPreviousOption] = useState<"1" | "2" | "3">(() =>
    cOptionOf(initialTheme)
  );

  const handleChange = (newTheme: LiquidGlassTheme) => {
    setPreviousOption(cOptionOf(activeTheme));
    if (onValueChange) {
      onValueChange(newTheme);
    } else {
      setInternalTheme(newTheme);
    }
  };

  return (
    <div
      className="liquid-glass-theme-wrapper relative overflow-hidden rounded-2xl"
      data-theme={activeTheme}
    >
      <div className="liquid-glass-demo-backdrop" aria-hidden />
      <div className="liquid-glass-theme-stage">
        <fieldset
          className="switcher"
          {...({ "c-previous": previousOption } as Record<string, string>)}
        >
          <legend className="switcher__legend">Choose theme</legend>

          {THEMES.map(({ value: themeValue, cOption }) => (
            <label key={themeValue} className="switcher__option">
              <input
                className="switcher__input"
                type="radio"
                name={groupName}
                value={themeValue}
                checked={activeTheme === themeValue}
                onChange={() => handleChange(themeValue)}
                {...({ "c-option": cOption } as Record<string, string>)}
              />
              {THEME_ICONS[themeValue]}
            </label>
          ))}

          <div className="switcher__filter">
            <svg>
              <filter id="switcher" primitiveUnits="objectBoundingBox">
                <feImage
                  result="map"
                  width="100%"
                  height="100%"
                  x="0"
                  y="0"
                  href={LIQUID_GLASS_MAP_HREF}
                />
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.04" result="blur" />
                <feDisplacementMap
                  id="disp"
                  in="blur"
                  in2="map"
                  scale="0.5"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>

              <filter id="toggler" primitiveUnits="objectBoundingBox">
                <feImage
                  result="map"
                  width="100%"
                  height="100%"
                  x="0"
                  y="0"
                  href={LIQUID_GLASS_MAP_HREF}
                />
                <feGaussianBlur in="SourceGraphic" stdDeviation="0.01" result="blur" />
                <feDisplacementMap
                  in="blur"
                  in2="map"
                  scale="0.5"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </svg>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
