#!/usr/bin/env node
/**
 * GLM / Zhipu coding-plan quota fetcher for claude-hud-glm.
 *
 * Calls the Zhipu (open.bigmodel.cn) or Z.ai (api.z.ai) monitor endpoints and
 * writes a rich usage snapshot to a JSON file that the HUD reads at render
 * time. The HUD never makes network calls itself (render must stay fast), so
 * this script is the producer side of that producer/consumer split.
 *
 * Auth & platform are derived from the same env vars Claude Code already sets:
 *   ANTHROPIC_AUTH_TOKEN  - raw token, sent as the Authorization header
 *   ANTHROPIC_BASE_URL    - picks ZAI vs ZHIPU
 *
 * TTL self-throttle: if the snapshot is fresher than GLM_TTL_MS (default 4 min)
 * and --force is not passed, exit immediately without any network call. This
 * makes it safe to spawn from the statusline on every render.
 *
 * Usage:
 *   node fetch.mjs              # throttled refresh (writes only if stale)
 *   node fetch.mjs --force      # always refresh
 *   node fetch.mjs --print      # print snapshot, do not write
 *
 * Env overrides:
 *   GLM_USAGE_PATH      snapshot path  (default ~/.claude/glm-usage.json)
 *   GLM_TTL_MS          throttle ms    (default 240000 = 4 min)
 *   GLM_FETCH_MODELS    "0" to skip model-usage (default "1")
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const TOKEN = process.env.ANTHROPIC_AUTH_TOKEN || '';
const BASE_URL = process.env.ANTHROPIC_BASE_URL || '';
const FORCE = process.argv.includes('--force');
const PRINT_ONLY = process.argv.includes('--print');
// Resolve the Claude config dir the same way the HUD does (CLAUDE_CONFIG_DIR
// or ~/.claude) so fetch.mjs and glm-snapshot agree on the snapshot path even
// under a custom CLAUDE_CONFIG_DIR.
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR
  ? (process.env.CLAUDE_CONFIG_DIR.startsWith('~/')
      ? path.join(os.homedir(), process.env.CLAUDE_CONFIG_DIR.slice(2))
      : path.resolve(process.env.CLAUDE_CONFIG_DIR))
  : path.join(os.homedir(), '.claude');
const SNAPSHOT_PATH = process.env.GLM_USAGE_PATH
  || path.join(CLAUDE_DIR, 'glm-usage.json');
const TTL_MS = Number(process.env.GLM_TTL_MS) || 240000;
const FETCH_MODELS = (process.env.GLM_FETCH_MODELS ?? '1') !== '0';

function die(msg) {
  console.error(`[glm-fetch] ${msg}`);
  process.exit(1);
}

if (!TOKEN) die('ANTHROPIC_AUTH_TOKEN is not set.');
if (!BASE_URL) die('ANTHROPIC_BASE_URL is not set.');

// --- platform / endpoint resolution (mirrors zai query-usage.mjs) -----------
let platform;
const parsed = new URL(BASE_URL);
const baseDomain = `${parsed.protocol}//${parsed.host}`;
if (BASE_URL.includes('api.z.ai')) {
  platform = 'ZAI';
} else if (BASE_URL.includes('open.bigmodel.cn') || BASE_URL.includes('dev.bigmodel.cn')) {
  platform = 'ZHIPU';
} else {
  die(`Unrecognized ANTHROPIC_BASE_URL: ${BASE_URL}`);
}
const QUOTA_URL = `${baseDomain}/api/monitor/usage/quota/limit`;
const MODEL_USAGE_URL = `${baseDomain}/api/monitor/usage/model-usage`;

// --- TTL throttle ----------------------------------------------------------
function isFresh() {
  try {
    const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
    const updated = Date.parse(JSON.parse(raw).updated_at);
    if (!Number.isFinite(updated)) return false;
    return Date.now() - updated < TTL_MS;
  } catch {
    return false;
  }
}
if (!FORCE && !PRINT_ONLY && isFresh()) {
  process.exit(0);
}

// --- HTTP GET helper -------------------------------------------------------
function getJson(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          Authorization: TOKEN,
          'Accept-Language': 'en-US,en',
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode} ${u.pathname}: ${data.slice(0, 200)}`));
          }
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`bad JSON from ${u.pathname}: ${e.message}`));
          }
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

// --- time window for model-usage (last 7 days, hourly) ---------------------
function fmt(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}
const now = new Date();
const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, now.getHours(), 0, 0, 0);
const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 59, 59, 999);
const modelQuery = `?startTime=${encodeURIComponent(fmt(start))}&endTime=${encodeURIComponent(fmt(end))}`;

// --- quota/limit parsing ---------------------------------------------------
function parseQuota(data) {
  const limits = Array.isArray(data?.limits) ? data.limits : [];
  const tokens = limits.find((l) => l.type === 'TOKENS_LIMIT');
  const mcp = limits.find((l) => l.type === 'TIME_LIMIT');
  const fiveHour = tokens
    ? { used_percentage: num(tokens.percentage), resets_at: num(tokens.nextResetTime) }
    : null;
  const monthlyMcp = mcp
    ? {
        used_percentage: num(mcp.percentage),
        current: num(mcp.currentValue),
        total: num(mcp.usage),
        remaining: num(mcp.remaining),
        resets_at: num(mcp.nextResetTime),
        breakdown: Array.isArray(mcp.usageDetails)
          ? mcp.usageDetails.map((d) => ({ name: d.modelCode, usage: num(d.usage) })).filter((d) => d.name)
          : [],
      }
    : null;
  return { level: typeof data?.level === 'string' ? data.level : null, five_hour: fiveHour, monthly_mcp: monthlyMcp };
}

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

// --- model-usage parsing ---------------------------------------------------
function parseModels(data) {
  const total = data?.totalUsage || {};
  const summary = Array.isArray(total.modelSummaryList) ? total.modelSummaryList : [];
  const models = summary
    .map((m) => ({ code: m.modelName, tokens: num(m.totalTokens) }))
    .filter((m) => m.code)
    .sort((a, b) => (b.tokens ?? 0) - (a.tokens ?? 0));
  const weeklyTokens = num(total.totalTokensUsage);
  return { models, weekly_tokens: weeklyTokens };
}

// --- main ------------------------------------------------------------------
const snapshot = {
  updated_at: new Date().toISOString(),
  platform,
  level: null,
  five_hour: null,
  monthly_mcp: null,
  mcp_breakdown: [],
  models: [],
  weekly_tokens: null,
};

try {
  const quotaResp = await getJson(QUOTA_URL);
  const q = parseQuota(quotaResp?.data);
  snapshot.level = q.level;
  snapshot.five_hour = q.five_hour;
  snapshot.monthly_mcp = q.monthly_mcp;
  snapshot.mcp_breakdown = q.monthly_mcp?.breakdown ?? [];
} catch (e) {
  console.error(`[glm-fetch] quota/limit failed: ${e.message}`);
}

if (FETCH_MODELS) {
  try {
    const modelResp = await getJson(MODEL_USAGE_URL + modelQuery);
    const m = parseModels(modelResp?.data);
    snapshot.models = m.models;
    snapshot.weekly_tokens = m.weekly_tokens;
  } catch (e) {
    console.error(`[glm-fetch] model-usage failed: ${e.message}`);
  }
}

const out = `${JSON.stringify(snapshot, null, 2)}\n`;

if (PRINT_ONLY) {
  process.stdout.write(out);
} else {
  try {
    fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
    const tmp = `${SNAPSHOT_PATH}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, out, { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(tmp, SNAPSHOT_PATH);
    fs.chmodSync(SNAPSHOT_PATH, 0o600);
  } catch (e) {
    console.error(`[glm-fetch] write failed: ${e.message}`);
    process.exit(1);
  }
}

// Human-readable summary (harmless when stdout is redirected in statusline bg).
const lvl = snapshot.level ?? '?';
const fh = snapshot.five_hour ? `${snapshot.five_hour.used_percentage}%` : '?';
const mc = snapshot.monthly_mcp
  ? `${snapshot.monthly_mcp.used_percentage}% (${snapshot.monthly_mcp.current}/${snapshot.monthly_mcp.total})`
  : '?';
console.log(`[glm-fetch] ${platform} level=${lvl} 5h=${fh} MCP月=${mc}${PRINT_ONLY ? '  (print only)' : `  → ${SNAPSHOT_PATH}`}`);
