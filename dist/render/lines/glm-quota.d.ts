import type { RenderContext } from "../../types.js";
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
export declare function renderGlmQuotaLine(ctx: RenderContext, alignLabels?: boolean): string | null;
//# sourceMappingURL=glm-quota.d.ts.map