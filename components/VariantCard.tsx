"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, RefreshCw } from "lucide-react";
import type { Variant } from "@/lib/pipeline";

interface VariantCardProps {
  variant: Variant;
  index: number;
  onCopy: () => void;
  onRegenerate: () => void;
  regenerating?: boolean;
}

export function VariantCard({
  variant,
  index,
  onCopy,
  onRegenerate,
  regenerating,
}: VariantCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(variant.text);
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              #{index + 1}
            </span>
            <Badge variant="secondary" className="text-xs">
              {variant.appliedVoice}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {variant.appliedFramework}
            </Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="sm"
              variant="ghost"
              onClick={onRegenerate}
              disabled={regenerating}
              title="Regenerate this variant"
              className="h-7 w-7 p-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopy}
              title="Copy to clipboard"
              className="h-7 px-2 gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-xs text-green-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="text-xs">Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{variant.text}</p>
      </CardContent>
    </Card>
  );
}
