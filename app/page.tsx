"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DraftInput } from "@/components/DraftInput";
import { ConfigPanel, type ConfigValue } from "@/components/ConfigPanel";
import { VariantCard } from "@/components/VariantCard";
import { TalkingPointsPanel } from "@/components/TalkingPointsPanel";
import { VariantSkeleton } from "@/components/VariantSkeleton";
import type { Variant } from "@/lib/pipeline";

type RemoteConfig = {
  voices: { key: string; name: string }[];
  frameworks: { key: string; name: string }[];
  defaultVoice: string;
  defaultPlatform: ConfigValue["platform"];
};

const EXTRACT_THRESHOLD = 2000;

export default function Page() {
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfig | null>(null);
  const [draft, setDraft] = useState("");
  const [extractedPoints, setExtractedPoints] = useState<string[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [config, setConfig] = useState<ConfigValue>({
    voice: "",
    platform: "linkedin",
    variantCount: 3,
    frameworks: [],
    surpriseMe: false,
  });
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());
  const extractDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then(r => r.json())
      .then((data: RemoteConfig) => {
        setRemoteConfig(data);
        setConfig(prev => ({
          ...prev,
          voice: data.defaultVoice ?? data.voices[0]?.key ?? "",
          platform: data.defaultPlatform ?? "linkedin",
        }));
      })
      .catch(console.error);
  }, []);

  const extractPoints = useCallback(async (text: string) => {
    if (text.length <= EXTRACT_THRESHOLD) {
      setExtractedPoints([]);
      return;
    }
    setExtracting(true);
    try {
      const res = await fetch("/api/extract-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: text }),
      });
      const data = await res.json();
      if (data.points) setExtractedPoints(data.points as string[]);
    } catch (e) {
      console.error(e);
    } finally {
      setExtracting(false);
    }
  }, []);

  function handleDraftChange(text: string) {
    setDraft(text);
    if (extractDebounce.current) clearTimeout(extractDebounce.current);
    extractDebounce.current = setTimeout(() => extractPoints(text), 800);
  }

  async function handleGenerate() {
    setLoading(true);
    setVariants([]);
    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: extractedPoints.length === 0 ? draft : undefined,
          points: extractedPoints.length > 0 ? extractedPoints : undefined,
          voice: config.voice,
          platform: config.platform,
          frameworks: config.frameworks,
          surpriseMe: config.surpriseMe,
          variantCount: config.variantCount,
        }),
      });
      const data = await res.json();
      if (data.variants) setVariants(data.variants as Variant[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate(variant: Variant, index: number) {
    setRegeneratingIds(prev => new Set(prev).add(variant.id));
    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: extractedPoints.length === 0 ? draft : undefined,
          points: extractedPoints.length > 0 ? extractedPoints : undefined,
          voice: config.voice,
          platform: config.platform,
          frameworks: config.surpriseMe ? [] : [variant.appliedFrameworkKey],
          surpriseMe: config.surpriseMe,
          variantCount: 1,
        }),
      });
      const data = await res.json();
      if (data.variants?.[0]) {
        const newVariant = data.variants[0] as Variant;
        setVariants(prev =>
          prev.map((v, i) => (i === index ? { ...newVariant, id: v.id } : v))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRegeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(variant.id);
        return next;
      });
    }
  }

  if (!remoteConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div
            className="h-7 w-7 rounded-md shrink-0"
            style={{ backgroundColor: "var(--primary-color, #1E3A5F)" }}
          />
          <h1 className="text-lg font-semibold tracking-tight">Copy Studio</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">
          {/* Left panel */}
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Draft</label>
              <DraftInput value={draft} onChange={handleDraftChange} />
              {extracting && (
                <p className="text-xs text-muted-foreground mt-1.5 animate-pulse">
                  Extracting talking points…
                </p>
              )}
            </div>

            {extractedPoints.length > 0 && (
              <TalkingPointsPanel points={extractedPoints} />
            )}

            {loading && (
              <div className="space-y-4">
                {Array.from({ length: config.variantCount }).map((_, i) => (
                  <VariantSkeleton key={i} />
                ))}
              </div>
            )}

            {!loading && variants.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {variants.length} variant{variants.length !== 1 ? "s" : ""} generated
                </p>
                {variants.map((v, i) => (
                  <VariantCard
                    key={v.id}
                    variant={v}
                    index={i}
                    onCopy={() => {}}
                    onRegenerate={() => handleRegenerate(v, i)}
                    regenerating={regeneratingIds.has(v.id)}
                  />
                ))}
              </div>
            )}

            {!loading && variants.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                {draft.length === 0
                  ? "Paste a draft above, configure your settings, and click Generate."
                  : "Click Generate to create variants."}
              </div>
            )}
          </div>

          {/* Right panel — sticky */}
          <div className="lg:sticky lg:top-6">
            <div className="rounded-lg border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold mb-4">Settings</h2>
              <ConfigPanel
                voices={remoteConfig.voices}
                frameworks={remoteConfig.frameworks}
                value={config}
                onChange={setConfig}
                onGenerate={handleGenerate}
                loading={loading}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
