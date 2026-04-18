"use client";

import { useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";

interface DraftInputProps {
  value: string;
  onChange: (v: string) => void;
}

export function DraftInput({ value, onChange }: DraftInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Paste your draft, slide text, or raw notes here…"
      className="min-h-[200px] resize-none overflow-hidden text-base leading-relaxed"
      style={{ height: "auto" }}
    />
  );
}
