import type { Stage } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STYLES: Record<Stage, string> = {
  NEW: "border-brand-blue/30 bg-brand-blue/10 text-brand-blue",
  CALLED: "border-brand-black/20 bg-brand-black/5 text-brand-black",
  CLOSED_WON: "border-brand-black/10 bg-brand-yellow text-brand-black",
  CLOSED_LOST: "border-brand-red/30 bg-brand-red/10 text-brand-red",
  NO_ANSWER: "border-gray-200 bg-gray-100 text-gray-600",
  SILENT: "border-gray-300 bg-gray-50 text-gray-500",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return <Badge className={cn(STYLES[stage])}>{STAGE_LABELS[stage]}</Badge>;
}
