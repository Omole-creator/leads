"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatNaira, formatPercent } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
}

// A string format key is passed from Server Components (functions can't cross
// the server→client boundary); the client maps it to a formatter here.
export type ValueFormat = "number" | "naira" | "percent";

const FORMATTERS: Record<ValueFormat, (v: number) => string> = {
  number: (v) => String(v),
  naira: formatNaira,
  percent: formatPercent,
};

export const BRAND = {
  yellow: "#FFD400",
  black: "#0A0A0A",
  blue: "#1D4ED8",
  red: "#E11D2A",
  grey: "#6B6B6B",
} as const;

export function BarChartCard({
  title,
  description,
  data,
  format = "number",
  horizontal = false,
  barColor = BRAND.black,
  colors,
}: {
  title: string;
  description?: string;
  data: BarDatum[];
  format?: ValueFormat;
  horizontal?: boolean;
  /** Single hue for all bars (default brand black). */
  barColor?: string;
  /** Per-bar colors (semantic) — overrides barColor when provided. */
  colors?: string[];
}) {
  const fmt = FORMATTERS[format];
  // Rates are 0–100%; pin the numeric axis so all-zero data doesn't auto-scale
  // to a nonsensical 0–400%. Other formats keep Recharts' auto domain.
  const numberDomain: [number, number] | undefined =
    format === "percent" ? [0, 1] : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No data yet.
          </p>
        ) : (
          <div
            style={{
              width: "100%",
              height: horizontal
                ? Math.max(240, data.length * 40)
                : 280,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout={horizontal ? "vertical" : "horizontal"}
                barCategoryGap="25%"
                margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                {/* Axes must be DIRECT children of BarChart — Recharts v2 does
                    not read axis props through a React Fragment, which would
                    silently drop the category axis. */}
                <XAxis
                  {...(horizontal
                    ? {
                        type: "number" as const,
                        tickFormatter: fmt,
                        ...(numberDomain
                          ? { domain: numberDomain, allowDataOverflow: true }
                          : {}),
                      }
                    : {
                        type: "category" as const,
                        dataKey: "label",
                        interval: 0,
                        angle: -15,
                        textAnchor: "end" as const,
                        height: 60,
                      })}
                  fontSize={11}
                />
                <YAxis
                  {...(horizontal
                    ? {
                        type: "category" as const,
                        dataKey: "label",
                        width: 150,
                        interval: 0,
                        tickLine: false,
                      }
                    : {
                        type: "number" as const,
                        tickFormatter: fmt,
                        ...(numberDomain
                          ? { domain: numberDomain, allowDataOverflow: true }
                          : {}),
                      })}
                  fontSize={11}
                />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  cursor={{ fill: "#00000008" }}
                />
                <Bar
                  dataKey="value"
                  radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  fill={barColor}
                  isAnimationActive={false}
                >
                  {colors &&
                    data.map((_, i) => (
                      <Cell key={i} fill={colors[i % colors.length]} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Semantic colors for pipeline stages, in STAGES order:
// New, Called, Sales Won, Sales Lost, No Answer, Silent.
export const STAGE_BAR_COLORS = [
  BRAND.blue,
  BRAND.black,
  BRAND.yellow,
  BRAND.red,
  BRAND.grey,
  "#9A9A9A",
];
