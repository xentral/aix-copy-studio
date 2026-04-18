"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TalkingPointsPanelProps {
  points: string[];
}

export function TalkingPointsPanel({ points }: TalkingPointsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-muted/40">
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 px-4 py-3 h-auto font-medium text-sm"
        onClick={() => setOpen(o => !o)}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span>Extracted talking points ({points.length}) — used for variants</span>
      </Button>
      {open && (
        <ol className="px-6 pb-4 space-y-1.5 list-decimal text-sm text-muted-foreground marker:text-muted-foreground/60">
          {points.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
