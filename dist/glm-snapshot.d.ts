import type { HudConfig } from './config.js';
import type { GlmData } from './types.js';
/**
 * Read the GLM/Zhipu usage snapshot written by fetch.mjs and parse it into a
 * GlmData object, or return null when the file is missing, stale, or invalid.
 * Mirrors getUsageFromExternalSnapshot() in external-usage.ts.
 */
export declare function getGlmQuotaSnapshot(config: HudConfig, now?: number): GlmData | null;
//# sourceMappingURL=glm-snapshot.d.ts.map