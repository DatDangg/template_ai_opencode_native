#!/usr/bin/env node
// Deterministic consistency checker cho template workflow (greenfield + maintenance).
// Chạy: node scripts/check-workflow-consistency.mjs
// Exit code 1 nếu có vi phạm. Không tự sửa gì — chỉ báo.
//
// Mục đích: chặn drift giữa các file chép lại cùng một luật
// (AGENTS.md, AGENT.md, .agent/*, .opencode/command|agent, tasks/README.md).
// Template có 2 giai đoạn: greenfield (chưa build) và maintenance (đã có code) — checker
// chấp nhận cả hai schema state, và KHÔNG bắt buộc file greenfield phải bị stub.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const failures = [];
const warns = [];

function read(p) {
  return readFileSync(join(ROOT, p), "utf8");
}
function fail(msg) {
  failures.push(msg);
}
function walk(target, out = []) {
  if (!existsSync(target)) return out;
  if (!statSync(target).isDirectory()) {
    if (target.endsWith(".md")) out.push(target);
    return out;
  }
  for (const name of readdirSync(target)) {
    if (name === "node_modules" || name === ".git") continue;
    walk(join(target, name), out);
  }
  return out;
}

const mdFiles = [
  join(ROOT, "AGENTS.md"),
  join(ROOT, "AGENT.md"),
  join(ROOT, "README.md"),
  join(ROOT, ".agent"),
  join(ROOT, ".opencode"),
  join(ROOT, "tasks"),
].flatMap((p) => walk(p));
const repoMd = walk(ROOT);

// 1. Dead skill references: skills/<x>/<path> trong *.md phải tồn tại trên disk.
const skillRefRe = /skills\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._/-]+/g;
const seen = new Set();
for (const f of repoMd) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(skillRefRe)) {
    const ref = m[0].replace(/[.,)]+$/, "");
    if (seen.has(ref)) continue;
    seen.add(ref);
    if (!existsSync(join(ROOT, ref))) {
      fail(`${relative(ROOT, f)}: dead skill reference -> ${ref}`);
    }
  }
}

// 1b. Dead .agent references: `.agent/<name>.md` được nhắc phải tồn tại.
const agentRefRe = /\.agent\/[a-z][a-z0-9-]*\.md/g;
const seenAgent = new Set();
for (const f of repoMd) {
  const text = readFileSync(f, "utf8");
  for (const m of text.matchAll(agentRefRe)) {
    const ref = m[0];
    if (seenAgent.has(ref)) continue;
    seenAgent.add(ref);
    if (!existsSync(join(ROOT, ref))) fail(`${relative(ROOT, f)}: dead .agent reference -> ${ref}`);
  }
}

// 2. Không còn model đọc từ .env.local trong docs/agent.
const ENV_MODELS = ["CODING_MODEL", "REVIEWER_MODEL", "SPEC_VALIDATOR_MODEL", "CHANGE_REQUEST_MODEL"];
for (const f of mdFiles) {
  const rel = relative(ROOT, f);
  if (rel.startsWith(".agent/") || rel === "AGENTS.md" || rel === "AGENT.md" || rel === "README.md") {
    const text = readFileSync(f, "utf8");
    for (const token of ENV_MODELS) {
      if (text.includes(token)) fail(`${rel}: còn model env legacy -> ${token}`);
    }
  }
}

// 3. Report naming invariants phải có đủ ở các file chủ chốt.
const FW = ".agent/FEATURE_WORKFLOW.md";
const revAgent = ".opencode/agent/reviewer.md";
const specAgent = ".opencode/agent/spec-validator.md";
if (existsSync(join(ROOT, FW))) {
  const fw = read(FW);
  for (const needle of [
    "<feature|bug>-<slug>-phase-<N>-task-<NN>-review.md",
    "<feature|bug>-<slug>-phase-<N>-review.md",
    "bug-<slug>-one-line-review.md",
    "feature-<slug>-spec-validation.md",
  ]) {
    if (!fw.includes(needle)) fail(`${FW}: thiếu report naming -> ${needle}`);
  }
} else {
  fail(`${FW}: không tồn tại`);
}
if (existsSync(join(ROOT, revAgent)) && !read(revAgent).includes("one-line-review.md")) {
  fail(`${revAgent}: thiếu report naming cho one-line bug`);
}
if (existsSync(join(ROOT, specAgent)) && !read(specAgent).includes("spec-validation.md")) {
  fail(`${specAgent}: thiếu report naming pre-plan`);
}

// 4. docs/USER_FLOW.md luôn kèm "(nếu có)" khi được nhắc.
for (const f of mdFiles) {
  const lines = readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes("docs/USER_FLOW.md") && !line.includes("(nếu có)")) {
      fail(`${relative(ROOT, f)}:${i + 1}: USER_FLOW phải kèm "(nếu có)"`);
    }
  });
}

// 5. Wording đã chốt không được tái xuất.
for (const f of mdFiles) {
  const lines = readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes("khác họ provider")) {
      fail(`${relative(ROOT, f)}:${i + 1}: dùng "khác model family", không "khác họ provider"`);
    }
    if (/docs\/history\/YYYY-MM\.md/.test(line) &&
        !/không còn|đã xoá|legacy|deprecated|Deprecated/i.test(line)) {
      fail(`${relative(ROOT, f)}:${i + 1}: docs/history chỉ được nhắc dạng legacy/đã xoá`);
    }
  });
}

// 6. progress.json: valid JSON + key thuộc schema greenfield HOẶC maintenance.
//    (Template clone về chưa build → greenfield; sau khi build xong mới migrate sang maintenance.)
const GREENFIELD_KEYS = new Set([
  "projectName", "currentLayer", "totalLayers", "completedTasks",
  "inProgressTask", "blockedTasks", "decisions", "lastUpdated",
]);
const MAINTENANCE_KEYS = new Set(["mode", "activeWorkItem", "features", "bugs", "lastUpdated"]);
const progressPath = ".context/progress.json";
if (existsSync(join(ROOT, progressPath))) {
  try {
    const p = JSON.parse(read(progressPath));
    const keys = Object.keys(p);
    const isGreenfield = keys.some((k) => GREENFIELD_KEYS.has(k) && k !== "lastUpdated");
    const isMaintenance = keys.includes("mode") || keys.includes("features") || keys.includes("bugs");
    const allowed = isGreenfield && !isMaintenance ? GREENFIELD_KEYS : MAINTENANCE_KEYS;
    for (const k of keys) {
      if (!allowed.has(k)) fail(`${progressPath}: key ngoài schema (${isMaintenance ? "maintenance" : "greenfield"}) -> ${k}`);
    }
    if (isMaintenance && p.mode !== "maintenance") {
      warns.push(`${progressPath}: mode="${p.mode}" (mong đợi "maintenance")`);
    }
  } catch (e) {
    fail(`${progressPath}: JSON không hợp lệ -> ${e.message}`);
  }
} else {
  fail(`${progressPath}: không tồn tại`);
}

// 7. opencode.jsonc parse được (strip // comment).
const cfgPath = "opencode.jsonc";
if (existsSync(join(ROOT, cfgPath))) {
  const stripped = read(cfgPath).replace(/^\s*\/\/.*$/gm, "");
  try {
    JSON.parse(stripped);
  } catch (e) {
    fail(`${cfgPath}: JSON không hợp lệ -> ${e.message}`);
  }
} else {
  fail(`${cfgPath}: không tồn tại`);
}

// 8. Single-source: vài cụm luật chỉ được định nghĩa ở FEATURE_WORKFLOW, nơi khác phải trỏ tới.
const UNIQUE_TO_FW = ["Bộ đếm thống nhất", "1 vòng = 1 attempt", "API contract/endpoint/response shape"];
for (const f of mdFiles) {
  if (relative(ROOT, f) === FW) continue;
  const text = readFileSync(f, "utf8");
  for (const phrase of UNIQUE_TO_FW) {
    if (text.includes(phrase)) {
      fail(`${relative(ROOT, f)}: luật "${phrase}" phải ở ${FW} (single source), không chép lại`);
    }
  }
}

// 9. Invariant bổ sung.
const fwText = existsSync(join(ROOT, FW)) ? read(FW) : "";
if (fwText && !fwText.includes("tasks/README.md")) {
  fail(`${FW}: thiếu pointer tới format task (tasks/README.md)`);
}
if (fwText && !fwText.includes("generate-inventory.mjs")) {
  fail(`${FW}: thiếu lệnh regen inventory (node scripts/generate-inventory.mjs)`);
}
if (/2\.7[–-]2\.9/.test(fwText)) {
  fail(`${FW}: "2.7–2.9" sai — 2.9 là nhánh, không phải bước tuần tự`);
}
if (fwText && !fwText.includes("check:workflow")) {
  fail(`${FW}: thiếu workflow consistency gate (pnpm check:workflow)`);
}
for (const f of mdFiles) {
  if (readFileSync(f, "utf8").includes("<feature-or-bug-slug>")) {
    fail(`${relative(ROOT, f)}: path task sai — dùng tasks/feature-<slug>/ hoặc tasks/bug-<slug>/`);
  }
}
for (const a of [revAgent, specAgent]) {
  if (existsSync(join(ROOT, a)) && read(a).includes("<feature|bug>-<slug>-phase-<N>-review.md")) {
    fail(`${a}: phase-review phải theo loại work-item (feature→spec-validator, bug→reviewer)`);
  }
}

// 10. Cụm stale đã bị thay (kể cả README).
const BANNED_PHRASES = [
  ["Change Request Agent", "dùng /feature (FW §3)"],
  ["develop     ← staging", "branch model là staging-direct"],
  ["Configured in `.env.local`", "model khai ở PROJECT_PROFILE, không .env.local"],
  ["automatically versioned", "spec delta ghi qua Change Request (FW §3.2)"],
];
for (const f of mdFiles) {
  const rel = relative(ROOT, f);
  const text = readFileSync(f, "utf8");
  if (text.includes("LEGACY — greenfield")) continue; // stub file, không tính
  for (const [phrase, hint] of BANNED_PHRASES) {
    if (text.includes(phrase)) fail(`${rel}: cụm stale "${phrase}" — ${hint}`);
  }
}

// 11. Greenfield files phải ACTIVE (template build từ đầu) — không được stub.
//     Và reviewer/spec-validator greenfield phải vắng mặt: chỉ dùng subagent (một nguồn mỗi vai).
const GREENFIELD_ACTIVE = [
  "blackboard", "brainstorm", "context-manager", "design", "devops",
  "error-analyzer", "graph", "loop", "rollback",
];
for (const s of GREENFIELD_ACTIVE) {
  const p = join(ROOT, ".agent", `${s}.md`);
  if (!existsSync(p)) fail(`.agent/${s}.md: thiếu (pipeline greenfield cần active)`);
  else if (readFileSync(p, "utf8").includes("LEGACY — greenfield")) {
    fail(`.agent/${s}.md: không được stub — template vẫn build greenfield`);
  }
}
for (const s of ["reviewer", "spec-validator"]) {
  const p = join(ROOT, ".agent", `${s}.md`);
  if (existsSync(p)) {
    fail(`.agent/${s}.md: phải xóa — vai này dùng subagent .opencode/agent/${s}.md (một nguồn mỗi vai)`);
  }
}
for (const sub of ["builder", "builder-strong", "reviewer", "spec-validator", "bug-check-scanner"]) {
  const p = join(ROOT, ".opencode", "agent", `${sub}.md`);
  if (!existsSync(p)) fail(`.opencode/agent/${sub}.md: thiếu subagent`);
}

// 12. /bug-check phải chạy read-only agent (không chạy ở primary với quyền rộng).
const bcPath = join(ROOT, ".opencode", "command", "bug-check.md");
if (existsSync(bcPath) && !readFileSync(bcPath, "utf8").includes("agent: bug-check-scanner")) {
  fail(".opencode/command/bug-check.md: phải set `agent: bug-check-scanner` (read-only)");
}
const scannerPath = join(ROOT, ".opencode", "agent", "bug-check-scanner.md");
if (existsSync(scannerPath) && !readFileSync(scannerPath, "utf8").includes("verify-commands:start")) {
  fail(".opencode/agent/bug-check-scanner.md: thiếu marker verify-commands để sync quyền");
}
const avpPath = join(ROOT, "scripts", "apply-verify-permissions.mjs");
if (existsSync(avpPath) && !readFileSync(avpPath, "utf8").includes("bug-check-scanner.md")) {
  fail("scripts/apply-verify-permissions.mjs: thiếu bug-check-scanner trong AGENT_FILES");
}

// 12b. Model resolve + sync phải có script và được /setup-profile gọi.
for (const script of ["resolve-model.mjs", "apply-agent-models.mjs"]) {
  if (!existsSync(join(ROOT, "scripts", script))) fail(`scripts/${script}: thiếu (setup-profile cần)`);
}
const spPath = join(ROOT, ".opencode", "command", "setup-profile.md");
if (existsSync(spPath)) {
  const sp = readFileSync(spPath, "utf8");
  for (const needle of ["resolve-model.mjs", "apply-agent-models.mjs"]) {
    if (!sp.includes(needle)) fail(`.opencode/command/setup-profile.md: thiếu tham chiếu ${needle}`);
  }
}

// 13. Read-only agents: cấm wildcard verify rộng (cho phép chaining) + phải có chặn chaining.
const READONLY_AGENTS = ["reviewer.md", "spec-validator.md", "bug-check-scanner.md"];
for (const name of READONLY_AGENTS) {
  const p = join(ROOT, ".opencode", "agent", name);
  if (!existsSync(p)) continue;
  const text = readFileSync(p, "utf8");
  for (const bad of ["*typecheck*", "*lint*", "*test*", "*vitest*"]) {
    if (text.includes(`"${bad}"`)) {
      fail(`.opencode/agent/${name}: wildcard bash "${bad}" cho phép chaining — dùng exact pattern`);
    }
  }
  if (!text.includes('"*&&*": deny')) {
    fail(`.opencode/agent/${name}: thiếu chặn chaining ("*&&*": deny)`);
  }
}

// 14. README phải phản ánh cả hai giai đoạn + có scanner.
if (existsSync(join(ROOT, "README.md"))) {
  const rm = read("README.md");
  if (!rm.includes("bug-check-scanner")) fail("README.md: thiếu bug-check-scanner trong danh sách agent");
  if (!rm.includes("FEATURE_WORKFLOW")) fail("README.md: thiếu tham chiếu maintenance workflow");
}

// 15. Model frontmatter của agent role: chỉ đối chiếu khi CẢ HAI phía đã có giá trị thật.
//     Template ship frontmatter không set model (Phase 0.5/setup-profile điền) nên chỉ warn.
const profilePath = ".agent/PROJECT_PROFILE.md";
const ROLE_FILES = {
  builder: ".opencode/agent/builder.md",
  builder_strong: ".opencode/agent/builder-strong.md",
  reviewer: ".opencode/agent/reviewer.md",
  spec_validator: ".opencode/agent/spec-validator.md",
};
function modelFamily(model) {
  const id = model.includes("/") ? model.split("/").slice(1).join("/") : model;
  const m = id.match(/^[a-z]+/i);
  return m ? m[0].toLowerCase() : id.toLowerCase();
}
function isReal(v) {
  return Boolean(v) && v !== "null" && v !== "~" && !/^<.*>$/.test(v);
}
if (existsSync(join(ROOT, profilePath))) {
  const profile = read(profilePath);
  const profileModels = {};
  let inBlock = false;
  for (const line of profile.split(/\r?\n/)) {
    if (/^\s*models\s*:\s*(#.*)?$/.test(line)) {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    if (line.trim() === "") continue;
    if (!/^\s+\S/.test(line)) break;
    const m = line.match(/^\s+([a-z_]+)\s*:\s*(.*)$/);
    if (!m || !(m[1] in ROLE_FILES)) continue;
    let value = m[2].replace(/\s+#.*$/, "").trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1).trim();
    }
    if (!isReal(value)) continue;
    profileModels[m[1]] = value;
  }
  for (const [role, agentFile] of Object.entries(ROLE_FILES)) {
    const p = join(ROOT, agentFile);
    if (!existsSync(p)) continue;
    const fText = read(agentFile);
    const fmEnd = fText.indexOf("\n---", fText.indexOf("\n") + 1);
    const fm = fmEnd === -1 ? fText : fText.slice(0, fmEnd);
    const mm = fm.match(/^model:\s*(.+)$/m);
    const expected = profileModels[role];
    if (!expected) {
      warns.push(`${profilePath}: chưa có model cho role \`${role}\` (Phase 0.5/setup-profile sẽ điền)`);
      continue;
    }
    if (!mm) {
      warns.push(`${agentFile}: chưa set frontmatter \`model:\` (mong đợi ${expected}) — chạy apply-agent-models.mjs --write`);
      continue;
    }
    if (mm[1].trim() !== expected) {
      fail(`${agentFile}: model="${mm[1].trim()}" ≠ profile models.${role}="${expected}"`);
    }
  }
  if (profileModels.builder && profileModels.reviewer &&
      modelFamily(profileModels.builder) === modelFamily(profileModels.reviewer)) {
    warns.push(`${profilePath}: models.builder và models.reviewer cùng family — nên khác model family (advisory)`);
  }
} else {
  fail(`${profilePath}: không tồn tại`);
}

for (const w of warns) console.log(`WARN: ${w}`);
if (failures.length) {
  console.error(`\n❌ FAIL — ${failures.length} vi phạm:`);
  for (const m of failures) console.error(`  - ${m}`);
  process.exitCode = 1;
} else {
  console.log(`✅ PASS — workflow nhất quán (${mdFiles.length} md files, ${seen.size} skill refs).`);
}
