const SEVEN_PLOTS = [
  "Overcoming the Monster",
  "Rags to Riches",
  "The Quest",
  "Voyage and Return",
  "Comedy",
  "Rebirth",
] as const;

export function pickSurpriseFramework(availableKeys: string[]) {
  const combine = availableKeys.length >= 2 && Math.random() < 0.2;
  const shuffled = [...availableKeys].sort(() => Math.random() - 0.5);
  const primary = shuffled[0];
  const secondary = combine ? shuffled[1] : undefined;
  const plotHint =
    primary === "seven-plots"
      ? SEVEN_PLOTS[Math.floor(Math.random() * SEVEN_PLOTS.length)]
      : undefined;
  return { primary, secondary, plotHint };
}
