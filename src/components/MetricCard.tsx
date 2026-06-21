import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "white" | "black" | "yellow";

const TONES: Record<Tone, { card: string; label: string; value: string; sub: string }> = {
  white: {
    card: "border-l-4 border-l-brand-black",
    label: "text-muted-foreground",
    value: "text-brand-black",
    sub: "text-muted-foreground",
  },
  black: {
    card: "bg-brand-black border-brand-black",
    label: "text-brand-white/70",
    value: "text-brand-white",
    sub: "text-brand-white/60",
  },
  yellow: {
    card: "bg-brand-yellow border-brand-black",
    label: "text-brand-black/70",
    value: "text-brand-black",
    sub: "text-brand-black/70",
  },
};

const ACCENTS = {
  none: "",
  blue: "border-l-4 border-l-brand-blue",
  red: "border-l-4 border-l-brand-red",
} as const;

export function MetricCard({
  label,
  value,
  sub,
  tone = "white",
  accent = "none",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  accent?: keyof typeof ACCENTS;
}) {
  const t = TONES[tone];
  return (
    <Card className={cn(t.card, ACCENTS[accent])}>
      <CardContent className="p-5">
        <p className={cn("text-xs font-medium uppercase tracking-wide", t.label)}>
          {label}
        </p>
        <p className={cn("mt-1 text-2xl font-bold", t.value)}>{value}</p>
        {sub && <p className={cn("mt-0.5 text-xs", t.sub)}>{sub}</p>}
      </CardContent>
    </Card>
  );
}
