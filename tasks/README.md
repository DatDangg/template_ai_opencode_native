# Tasks Directory

> Template hỗ trợ 2 giai đoạn: **greenfield** (dựng mới từ đầu — `AGENT.md`) và **maintenance**
> (bug/feature/update — `.agent/FEATURE_WORKFLOW.md` + `AGENTS.md`).
> Ở maintenance, task viết tay theo format dưới đây, KHÔNG sinh tự động qua `.agent/graph.md`.
> Cấu trúc `layer-<N>/` chỉ dùng cho greenfield, không dùng để resume maintenance.

## Hai chế độ

| Mode | Đường dẫn | Dùng khi |
|------|-----------|----------|
| **Greenfield** | `tasks/layer-<N>/task-<NN>.md` | Dựng mới ban đầu (`.agent/graph.md` sinh task) |
| **Maintenance** (mặc định sau khi có code) | `tasks/feature-<slug>/phase-<N>-task-<NN>.md`<br>`tasks/bug-<slug>/phase-<N>-task-<NN>.md` | Bug / feature / update |

> Phase model: 1 Schema/domain · 2 Backend/API · 3 UI · 4 Integration · 5 Test/UAT.

## Cấu trúc (maintenance)

```
tasks/
├── README.md
├── feature-<slug>/
│   ├── phase-1-task-01.md
│   └── phase-2-task-01.md
└── bug-<slug>/
    ├── scan.md            ← output của /bug-check (READ-ONLY, danh sách defect)
    └── phase-1-task-01.md
```

## Task file format (maintenance)

```markdown
# Task <NN>: <Title>

## Type
feature (<ADDITIVE|MODIFY|REMOVE>) | bug

## Classification / Risk
- Work item type: BUG | FEATURE | UPDATE
- Bug severity: blocker | high | medium | low | n/a
- Feature change type: ADDITIVE | MODIFY | REMOVE | n/a
- Scope: SINGLE_SURFACE | CROSS_CUTTING | SHARED_FOUNDATION
- Root cause category: PERMISSION_SCOPE | TENANT_BOUNDARY | API_CONTRACT | MOCK_REAL_DATA_BOUNDARY | STATE_CACHE | SCHEMA_DOMAIN | UI_LOGIC | CONFIG_ENV | RACE_TIMING | UNKNOWN | n/a
- Review level expected: FAST | NORMAL | STRICT
- Blast radius: <files/modules/API/client/data affected>
- Doc impact: API_SPEC | ERD | DESIGN | GAPS | NO_DOC_IMPACT
- Decision impact: YES | NO — if YES, append `.context/decisions.md`

## Phase
<N>   # 1 Schema/domain · 2 Backend/API · 3 UI · 4 Integration · 5 Test/UAT

## Description
{Mục tiêu rõ ràng, ngắn gọn}

## Root cause (bug only)
{Triệu chứng → nguyên nhân gốc + evidence; KHÔNG fix khi chưa có}

## Dependencies
- task-<XX> (lý do)

## Acceptance Criteria
- [ ] Tiêu chí đo được, testable

## Verification Plan
- Commands: lệnh đúng repo trong `.agent/PROJECT_PROFILE.md` (vd `<pm> --filter <pkg> test`) hoặc `skip, no app configured`
- Manual/UAT evidence: <if needed>
- Reviewer report path: `.context/review-reports/<feature|bug>-<slug>-phase-<N>-task-<NN>-round-<R>-review.md`

## Retry / Error Memory
- Attempt: 0 | 1 | 2 | 3
- Last failure type: test_failure | lint_error | build_error | review_fail | runtime_error | n/a
- Error memory entry: `.context/error-memory.md#entry-...` | none
- Escalation: none | error_analyzer | architecture_review_needed | blocked

## Repro Verification (bug only)
- Original repro:
- Expected:
- Actual before fix:
- Actual after fix:
- Evidence:
- Status: PASS | FAIL | BLOCKED

## Feature Verification (feature/update only)
- Acceptance criteria: PASS | FAIL | BLOCKED
- Verify commands + result:
- Reviewer verdict: PASS | FAIL
- Spec Validator verdict (phase close): PASS | FAIL | n/a

## Doc / Decision Impact
- Doc impact result: <updated docs or `no doc impact`>
- Decision log: `.context/decisions.md#...` | none

## Commit / Tracking
- Commit: <sha after PASS commit | pending>
- Commit source of truth: changed files, timestamp, SHA, rollback point
- Task source of truth: root cause, repro/evidence, residual risk, doc impact/reconcile, verification summary
- Progress source of truth: `.context/progress.json` current status, active/completed phase/task, reviewer result/report path

## DoD (Definition of Done)
- [ ] Code written (chỉ trong scope)
- [ ] Tests added + pass (bug: test tái hiện fail trước fix)
- [ ] Check commands pass (theo `.agent/PROJECT_PROFILE.md`)
- [ ] Reviewer độc lập PASS (`.opencode/agent/reviewer.md`)
- [ ] `.context/progress.json` updated
- [ ] Error Memory updated for every failed attempt, or `n/a` recorded
- [ ] Doc Impact reconciled, or `no doc impact` recorded
- [ ] Decision log updated if `Decision impact: YES`
- [ ] Commit created after PASS close-out (1 task = 1 commit, unless reason recorded)

## Files to Create/Modify
- `<path>`

## Notes
{Edge cases, gotchas, giả định đã nêu}
```

## Rules

1. Task maintenance sinh bởi **Change Request workflow** hoặc **Bug workflow** (`.agent/FEATURE_WORKFLOW.md`).
2. **Mỗi bug / mỗi feature tách task riêng** — không gộp nhiều bug/feature vào 1 task/diff
   (trừ khi cùng root cause / cùng scope — ghi rõ lý do).
3. Chốt **thứ tự ưu tiên với user**, xử lý **tuần tự**.
4. Task nhỏ, focused (1–3 files). Acceptance criteria **testable**, không mơ hồ.
5. Không nhảy phase: schema → API → UI → integration → UAT.
6. Task **đã PASS** thì không sửa lại — cần đổi sau PASS thì tạo task mới. Khi task **chưa PASS**, builder cập nhật trong cùng task theo `.agent/FEATURE_WORKFLOW.md` §3.6. **WIP/checkpoint ghi ở `.context/runs/<type>-<slug>-<phaseTask>.md`** (FW § Session handoff & resume), không nhét vào task file.
7. `tasks/bug-<slug>/scan.md` sinh bởi `/bug-check` là **read-only report** — không sửa code,
   không phải task; user chọn defect xong mới tạo task `/bug` cho từng defect.
8. Mọi task bug/feature/update phải có `Classification / Risk`, `Retry / Error Memory`,
   `Repro Verification` (bug) / `Feature Verification` (feature/update), và `Doc / Decision Impact` trước khi Builder bắt đầu.
9. Bug 1 dòng được `/bug` cho phép sửa không tạo task thì commit body bắt buộc có trailer
   `Repro-Verification: <short evidence of root cause + expected/actual>`, và reviewer phải ghi report
   `.context/review-reports/bug-<slug>-one-line-review.md` (chứa Repro Verification) để qua close-out gate.

## Greenfield

Kế hoạch layer-0..N do `.agent/graph.md` sinh ra: mỗi layer chứa task song song, task nhỏ 1–3 file.
Format task greenfield xem lịch sử template / `.agent/graph.md`; sau khi build xong thì dùng maintenance format ở trên.
