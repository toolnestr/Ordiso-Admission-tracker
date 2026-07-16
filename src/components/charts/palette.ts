/**
 * Chart palette — every set here was run through the dataviz validator against
 * our dark card surface (#0e0e11). Do not hand-edit values without re-running
 * `validate_palette.js`; adjacency and contrast are computed, not eyeballed.
 */

// Brand accent (single-series lines/areas/bars).
export const ACCENT = "#7c74ff";
export const ACCENT_SOFT = "rgba(124,116,255,0.12)";

// De-emphasis gray for the "context" series (emphasis form). accent↔this
// separates at ΔE 61.7 under CVD.
export const CONTEXT = "#6b6b76";

// Chart chrome.
export const GRID = "rgba(255,255,255,0.07)"; // hairline, one step off surface
export const SURFACE = "#0e0e11"; // for the 2px gaps/rings between marks
export const POPOVER = "#12121a";

/**
 * Pipeline stages are ORDERED (a funnel), so they use an ordinal single-hue
 * violet ramp light→dark — NOT a categorical palette. Validated with --ordinal:
 * monotone lightness, visible step gaps, dark end clears the surface at 3.36:1.
 */
export const PIPELINE_RAMP = [
  "#ded9ff",
  "#c3bbff",
  "#a89dfc",
  "#8f81f2",
  "#7768e2",
  "#6253cf",
];

const STAGE_ORDER = [
  "Applied",
  "Shortlisted",
  "Interview",
  "Admitted",
  "Confirmed",
  "Rejected",
];

/** Map a pipeline stage to its ramp step by position, so color follows the
 *  stage — never its rank/count. Confirmed-Partial shares Confirmed's step. */
export function stageColor(stage: string): string {
  const s = stage === "Confirmed-Partial" ? "Confirmed" : stage;
  const i = STAGE_ORDER.indexOf(s);
  return PIPELINE_RAMP[i === -1 ? 0 : Math.min(i, PIPELINE_RAMP.length - 1)];
}

/**
 * Source is genuinely categorical (QR / Direct / Shared — no order) and only
 * needs three well-separated hues. Validated categorical: worst adjacent
 * ΔE 27.6, all clear 3:1.
 */
export const SOURCE_COLORS: Record<string, string> = {
  QR: "#3987e5",
  Direct: "#d95926",
  Shared: "#199e70",
};

export function sourceColor(src: string): string {
  return SOURCE_COLORS[src] ?? CONTEXT;
}
