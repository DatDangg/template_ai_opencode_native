# AGENTS.md — AI Workflow Router (entry point)

> This is the **always-loaded entry point**. Read it before acting on any request.
>
> **Nguồn luật duy nhất (single source of truth): `.agent/FEATURE_WORKFLOW.md`** — bug / feature / update.
> File này chỉ giữ **router + non-negotiables**; chi tiết luật KHÔNG chép lại ở đây.
> Project values: `.agent/PROJECT_PROFILE.md`.
> Pipeline dựng dự án từ đầu (greenfield): `AGENT.md` + `.agent/*.md` (vẫn active ở template này).

## Precedence

`AGENTS.md` **always wins** over every file in `.agent/`. Chi tiết luật: `.agent/FEATURE_WORKFLOW.md`.
Route theo trạng thái repo:
- **Chưa có app code** (greenfield) → chạy pipeline trong `AGENT.md`; các `.agent/*.md` greenfield active.
- **Đã có app code** (maintenance) → bug/feature/update theo `.agent/FEATURE_WORKFLOW.md`; lúc đó luật maintenance override phần greenfield trùng lặp.
`error-analyzer` active ở cả hai (FW §3.6 dùng ở bước retry Attempt 1).

## Router — classify intent BEFORE coding

| Intent (user says…) | Route (mandatory) |
|---|---|
| "fix bug", "lỗi", "broken", regression, crash (đã biết rõ bug nào) | **Bug workflow** → `.agent/FEATURE_WORKFLOW.md` §2 → `/bug` |
| "soi/kiểm tra màn", "cảm giác nhiều lỗi nhưng không rõ" | **Bug discovery / sweep** → FW §2b → `/bug-check` — READ-ONLY |
| "thêm/sửa/bỏ/xóa tính năng", "change/update feature" | **Change Request workflow** → FW §3 → `/feature` |
| "implement feature" (spec/task đã có sẵn) | **Builder theo task** → `.opencode/agent/builder` |
| "review", "check", "soát" (một diff/task cụ thể) | **Reviewer** → `.opencode/agent/reviewer` — KHÔNG tự sửa code |
| "tiếp phase N", "continue", "resume việc dở" | **Session Start Protocol** → FW § Session handoff & resume → `/resume` (KHÔNG classify lại) |
| "thêm skill", "add skill", "tạo skill", "register skill" | **Customize opencode** — tạo/cập nhật runtime skill đúng format (§Local skills) |
| hỏi / điều tra / "tại sao", "how does X work" | **Research-only** — KHÔNG edit nếu user chưa yêu cầu fix |

Không rõ intent → hỏi 1 câu ngắn để phân loại, đừng đoán.

### Phân biệt 3 command

| Command | Dùng khi | Tính chất |
|---|---|---|
| `/bug-check` | Khu vực/màn mơ hồ, "cảm giác nhiều lỗi" | **READ-ONLY** — soi, liệt kê defect vào `tasks/bug-<slug>/scan.md`, **dừng chờ user chọn**. Không sửa, không commit. |
| `/bug` | **Một bug đã biết** hoặc list bug đã xác nhận | Diagnose root cause → task → builder → reviewer → progress → commit-first |
| `/feature` | Thêm/sửa/bỏ tính năng | Classify ADDITIVE/MODIFY/REMOVE → spec delta → phase/task → builder/reviewer/spec-validator → progress |

## Rules — trỏ về nguồn (không chép lại)

| Chủ đề | Nguồn |
|---|---|
| Bug workflow, triage, root cause, task, fix-loop | `.agent/FEATURE_WORKFLOW.md` §2 (+ `/bug`) |
| Bug discovery read-only | FW §2b (+ `/bug-check`) |
| Change Request (classify → spec delta → phase/task → loop) | FW §3 (+ `/feature`) |
| Retry / escalation | FW §2.3, §3.6 |
| Report naming + close-out report gate | FW §5, §6 |
| Progress schema + close-out | FW §5, §2.7, §3.9 |
| Commit-first + branch/push model | FW §2.8, §6 |
| Doc Impact & Reconcile (as-built vs intent) | FW §6 |
| Reviewer risk level (FAST/NORMAL/STRICT) | FW §6 |
| Check commands | `.agent/PROJECT_PROFILE.md` + FW §6 |
| Danh sách bug/feature → checkpoint trước khi gọi Builder | FW §2.6, §3.8 |
| Session handoff / resume (Run Journal) | FW § Session handoff & resume (+ `/resume`) |

## Non-negotiables (mọi route)

- **Commit** sau PASS theo Commit-First Tracking (FW §2.8). `auto_commit_after_pass: true` chỉ cho phép auto-push
  `target_branch` sau PASS; **deploy / mở PR luôn cần user yêu cầu rõ**.
- **Default staging-direct**: chỉ auto-push `target_branch` khi current branch = `target_branch`; nếu user yêu cầu feature branch thì push current branch và PR chỉ khi user yêu cầu rõ. **Cấm push `forbidden_branch`**, cấm `--force` / `-f`. Gate cứng ở `opencode.jsonc` (`permission.bash`).
- **KHÔNG commit/push khi Reviewer FAIL** hoặc khi progress chưa cập nhật.
- **Workflow consistency**: trước commit chạy `pnpm check:workflow`; FAIL → không commit.
- **KHÔNG tự sửa source khi đang review** — reviewer/spec-validator chỉ được ghi report scoped.
- **Check commands lấy từ `.agent/PROJECT_PROFILE.md`** — không hardcode.
- Nếu repo chưa có app code/API/web/test hoặc command chưa cấu hình → verify ghi `skip, no app configured`.
- **Migration safety** chỉ áp dụng khi `db_tool != none` / `migration_required: true` (`.agent/PROJECT_PROFILE.md`); `db_tool: none` → bỏ qua gate migration.
- Khi migration gate áp dụng: migration phải versioned + committed; không sửa migration đã apply. Destructive/high-risk ops → gắn `HIGH_RISK_MIGRATION`, không promote production, báo rõ destructive op/table/column/data/backfill/rollback/verify staging.
- Cấm `db push`, `migrate reset`, seed/reset, clone data giữa môi trường cho staging/prod. `staging_db` phải khác `prod_db`; không sync data staging→prod.
- **Model mạnh (`builder-strong`) chỉ dùng khi user yêu cầu rõ** — không tự chọn theo độ khó.
- Xong việc → không tự chạy phase/task tiếp theo khi chưa qua **human checkpoint** (FW §8).
- **Session handoff**: dừng ở ranh giới step → ghi Run Journal (write-ahead); session mới resume qua
  `/resume` (FW § Session handoff & resume) — **đĩa là sự thật**, pointer là hint.

## Tool Loop Guard

- Không chạy lặp cùng 1 shell/search/read command y hệt quá 1 lần.
- Không thử cùng 1 giả thuyết quá 2 lần bằng biến thể gần giống.
- Command/search trả empty hoặc non-zero → ghi nhận và chuyển hướng, không retry vô hạn.
- Bash bị permission deny → **DỪNG NGAY**: không retry, không đổi biến thể, không vòng qua pipeline; chuyển Grep/Read hoặc ghi `Blocked`.
- Không xác minh được → ghi `Residual risk`/`Blocked`, không lặp tool.

## Local skills

- Runtime skills nằm trong `skills/<skill-name>/SKILL.md` và được đăng ký qua `opencode.jsonc` → `skills.paths: ["./skills"]`.
- Khi user yêu cầu **thêm skill**, phải tạo folder `skills/<lowercase-hyphen-name>/SKILL.md` với frontmatter `name` + `description`; `description` phải nêu rõ khi nào auto-trigger bằng keyword cụ thể.
- Nếu skill có nhiều tài liệu chi tiết, giữ chúng trong cùng folder và để `SKILL.md` làm wrapper trỏ tới các file đó.
- Sau mọi thay đổi skill/config/agent/command, nhắc user **restart opencode** vì config không hot-reload.
