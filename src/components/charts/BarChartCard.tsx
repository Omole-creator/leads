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

const BRAND_YELLOW = "#FFD400";
const BRAND_BLACK = "#0A0A0A";

export function BarChartCard({
  title,
  description,
  data,
  format = "number",
  horizontal = false,
  colors,
}: {
  title: string;
  description?: string;
  data: BarDatum[];
  format?: ValueFormat;
  horizontal?: boolean;
  colors?: string[];
}) {
  const fmt = FORMATTERS[format];

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
                    ? { type: "number" as const, tickFormatter: fmt }
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
                    : { type: "number" as const, tickFormatter: fmt })}
                  fontSize={11}
                />
                <Tooltip
                  formatter={(v: number) => fmt(v)}
                  cursor={{ fill: "#00000008" }}
                />
                <Bar
                  dataKey="value"
                  radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  fill={BRAND_YELLOW}
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

export const CHART_COLORS = [
  BRAND_YELLOW,
  BRAND_BLACK,
  "#F4B400",
  "#4A4A4A",
  "#FFE066",
  "#9A9A9A",
];
