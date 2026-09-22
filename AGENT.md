# AGENT.md — AI-Powered Project Template (React Native)

## What Is This?

This is a **model-agnostic**, multi-agent project template designed for building mobile applications with React Native + Expo + TypeScript. Any AI coding assistant that can read markdown and execute commands can use this template.

## Architecture

The system uses 4 patterns working together:

- **Event-Driven**: Each phase triggers the next automatically
- **Graph**: Tasks are organized in dependency layers — Layer N+1 only unlocks when Layer N passes review
- **Loop (ReAct)**: Each task follows Read → Plan → Code → Test → Fix cycles
- **Blackboard**: Shared state in `.context/` allows any agent to resume from where things left off

## Agents

| Agent | File | Role |
|-------|------|------|
| Brainstorm | `.agent/brainstorm.md` | Gather requirements; Phase 0.5 sets up git/models/monitor keys upfront |
| Spec Validator | `.opencode/agent/spec-validator.md` (subagent) | Validate SPECIFICATIONS.md against requirements |
| Design | `.agent/design.md` | Generate design tokens + screen specs |
| Graph | `.agent/graph.md` | Decompose spec into layered tasks |
| Loop | `.agent/loop.md` | Orchestrate tasks (ReAct pattern); code gọi subagent `builder` |
| Builder | `.opencode/agent/builder.md` (subagent) | Implement code + test cho 1 task |
| Reviewer | `.opencode/agent/reviewer.md` (subagent) | Per-task code review + per-layer spec cross-check |
| Error Analyzer | `.agent/error-analyzer.md` | Root cause analysis (Iron Law) + pattern learning |
| Context Manager | `.agent/context-manager.md` | Context compression when window fills |
| Rollback | `.agent/rollback.md` | Git checkpoint + revert strategy |
| DevOps | `.agent/devops.md` | Git init, EAS Build, auto-push after each layer, store deploy |

> Sau khi project đã tồn tại (maintenance) → dùng `/bug`, `/bug-check`, `/feature` theo `.agent/FEATURE_WORKFLOW.md`.

## Workflow

```
BRIEF.md → Brainstorm Phase 0.5 (git/CI/models/monitor keys setup)
    ↓
Brainstorm Phase 1-3 (requirements) → SPECIFICATIONS.md → Spec Validate
    ↓ (PASS)
Design Agent → design-tokens.md + design-spec.md
    ↓ (user confirms design tokens)
Graph → Layer Plan
    ↓
👀 HUMAN CHECKPOINT: Review layer plan → user approves
    ↓
┌──── For each Layer N ────────────────────────────────────────┐
│                                                               │
│  Loop (per task, respecting dependencies):                    │
│  Read → Plan → Code → Test → Error Analyzer (fail)           │
│      ↓ (PASS)                                                 │
│  reviewer subagent → code quality/security/tests               │
│      ↓ (PASS) → git commit                                    │
│                                                               │
│  (after ALL tasks in layer PASS)                             │
│  spec-validator subagent → cross-check vs SPEC                │
│      ↓ (PASS) → DevOps auto-push layer to git                │
│                                                               │
│  👀 HUMAN CHECKPOINT: Layer N done → proceed?                │
│      ↓ (user approves)                                        │
└───────────────────────────────────────────────────────────────┘
    ↓ (all layers done)
DevOps → lint + typecheck + tests → EAS Build preview
    ↓
👀 HUMAN CHECKPOINT: Test on device/emulator? → user confirms 'done'
    ↓
DevOps verifies build passes
    ↓
👀 HUMAN CHECKPOINT: Approve store submission (EAS Submit)
    ↓
Submit → Done ✅
```

### Phase 0: Load Context
1. Read `BRIEF.md` — project overview
2. Read `SPECIFICATIONS.md` — detailed requirements (if exists)
3. Read `.context/progress.json` — resume point (if exists)
4. Read `.context/decisions.md` — past architectural decisions (if exists)

### Phase 0.5: Project Setup (`.agent/brainstorm.md` — Phase 0.5)
- Chạy ngay sau doc scan, **trước khi hỏi requirements**
- Git platform + token + repo → tạo repo tự động luôn sau khi có token
- Expo project scaffold: `npx create-expo-app` (TypeScript template)
- **`/setup-profile`** → ghi `.agent/PROJECT_PROFILE.md` (branch, package manager, verify commands, DB)
  + chọn model cho `builder`/`builder_strong`/`reviewer`/`spec_validator` và sync frontmatter `.opencode/agent/*.md`
- Git/monitor keys lưu vào `.env.local` (model **KHÔNG** còn ở đây)
- **User setup xong xuôi một lần → restart opencode → mới bắt đầu Phase 1**

### Phase 1: Brainstorm (`.agent/brainstorm.md`)
- Interactive Q&A with user about project requirements
- Stack: navigation, state management, backend/API, auth, UI library, push notifications, offline support
- Output: populated `SPECIFICATIONS.md` + `.context/brainstorm-log.md`
- **After completing → MUST proceed to Phase 2 (Spec Validation)**

### Phase 2: Spec Validation (subagent `spec-validator`) ← MANDATORY
- Validate `SPECIFICATIONS.md` for completeness and consistency
- Check for conflicts, missing configs, ambiguous requirements
- **PASS** → proceed to Phase 2.5 (Design)
- **FAIL** → return to Phase 1 (Brainstorm) with specific gaps listed, then re-validate

### Phase 2.5: Design (`.agent/design.md`) ← MANDATORY
- Ask for design reference (image / Figma link / none)
- If image/Figma → analyze and extract colors, layout, typography, components
- If none → generate design system based on style chosen in brainstorm
- Output: `.context/design-spec.md` + `skills/react-native/design-tokens.md`
- Confirm design tokens with user before proceeding
- **PASS** → proceed to Phase 3 (Task Graph)

### Phase 3: Task Graph (`.agent/graph.md`)
- Decompose specs into dependency-ordered layers
- Write task files to `tasks/` directory
- Each task: clear scope, inputs, outputs, acceptance criteria, **explicit dependency list**
- Show layer plan to user and **wait for approval before starting execution**

> 👀 **HUMAN CHECKPOINT — Layer Plan**
> "Em đã chia xong tasks. Anh review layer plan trước khi em bắt đầu code nhé?"
> Chờ user reply 'ok' / 'proceed' mới chạy Loop.

### Phase 4: Execution Loop (`.agent/loop.md`) — per layer
- Code thực thi bởi subagent `builder` (`.opencode/agent/builder.md`); loop chỉ orchestrate, không tự code.
- Check dependencies: chỉ chạy task khi tất cả deps đã PASS
- Implement with TDD where appropriate (theo `skills/superpowers/test-driven-development.md`: test-first, xem fail, code tối thiểu pass)
- Áp dụng ponytail ladder (`skills/ponytail/SKILL.md`) — dừng ở giải pháp tối giản nhất work, chống over-engineering
- Update `.context/progress.json` after each task
- Handle errors via `.agent/error-analyzer.md` (theo Iron Law `skills/superpowers/systematic-debugging.md`: NO FIX WITHOUT ROOT CAUSE)
- **Max 3 retries per task** → BLOCKED → notify human

### Phase 5: Review — per layer

**5a. Per-task Review** (subagent `reviewer`)
- Code quality, security, performance, testing
- Write reports to `.context/review-reports/`
- **PASS** → git commit → next task
- **FAIL** → return to Loop with feedback (max 2 rounds, then escalate)

**5b. Layer Review** (subagent `spec-validator`) — sau khi ALL tasks PASS
- Cross-check toàn bộ layer với `SPECIFICATIONS.md`
- Đảm bảo features đã build đúng và đủ theo spec ban đầu
- **PASS** → DevOps auto-push layer → Human checkpoint
- **FAIL** → trả về Loop với danh sách gaps → fix → Layer Review lại

> 👀 **HUMAN CHECKPOINT — End of Each Layer**
> "Layer N hoàn thành. Em tóm tắt:
> - Tasks done: [...]
> - Tests: X passed
> - Review: PASS
> Anh muốn em tiếp tục Layer N+1 không?"
> **KHÔNG tự động chạy layer tiếp theo.** Chờ user confirm.

### Phase 6: DevOps (`.agent/devops.md`)
- Git commit, push after each layer
- Final layer only: run lint + typecheck + unit tests
- EAS Build preview (internal distribution for testing)

> 👀 **HUMAN CHECKPOINT — Before Store Submission**
> "Preview build xong. Anh test trên device chưa?
> Anh confirm để em submit lên store (EAS Submit) không?"
> **KHÔNG tự động submit production store.** Chờ user approve.

## Post-Completion: Change Requests

Khi project đã tồn tại, dùng workflow maintenance — `.agent/FEATURE_WORKFLOW.md` §3 + `/feature`:
classify **ADDITIVE** / **MODIFY** / **REMOVE** → spec delta → spec-validator → phase/task →
builder/reviewer/spec-validator → progress → commit. **Không** dùng lại pipeline greenfield để đắp feature sau khi build xong.

## Resume Protocol

If `.context/progress.json` exists and `status !== "not_started"`:
1. Read progress state
2. Read blackboard for current context
3. Resume at the recorded phase/task
4. Do NOT re-run completed phases

## Getting Started (New Project)

1. Fill in `BRIEF.md` with your project idea
2. Copy `.env.local.example` → `.env.local`
3. Tell your AI assistant: **"Read AGENT.md and start the project"**
4. The assistant will scaffold the Expo app, then run brainstorm → spec-validator → graph automatically

## Resuming a Project

1. Tell your AI assistant: **"Read AGENT.md and resume the project"**
2. The assistant reads `.context/progress.json` and continues from the last checkpoint

## Model Configuration

Model khai ở `.agent/PROJECT_PROFILE.md` → block `models:` (**KHÔNG** dùng `.env.local`).
Chọn/đổi bằng `/setup-profile`, hoặc sửa tay rồi `node scripts/apply-agent-models.mjs --write`, rồi **restart opencode**.
`builder ≠ reviewer` nên khác **model family** để lộ blind spot khác nhau.

## Directory Structure

```
├── AGENTS.md             ← Entry router (opencode auto-load): greenfield vs maintenance
├── AGENT.md              ← Greenfield pipeline (You are here)
├── BRIEF.md              ← Your project idea
├── SPECIFICATIONS.md     ← Generated spec (after brainstorm)
├── opencode.jsonc        ← Permission gates (builder-strong opt-in, git/DB safety) + skills path
├── .env.local            ← Git/monitor/deploy config (git-ignored)
├── .agent/               ← Agent workflows
│   ├── FEATURE_WORKFLOW.md   ← Luật maintenance (bug/feature/update) — single source
│   ├── PROJECT_PROFILE.md    ← Giá trị project (branch, pm, verify, models, DB) — điền qua /setup-profile
│   └── *.md                  ← Greenfield agents (brainstorm/design/graph/loop/...)
├── .opencode/            ← Subagent (builder/reviewer/spec-validator/scanner) + command (/bug,/bug-check,/feature,/setup-profile)
├── scripts/              ← detect-profile, resolve-model, apply-agent-models, apply-verify-permissions, generate-inventory, check-workflow
├── skills/               ← Stack conventions & patterns
│   ├── react-native/     ← React Native/Expo stack skills
│   ├── security/         ← 🔒 Security skills (bắt buộc áp dụng)
│   ├── monitoring/       ← 📊 Monitoring skills (bắt buộc áp dụng)
│   ├── superpowers/      ← 🧠 Debug Iron Law + TDD test-first (curate from obra/superpowers)
│   ├── ponytail/         ← 🪶 Lazy senior dev ladder, chống over-engineering
│   ├── scalability-architecture/  ← 📦 OPTIONAL scalability tiers (chỉ khi user bật option)
│   ├── karpathy-guidelines/  ← ✂️ Surgical changes + think before coding (andrej-karpathy-skills)
│   └── aislop/               ← 🧹 AI-slop detection gate (scanaislop/aislop, curated) — reviewer chạy aislop scan, score ≥ 80
├── tasks/                ← Generated task files
├── .devops/              ← EAS build/submit templates
└── .context/             ← Shared state (progress, decisions, errors)
```
