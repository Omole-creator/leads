import type { Stage } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const STYLES: Record<Stage, string> = {
  NEW: "border-blue-200 bg-blue-50 text-blue-700",
  CALLED: "border-amber-200 bg-amber-50 text-amber-700",
  CLOSED_WON: "border-green-200 bg-green-50 text-green-700",
  CLOSED_LOST: "border-red-200 bg-red-50 text-red-700",
  NO_ANSWER: "border-gray-200 bg-gray-50 text-gray-700",
  SILENT: "border-purple-200 bg-purple-50 text-purple-700",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return <Badge className={cn(STYLES[stage])}>{STAGE_LABELS[stage]}</Badge>;
}
