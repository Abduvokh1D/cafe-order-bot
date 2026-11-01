"use client";

import { useState } from "react";
import { formatCompact } from "@/lib/format";

export type ChartBar = { key: string; label: string; value: number; valueText: string };

const PLOT_HEIGHT_PX = 160;

/** O'qdagi eng yuqori son: yaxlit bo'lib, ustunlar tepaga tegmaydi. */
function niceMax(value: number) {
  if (value <= 5) return Math.max(value, 1);
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 1.2, 1.6, 2, 3, 4, 5, 6, 8, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}

/**
 * Bitta qator ma'lumot uchun ustunli chizma: rang bitta, shuning uchun izoh qutisi kerak emas,
 * sarlavha nimani ko'rsatishini aytadi. Aniq qiymatlar kursor yoki fokusda, va har doim jadvalda.
 */
export function BarChart({
  bars,
  axisLabels,
  summary,
}: {
  bars: ChartBar[];
  /** Pastki o'qdagi bir nechta yozuv: har ustun ostiga yozilsa, bir-biriga tegadi */
  axisLabels: string[];
  summary: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const max = niceMax(Math.max(...bars.map((bar) => bar.value), 0));
  const active = activeIndex === null ? null : bars[activeIndex];

  return (
    <figure className="flex flex-col gap-1">
      <div className="flex gap-2">
        <div aria-hidden className="flex w-12 shrink-0 flex-col justify-between text-right text-xs tabular-nums text-hint" style={{ height: PLOT_HEIGHT_PX }}>
          <span>{formatCompact(max)}</span>
          <span>{formatCompact(max / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative min-w-0 flex-1" style={{ height: PLOT_HEIGHT_PX }} onMouseLeave={() => setActiveIndex(null)}>
          {/* Yordamchi chiziqlar bo'lak emas, tutash va ko'zga tashlanmaydi */}
          <div aria-hidden className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            <span className="h-px bg-secondary" />
            <span className="h-px bg-secondary" />
            <span className="h-px bg-secondary" />
          </div>

          <div role="img" aria-label={summary} className="absolute inset-0 flex items-end gap-0.5">
            {bars.map((bar, index) => (
              <div
                key={bar.key}
                // Sezish maydoni ustun o'zidan katta: butun balandlik bo'ylab
                tabIndex={0}
                aria-label={`${bar.label}: ${bar.valueText}`}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                onClick={() => setActiveIndex(index)}
                className="flex h-full min-w-0 flex-1 items-end justify-center outline-none focus-visible:bg-secondary"
              >
                <span
                  className={`block w-full max-w-6 rounded-t bg-chart ${activeIndex === index ? "opacity-70" : ""}`}
                  style={{ height: bar.value > 0 ? `max(2px, ${(bar.value / max) * 100}%)` : 0 }}
                />
              </div>
            ))}
          </div>

          {active && (
            <div
              role="status"
              className="pointer-events-none absolute top-0 z-10 rounded-lg bg-foreground px-2 py-1 text-xs whitespace-nowrap text-background shadow"
              // Chetdagi ustunda oyna chizmadan chiqib ketmasligi uchun
              style={
                (activeIndex ?? 0) > bars.length / 2
                  ? { right: `${100 - (((activeIndex ?? 0) + 1) / bars.length) * 100}%` }
                  : { left: `${((activeIndex ?? 0) / bars.length) * 100}%` }
              }
            >
              <span className="font-bold">{active.valueText}</span> · {active.label}
            </div>
          )}
        </div>
      </div>
      <figcaption className="flex justify-between pl-14 text-xs tabular-nums text-hint">
        {axisLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </figcaption>
    </figure>
  );
}
