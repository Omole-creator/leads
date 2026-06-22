"use client";

import { Button } from "@/components/ui/button";

/** Opens the browser print dialog → "Save as PDF". Hidden in the printout. */
export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      Download / Print PDF
    </Button>
  );
}
