#!/usr/bin/env node
// Resolve a user-typed model string to a real `provider/model` from the models opencode can use.
//
// Sources (read-only):
//   - ~/.local/share/opencode/auth.json   -> providers the user is authenticated with
//   - ~/.cache/opencode/models.json       -> opencode model catalog (models.dev snapshot)
// Override paths for testing: OPENCODE_AUTH, OPENCODE_MODELS.
//
// Modes:
//   node scripts/resolve-model.mjs "<query>"            resolve one input
//   node scripts/resolve-model.mjs --list               list available models (authed providers)
//   node scripts/resolve-model.mjs --suggest [--count N] [--exclude fam1,fam2]
//
// Output: JSON (default) or human text with --md.
// Exit: 0 if resolved / list / suggest, 1 if query cannot be resolved (or sources missing).

import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const AUTH = process.env.OPENCODE_AUTH || join(homedir(), ".local", "share", "opencode", "auth.json");
const MODELS = process.env.OPENCODE_MODELS || join(homedir(), ".cache", "opencode", "models.json");
const AS_MD = process.argv.includes("--md");
const WANT_LIST = process.argv.includes("--list");
const WANT_SUGGEST = process.argv.includes("--suggest");
const EXCLUDE = (argValue("--exclude") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const COUNT = Number(argValue("--count") || 4);
const QUERY = process.argv.slice(2).find((a) => !a.startsWith("--") && a !== argValue("--exclude") && a !== argValue("--count"));

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i === -1 ? null : process.argv[i + 1];
}

const warnings = [];

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function authedProviders() {
  const auth = loadJson(AUTH);
  if (!auth || typeof auth !== "object") {
    warnings.push(`Không đọc được auth (${AUTH}) — dùng toàn bộ catalog.`);
    return null;
  }
  return new Set(Object.keys(auth));
}

function buildCatalog() {
  const catalog = loadJson(MODELS);
  if (!catalog || typeof catalog !== "object") {
    warnings.push(`Không đọc được catalog (${MODELS}) — không validate được model.`);
    return [];
  }
  const authed = authedProviders();
  const out = [];
  for (const [providerId, prov] of Object.entries(catalog)) {
    if (authed && !authed.has(providerId)) continue;
    const models = prov && prov.models;
    if (!models || typeof models !== "object") continue;
    for (const [key, model] of Object.entries(models)) {
      const rawId = (model && model.id) || key;
      const id = rawId.startsWith(`${providerId}/`) ? rawId.slice(providerId.length + 1) : rawId;
      out.push({
        model: `${providerId}/${id}`,
        provider: providerId,
        id,
        name: (model && model.name) || id,
        family: (model && model.family) || heuristicFamily(id),
      });
    }
  }
  return out;
}

function heuristicFamily(id) {
  const m = id.match(/^[a-z]+/i);
  return m ? m[0].toLowerCase() : id.toLowerCase();
}

function normalize(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/^\/+|\/+$/g, "");
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function resolve(query, catalog) {
  const q = normalize(query);
  const scored = [];
  for (const entry of catalog) {
    const full = normalize(entry.model);
    const id = normalize(entry.id);
    let rank = null;
    let dist = null;
    if (full === q) rank = 0;
    else if (id === q) rank = 1;
    else if (full.includes(q) || q.includes(full) || id.includes(q) || q.includes(id)) rank = 2;
    else {
      dist = Math.min(levenshtein(q, id), levenshtein(q, full));
      const threshold = Math.max(2, Math.floor(Math.max(q.length, id.length) / 4));
      if (dist <= threshold) rank = 3;
    }
    if (rank !== null) scored.push({ entry, rank, dist: dist === null ? -1 : dist });
  }
  scored.sort((a, b) => a.rank - b.rank || (a.dist - b.dist) || a.entry.model.localeCompare(b.entry.model));
  return scored;
}

function confidence(rank) {
  return ["exact", "id", "contains", "fuzzy"][rank] || "none";
}

function main() {
  const catalog = buildCatalog();

  if (WANT_LIST) {
    if (catalog.length === 0) {
      console.error("Không có model khả dụng (thiếu auth/catalog).");
      process.exitCode = 1;
      return;
    }
    const byProvider = {};
    for (const e of catalog) (byProvider[e.provider] ||= []).push(e.model);
    if (AS_MD) {
      for (const [p, list] of Object.entries(byProvider)) {
        console.log(`## ${p} (${list.length})`);
        for (const m of list) console.log(`- ${m}`);
      }
    } else {
      console.log(JSON.stringify({ providers: byProvider }, null, 2));
    }
    for (const w of warnings) console.error(`WARN: ${w}`);
    return;
  }

  if (WANT_SUGGEST) {
    const NON_CHAT = /image|embedding|realtime|tts|audio|whisper|dall|moderation|transcri/i;
    const baseFamily = (e) => {
      const m = (e.id || "").match(/^[a-z]+/i);
      return (m ? m[0] : e.family).toLowerCase();
    };
    // Đặt gateway ưu tiên (opencode-go) lên trước để gợi ý đúng hệ sinh thái repo.
    const rank = (e) => (e.provider === "opencode-go" ? 0 : 1);
    const ordered = [...catalog].sort((a, b) => rank(a) - rank(b) || a.model.localeCompare(b.model));
    const seenFamilies = new Set();
    const suggestions = [];
    // Một model/family chat, ưu tiên gateway và family chưa xuất hiện.
    for (const e of ordered) {
      const fam = baseFamily(e);
      if (NON_CHAT.test(e.id) || EXCLUDE.includes(fam) || seenFamilies.has(fam)) continue;
      seenFamilies.add(fam);
      suggestions.push({ model: e.model, family: e.family, name: e.name });
      if (suggestions.length >= COUNT) break;
    }
    if (suggestions.length === 0) {
      console.error("Không tìm được gợi ý (thiếu auth/catalog hoặc bị exclude hết).");
      for (const w of warnings) console.error(`WARN: ${w}`);
      process.exitCode = 1;
      return;
    }
    if (AS_MD) {
      for (const s of suggestions) console.log(`- ${s.model}  (${s.family})`);
    } else {
      console.log(JSON.stringify({ suggestions }, null, 2));
    }
    for (const w of warnings) console.error(`WARN: ${w}`);
    return;
  }

  if (!QUERY) {
    console.error("Cần query. Ví dụ: node scripts/resolve-model.mjs \"glm 5.3 flash\"");
    console.error("Hoặc: --list | --suggest [--count N] [--exclude fam1,fam2]");
    process.exitCode = 1;
    return;
  }

  if (catalog.length === 0) {
    // Không có nguồn validate — trả nguyên văn để command tự hỏi user.
    console.log(JSON.stringify({ query: QUERY, resolved: QUERY, confidence: "unverified", alternatives: [] }, null, 2));
    for (const w of warnings) console.error(`WARN: ${w}`);
    return;
  }

  const scored = resolve(QUERY, catalog);
  if (scored.length === 0) {
    console.log(JSON.stringify({ query: QUERY, resolved: null, confidence: "none", alternatives: [] }, null, 2));
    for (const w of warnings) console.error(`WARN: ${w}`);
    process.exitCode = 1;
    return;
  }

  const best = scored[0];
  const alternatives = scored.slice(1, 4).map((s) => ({ model: s.entry.model, family: s.entry.family, match: confidence(s.rank) }));
  const result = {
    query: QUERY,
    resolved: best.entry.model,
    family: best.entry.family,
    confidence: confidence(best.rank),
    alternatives,
  };
  if (AS_MD) {
    console.log(`resolved: ${result.resolved}`);
    console.log(`confidence: ${result.confidence}`);
    if (alternatives.length) {
      console.log("alternatives:");
      for (const a of alternatives) console.log(`- ${a.model} (${a.family})`);
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
  for (const w of warnings) console.error(`WARN: ${w}`);
}

main();
