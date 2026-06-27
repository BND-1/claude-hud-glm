import type { RenderContext } from "../../types.js";
import { dim, label, getQuotaColor, quotaBar, RESET } from "../colors.js";
import { getAdaptiveBarWidth } from "../../utils/terminal.js";
import { t } from "../../i18n/index.js";
import { progressLabel } from "./label-align.js";
import { formatResetTime } from "../format-reset-time.js";

/**
 * Renders the GLM / Zhipu coding-plan quota line.
 *
 * Data comes from ctx.glmData, populated by getGlmQuotaSnapshot() from the
 * snapshot file written by fetch.mjs. Each sub-item is gated by its own
 * display.showGlm* toggle, mirroring the per-element philosophy of the rest of
 * the HUD. Segments are joined with ' │ ' to match the existing line style.
 *
 * Example (all toggles on):
 *   GLM max │ MCP/mo ████░░░░░░ 18% (744/4000) │ search-prime 452 · zread 149 │ GLM-5.2 3.3B · GLM-4.7 21M │ 7d≈3.3B │ resets in 12d 4h
 */
export function renderGlmQuotaLine(
  ctx: RenderContext,
  alignLabels = false,
): string | null {
  const display = ctx.config?.display;
  const colors = ctx.config?.colors;

  if (display?.showGlmQuota === false) return null;

  const glm = ctx.glmData;
  if (!glm) return null;

  const segments: string[] = [];
  const barWidth = getAdaptiveBarWidth();
  const barEnabled = display?.usageBarEnabled ?? true;

  // 1. Plan level — doubles as the line's leading label.
  if (display?.showGlmLevel !== false && glm.level) {
    segments.push(`${progressLabel("label.glmQuota", colors, alignLabels)} ${glm.level}`);
  }

  // 2. Monthly MCP tool-call quota (percentage + optional current/total).
  const mcp = glm.monthly_mcp;
  if (display?.showGlmMonthlyMcp !== false && mcp && mcp.used_percentage !== null) {
    const pct = mcp.used_percentage;
    const bar = barEnabled ? `${quotaBar(pct, barWidth, colors)} ` : '';
    const pctStr = `${getQuotaColor(pct, colors)}${pct}%${RESET}`;
    let seg = `${progressLabel("label.glmMcpMonthly", colors, alignLabels)} ${bar}${pctStr}`;
    if (display?.showGlmMcpTotal !== false && mcp.current !== null && mcp.total !== null) {
      seg += ` ${dim(`(${mcp.current}/${mcp.total})`)}`;
    }
    segments.push(seg);
  }

  // 3. Per-tool MCP breakdown (window: current billing month).
  if (display?.showGlmMcpBreakdown && glm.mcp_breakdown.length > 0) {
    const parts = glm.mcp_breakdown
      .filter((b) => b.usage !== null)
      .map((b) => `${b.name} ${b.usage}`);
    if (parts.length > 0) {
      segments.push(dim(parts.join(' · ')));
    }
  }

  // 4. Per-model token totals over the fetch window.
  if (display?.showGlmModels && glm.models.length > 0) {
    const parts = glm.models
      .filter((m) => m.tokens !== null)
      .slice(0, 3)
      .map((m) => `${m.code} ${formatTokens(m.tokens)}`);
    if (parts.length > 0) {
      segments.push(dim(parts.join(' · ')));
    }
  }

  // 5. Approximate rolling 7-day token usage (absolute, no ceiling).
  if (display?.showGlmWeeklyTokens && glm.weekly_tokens !== null) {
    segments.push(`${label(`${t("label.glmWeekly")}≈`, colors)}${formatTokens(glm.weekly_tokens)}`);
  }

  // 6. Reset countdown for the monthly MCP window (the meaningful long horizon;
  //    the 5h token window reset is already shown on the native Usage line).
  if (display?.showGlmReset !== false && mcp?.resets_at) {
    const reset = formatResetTime(mcp.resets_at, display?.timeFormat ?? 'relative');
    if (reset) {
      segments.push(`${label(`${t("format.resetsIn")} ${reset}`, colors)}`);
    }
  }

  if (segments.length === 0) return null;
  return segments.join(' │ ');
}

/** Compact token formatter: 3.3B / 21M / 152K. */
function formatTokens(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '--';
  if (n >= 1e9) return `${trim(n / 1e9)}B`;
  if (n >= 1e6) return `${trim(n / 1e6)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}

function trim(v: number): string {
  // One decimal place, dropping the trailing ".0" (3.0B -> 3B).
  const rounded = Math.round(v * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
