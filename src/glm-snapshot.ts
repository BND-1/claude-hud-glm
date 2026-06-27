import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { HudConfig } from './config.js';
import { createDebug } from './debug.js';
import type {
  GlmData,
  GlmModelTokens,
  GlmMonthlyMcp,
  GlmMcpBreakdownItem,
  GlmWindowPercent,
} from './types.js';

const debug = createDebug('glm-snapshot');

const DEFAULT_SNAPSHOT_PATH = path.join(os.homedir(), '.claude', 'glm-usage.json');

function parsePercent(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.round(Math.min(100, Math.max(0, value)));
}

function parseNum(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  // Zhipu returns epoch ms (>1e12); accept seconds too just in case.
  return value;
}

function parseDate(value: unknown): Date | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return null;
    const millis = value > 1e12 ? value : value * 1000;
    const d = new Date(millis);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseUpdatedAt(value: unknown): number | null {
  const d = parseDate(value);
  return d ? d.getTime() : null;
}

function parseWindow(value: unknown): GlmWindowPercent | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const pct = parsePercent(v.used_percentage);
  if (pct === null) return null;
  const resetsAt = parseDate(v.resets_at);
  if (v.resets_at != null && resetsAt === null) return null;
  return { used_percentage: pct, resets_at: resetsAt };
}

function parseMonthlyMcp(value: unknown): GlmMonthlyMcp | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const pct = parsePercent(v.used_percentage);
  if (pct === null) return null;
  const resetsAt = parseDate(v.resets_at);
  if (v.resets_at != null && resetsAt === null) return null;
  return {
    used_percentage: pct,
    current: parseNum(v.current),
    total: parseNum(v.total),
    remaining: parseNum(v.remaining),
    resets_at: resetsAt,
  };
}

function parseModels(value: unknown): GlmModelTokens[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): GlmModelTokens | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const m = item as Record<string, unknown>;
      const code = typeof m.code === 'string' ? m.code : null;
      if (!code) return null;
      return { code, tokens: parseNum(m.tokens) };
    })
    .filter((m): m is GlmModelTokens => m !== null);
}

function parseBreakdown(value: unknown): GlmMcpBreakdownItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item): GlmMcpBreakdownItem | null => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
      const m = item as Record<string, unknown>;
      const name = typeof m.name === 'string' ? m.name : null;
      if (!name) return null;
      return { name, usage: parseNum(m.usage) };
    })
    .filter((m): m is GlmMcpBreakdownItem => m !== null);
}

/**
 * Read the GLM/Zhipu usage snapshot written by fetch.mjs and parse it into a
 * GlmData object, or return null when the file is missing, stale, or invalid.
 * Mirrors getUsageFromExternalSnapshot() in external-usage.ts.
 */
export function getGlmQuotaSnapshot(
  config: HudConfig,
  now: number = Date.now(),
): GlmData | null {
  const configured = config.display.glmQuotaPath?.trim();
  const snapshotPath = configured ? configured : DEFAULT_SNAPSHOT_PATH;
  if (!snapshotPath || !path.isAbsolute(snapshotPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(snapshotPath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const updatedAt = parseUpdatedAt(parsed.updated_at);
    if (updatedAt === null) return null;

    const freshnessMs = config.display.glmQuotaFreshnessMs;
    if (now - updatedAt > freshnessMs) {
      return null;
    }

    const fiveHour = parseWindow(parsed.five_hour);
    const monthlyMcp = parseMonthlyMcp(parsed.monthly_mcp);
    const models = parseModels(parsed.models);
    const breakdown = parseBreakdown(parsed.mcp_breakdown ?? parsed.monthly_mcp_breakdown);

    if (!fiveHour && !monthlyMcp && models.length === 0 && breakdown.length === 0) {
      return null;
    }

    const level = typeof parsed.level === 'string' ? parsed.level : null;
    const weeklyTokens = parseNum(parsed.weekly_tokens);

    return {
      level,
      five_hour: fiveHour,
      monthly_mcp: monthlyMcp,
      mcp_breakdown: breakdown,
      models,
      weekly_tokens: weeklyTokens,
    };
  } catch (err) {
    debug('Failed to read GLM snapshot:', err instanceof Error ? err.message : err);
    return null;
  }
}
