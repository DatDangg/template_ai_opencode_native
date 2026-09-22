#!/usr/bin/env node
// Sync role-agent `model:` frontmatter with the `models:` block in .agent/PROJECT_PROFILE.md.
// Only edits the `model:` line inside the frontmatter of:
//   builder -> .opencode/agent/builder.md
//   builder_strong -> .opencode/agent/builder-strong.md
//   reviewer -> .opencode/agent/reviewer.md
//   spec_validator -> .opencode/agent/spec-validator.md
// Idempotent. Default dry-run; pass --write to actually write.
//
// Validation: builder and reviewer MUST be different model families (to expose different
// blind spots). spec_validator colliding with builder/reviewer only warns.
//
// Usage: node scripts/apply-agent-models.mjs
//        node scripts/apply-agent-models.mjs --dry-run
//        node scripts/apply-agent-models.mjs --write

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PROFILE = join(ROOT, ".agent", "PROJECT_PROFILE.md");
const DRY_RUN = !process.argv.includes("--write");

// role key in profile -> agent file
const ROLE_FILES = {
  builder: join(ROOT, ".opencode", "agent", "builder.md"),
  builder_strong: join(ROOT, ".opencode", "agent", "builder-strong.md"),
  reviewer: join(ROOT, ".opencode", "agent", "reviewer.md"),
  spec_validator: join(ROOT, ".opencode", "agent", "spec-validator.md"),
};

const warns = [];

function modelFamily(model) {
  const id = model.includes("/") ? model.split("/").slice(1).join("/") : model;
  const m = id.match(/^[a-z]+/i);
  return m ? m[0].toLowerCase() : id.toLowerCase();
}

function parseModels(text) {
  const lines = text.split(/\r?\n/);
  const models = {};
  let inBlock = false;
  for (const line of lines) {
    if (/^\s*models\s*:\s*(#.*)?$/.test(line)) {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    if (line.trim() === "") continue;
    // Block ends at the first non-indented line (new top-level key or fence).
    if (!/^\s+\S/.test(line)) break;
    const m = line.match(/^\s+([a-z_]+)\s*:\s*(.*)$/);
    if (!m) continue;
    if (!(m[1] in ROLE_FILES)) continue;
    let value = m[2].replace(/\s+#.*$/, "").trim();
    if (
      value.length >= 2 &&
      ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
    ) {
      value = value.slice(1, -1).trim();
    }
    if (!value || value === "null" || value === "~" || /^<.*>$/.test(value)) continue;
    models[m[1]] = value;
  }
  return models;
}

function frontmatterRange(text) {
  if (!text.startsWith("---\n") && !text.startsWith("---\r\n")) return null;
  const start = text.indexOf("\n") + 1;
  const rest = text.slice(start);
  const endRel = rest.indexOf("\n---");
  if (endRel === -1) return null;
  return { start, end: start + endRel };
}

function patchAgent(role, model, eol) {
  const file = ROLE_FILES[role];
  if (!existsSync(file)) return { role, status: "missing" };
  const original = readFileSync(file, "utf8");
  const range = frontmatterRange(original);
  if (!range) return { role, status: "no-frontmatter" };

  const fm = original.slice(range.start, range.end);
  const modelRe = /^model:.*$/m;
  let nextFm;
  if (modelRe.test(fm)) {
    nextFm = fm.replace(modelRe, `model: ${model}`);
  } else {
    // Insert after mode: if present, else after description:, else at top of frontmatter.
    const anchor = /^mode:.*$/m.test(fm) ? /^mode:.*$/m : /^description:.*$/m;
    nextFm = anchor.test(fm) ? fm.replace(anchor, (l) => `${l}${eol}model: ${model}`) : `model: ${model}${eol}${fm}`;
  }

  const updated = original.slice(0, range.start) + nextFm + original.slice(range.end);
  if (updated === original) return { role, status: "unchanged" };
  if (!DRY_RUN) writeFileSync(file, updated, "utf8");
  return { role, status: DRY_RUN ? "would-update" : "updated" };
}

function main() {
  if (!existsSync(PROFILE)) {
    console.error(`Không tìm thấy ${PROFILE}`);
    process.exitCode = 1;
    return;
  }

  const models = parseModels(readFileSync(PROFILE, "utf8"));
  const roles = Object.keys(ROLE_FILES);

  if (Object.keys(models).length === 0) {
    console.log("Không parse được model nào trong block `models:` của PROJECT_PROFILE.md.");
    process.exitCode = 1;
    return;
  }

  const missingRoles = roles.filter((r) => !models[r]);
  for (const r of missingRoles) warns.push(`Thiếu model cho role \`${r}\` trong profile — bỏ qua.`);

  // Family advisory: builder ≠ reviewer khác family giúp lộ blind spot khác nhau,
  // nhưng KHÔNG hard-fail — user có thể chỉ có 1 model/family khả dụng.
  if (models.builder && models.reviewer && modelFamily(models.builder) === modelFamily(models.reviewer)) {
    warns.push(
      `models.builder (${models.builder}) và models.reviewer (${models.reviewer}) cùng family ` +
        `"${modelFamily(models.builder)}" — nên khác model family để lộ blind spot khác nhau.`,
    );
  }
  if (models.spec_validator && models.builder && modelFamily(models.spec_validator) === modelFamily(models.builder)) {
    warns.push(`models.spec_validator cùng family với builder ("${modelFamily(models.spec_validator)}").`);
  }
  if (models.spec_validator && models.reviewer && modelFamily(models.spec_validator) === modelFamily(models.reviewer)) {
    warns.push(`models.spec_validator cùng family với reviewer ("${modelFamily(models.spec_validator)}").`);
  }

  // Abort early if any target file is missing.
  const missingFiles = roles.filter((r) => !existsSync(ROLE_FILES[r]));
  if (missingFiles.length) {
    console.error("Thiếu agent file — không ghi file nào:");
    for (const r of missingFiles) console.error(`  - ${ROLE_FILES[r].replace(`${ROOT}/`, "")}`);
    process.exitCode = 1;
    return;
  }

  const sample = readFileSync(ROLE_FILES.builder, "utf8");
  const eol = sample.includes("\r\n") ? "\r\n" : "\n";

  for (const role of roles) {
    if (!models[role]) continue;
    const res = patchAgent(role, models[role], eol);
    const rel = ROLE_FILES[role].replace(`${ROOT}/`, "");
    if (res.status === "no-frontmatter") {
      warns.push(`${rel}: không có frontmatter — bỏ qua.`);
      continue;
    }
    console.log(`- ${rel}: ${res.status} (model: ${models[role]})`);
  }

  for (const w of warns) console.log(`WARN: ${w}`);
  if (DRY_RUN) console.log("\n(dry-run mặc định — thêm `--write` để ghi file)");
}

main();
