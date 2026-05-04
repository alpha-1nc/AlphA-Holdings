"use client";

import {
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { normalizeJournalBulletText } from "@/lib/bullet-list-text";

const BULLET = "• ";

export const JOURNAL_BULLET_HINT =
  "한 줄에 한 항목씩 쓰면 글머리 목록으로 표시됩니다. Enter로 다음 항목(•), Shift+Enter로 줄만 바꿉니다. 앞의 •, -, *는 자동으로 정리됩니다.";

export const JOURNAL_BULLET_PLACEHOLDER = `예:\n금리·유동성\n반도체 수급`;

const TA_CLASS = [
  "w-full resize-none px-6 py-5 text-base leading-relaxed",
  "text-neutral-900 placeholder:text-neutral-300",
  "bg-transparent outline-none",
  "dark:text-neutral-100 dark:placeholder:text-neutral-600",
].join(" ");

function useBulletJournalTextHandlers(value: string, onChange: (v: string) => void) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      let next = e.target.value;
      if (value === "" && next.length > 0 && !next.startsWith("•")) {
        next = normalizeJournalBulletText(next);
      }
      onChange(next);
    },
    [onChange, value],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const insert = `\n${BULLET}`;
        const next = value.slice(0, start) + insert + value.slice(end);
        onChange(next);
        const pos = start + insert.length;
        queueMicrotask(() => {
          ta.selectionStart = ta.selectionEnd = pos;
        });
        return;
      }

      if (e.key === "Backspace") {
        const ta = e.currentTarget;
        const pos = ta.selectionStart;
        const selEnd = ta.selectionEnd;
        if (pos !== selEnd) return;
        const v = value;
        const lineStart = v.lastIndexOf("\n", pos - 1) + 1;
        const lineToCaret = v.slice(lineStart, pos);
        if (/^•\s*$/.test(lineToCaret) && lineStart > 0) {
          e.preventDefault();
          const next = v.slice(0, lineStart) + v.slice(pos);
          onChange(next);
          const newPos = lineStart;
          queueMicrotask(() => {
            ta.selectionStart = ta.selectionEnd = newPos;
          });
        }
      }
    },
    [onChange, value],
  );

  return { handleChange, onKeyDown };
}

export function BulletJournalField({
  id,
  label,
  sublabel,
  placeholder,
  value,
  onChange,
  rows = 6,
  errorMessage,
  scrollId,
}: {
  id: string;
  label: string;
  sublabel: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  errorMessage?: string;
  scrollId?: string;
}) {
  const { handleChange, onKeyDown } = useBulletJournalTextHandlers(value, onChange);

  return (
    <div
      id={scrollId}
      className={[
        "overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800",
        errorMessage ? "ring-2 ring-red-500 dark:ring-red-500" : "",
      ].join(" ")}
    >
      <div className="flex items-baseline gap-2 border-b border-neutral-100 px-6 py-3.5 dark:border-neutral-800">
        <label htmlFor={id} className="text-base font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
        <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">{sublabel}</span>
      </div>
      <p className="border-b border-neutral-100 px-6 py-2.5 text-sm leading-relaxed text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        {JOURNAL_BULLET_HINT}
      </p>
      <textarea
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={rows}
        spellCheck
        className={TA_CLASS}
      />
      {errorMessage ? (
        <p className="border-t border-red-100 px-6 py-2.5 text-base text-red-600 dark:border-red-900/40 dark:text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

/** 월별 리포트 신규 작성 — 카드 헤더 스타일 동일 */
export function BulletJournalFieldCompact({
  id,
  label,
  sublabel,
  placeholder,
  value,
  onChange,
  rows = 7,
}: {
  id: string;
  label: string;
  sublabel: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const { handleChange, onKeyDown } = useBulletJournalTextHandlers(value, onChange);

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800">
      <div className="flex items-baseline gap-2 border-b border-neutral-100 px-6 py-3.5 dark:border-neutral-800">
        <label htmlFor={id} className="text-base font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
        <span className="text-sm font-medium text-neutral-400 dark:text-neutral-500">{sublabel}</span>
      </div>
      <p className="border-b border-neutral-100 px-6 py-2.5 text-sm leading-relaxed text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
        {JOURNAL_BULLET_HINT}
      </p>
      <textarea
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={rows}
        spellCheck
        className={TA_CLASS}
      />
    </div>
  );
}
