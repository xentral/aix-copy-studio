"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Zap } from "lucide-react";

export type ConfigValue = {
  voice: string;
  platform: "linkedin" | "x" | "slide" | "generic";
  variantCount: number;
  frameworks: string[];
  surpriseMe: boolean;
};

interface ConfigPanelProps {
  voices: { key: string; name: string }[];
  frameworks: { key: string; name: string }[];
  value: ConfigValue;
  onChange: (v: ConfigValue) => void;
  onGenerate: () => void;
  loading: boolean;
}

const PLATFORMS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "x", label: "X / Twitter" },
  { key: "slide", label: "Slide" },
  { key: "generic", label: "Generic" },
] as const;

export function ConfigPanel({
  voices,
  frameworks,
  value,
  onChange,
  onGenerate,
  loading,
}: ConfigPanelProps) {
  const canGenerate =
    value.voice &&
    (value.surpriseMe || value.frameworks.length > 0);

  function toggleFramework(key: string) {
    const next = value.frameworks.includes(key)
      ? value.frameworks.filter(k => k !== key)
      : [...value.frameworks, key];
    onChange({ ...value, frameworks: next });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Voice */}
      <div className="space-y-2">
        <Label>Voice</Label>
        <Select
          value={value.voice}
          onValueChange={v => onChange({ ...value, voice: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a voice" />
          </SelectTrigger>
          <SelectContent>
            {voices.map(v => (
              <SelectItem key={v.key} value={v.key}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Platform */}
      <div className="space-y-2">
        <Label>Platform</Label>
        <Select
          value={value.platform}
          onValueChange={v => onChange({ ...value, platform: v as ConfigValue["platform"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLATFORMS.map(p => (
              <SelectItem key={p.key} value={p.key}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Variant count */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Variants</Label>
          <span className="text-sm font-medium tabular-nums">{value.variantCount}</span>
        </div>
        <Slider
          min={1}
          max={5}
          step={1}
          value={[value.variantCount]}
          onValueChange={([v]) => onChange({ ...value, variantCount: v })}
          className="w-full"
        />
      </div>

      {/* Frameworks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Frameworks</Label>
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <Label htmlFor="surprise-me" className="text-sm font-normal cursor-pointer">
              Surprise me
            </Label>
            <Switch
              id="surprise-me"
              checked={value.surpriseMe}
              onCheckedChange={checked => onChange({ ...value, surpriseMe: checked })}
            />
          </div>
        </div>
        {!value.surpriseMe && (
          <div className="space-y-2 pl-1">
            {frameworks.map(f => (
              <div key={f.key} className="flex items-center gap-2">
                <Checkbox
                  id={`fw-${f.key}`}
                  checked={value.frameworks.includes(f.key)}
                  onCheckedChange={() => toggleFramework(f.key)}
                />
                <Label
                  htmlFor={`fw-${f.key}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {f.name}
                </Label>
              </div>
            ))}
          </div>
        )}
        {value.surpriseMe && (
          <p className="text-xs text-muted-foreground pl-1">
            A framework is picked randomly for each variant.
          </p>
        )}
      </div>

      {/* Generate */}
      <Button
        onClick={onGenerate}
        disabled={!canGenerate || loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <span className="animate-spin mr-2">⟳</span> Generating…
          </>
        ) : (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Generate
          </>
        )}
      </Button>

      {!value.surpriseMe && value.frameworks.length === 0 && (
        <p className="text-xs text-destructive text-center -mt-2">
          Select at least one framework or enable Surprise me.
        </p>
      )}
    </div>
  );
}
