# PROJECT_PROFILE.md — Parameterize the workflow

> **Điền file này khi clone template.** Mọi workflow/subagent đọc giá trị ở đây,
> KHÔNG hardcode branch / package manager / DB / lệnh check trong generic docs.
> Nếu file còn placeholder (`<...>`) → coi như chưa cấu hình, phải hỏi user.
>
> 💡 Cách điền: chạy `/setup-profile` — auto-detect stack rồi hỏi branch/DB và ghi file này,
> kèm sync model + quyền verify command cho reviewer/spec-validator.
> Phase 0.5 của pipeline greenfield (`AGENT.md`) gọi chính command này.

## Profile

```yaml
project: <project-name>
output_language: vi            # vi | en — ngôn ngữ cho docs/summary

# ── Git ──
target_branch: <target-branch> # default staging-direct: current branch phải là branch này khi commit/push PASS; chưa điền = hỏi user
forbidden_branch: main         # cấm push trực tiếp (opencode.jsonc hard-deny main/ref main)
branch_pattern: "<target-branch>"  # default staging-direct; feature/<slug>|bug/<slug> chỉ khi user yêu cầu feature branch
auto_commit_after_pass: false  # @deprecated name — ý nghĩa thật là AUTO-PUSH: commit sau PASS luôn bắt buộc; true = tự `git push origin <target_branch>` sau PASS

# ── Package / source ──
package_manager: <pnpm|npm|yarn|bun|none>   # none/chưa điền = không hardcode lệnh
source_roots: []               # vd [apps/mobile, apps/api, packages/shared] cho monorepo

# ── Verify commands (null/placeholder = skip, no app configured) ──
# NOTE: field `web_*` dùng cho app chính (mobile/web); `api_*` cho backend.
web_typecheck_command: null
web_lint_command: null
api_typecheck_command: null
api_lint_command: null
test_command: null
install_command: null
lint_command: null
typecheck_command: null
build_command: null
migration_command: null        # only used when db_tool != none and migration_required: true

# ── Database ──
db_tool: none                  # none | prisma | drizzle | other
migration_required: false      # true nếu cần migration versioned (chỉ khi db_tool != none)
staging_db: <ENV_VAR_STAGING>  # TÊN ENV VAR, không phải connection string/secret
prod_db: <ENV_VAR_PROD>        # TÊN ENV VAR; phải khác staging_db
destructive_migration_policy: HIGH_RISK_MIGRATION
```

### DB / migration

- **`db_tool: none`** → project không dùng DB/ORM: **bỏ qua toàn bộ migration safety rules**
  (Phase 1 schema, migration gate ở `.agent/FEATURE_WORKFLOW.md` §6, ERD/migration checks).
- `db_tool != none` **và** `migration_required: true` → áp dụng migration gate:
  migration phải versioned + committed, không sửa migration đã apply.
- Không hardcode Prisma/Drizzle: dùng đúng `db_tool` đã khai.
- Trước commit phải inspect migration artifact theo `db_tool`/`migration_command`. Nếu có `DROP TABLE/COLUMN`,
  đổi type, `SET NOT NULL`, `UNIQUE/FK` trên data cũ, enum phá hoại, bulk transform/backfill
  → gắn `HIGH_RISK_MIGRATION`, không promote production, báo destructive op, table/column ảnh hưởng,
  tương thích data, backfill, rollback, kết quả verify staging.
- Cấm `db push`, `migrate reset`, seed/reset, clone data giữa staging/prod. Flow: dev → migration versioned
  → staging deploy bằng command đã cấu hình → verify → promote đúng migration đã test lên prod.
- `staging_db` phải khác `prod_db`; data độc lập; không sync data staging→prod.

## Check commands (chạy trước khi báo xong)

> Mọi người (builder/reviewer) PHẢI dùng đúng lệnh đã cấu hình ở profile, filter theo package bị đụng nếu monorepo.
> Nếu command là `null`/placeholder hoặc repo chưa có app code (`source_roots: []`) → ghi `skip, no app configured`.
> KHÔNG tự suy ra `npm test`, `pnpm lint`, Prisma, package name, hay path `apps/` khi chưa cấu hình.

```yaml
check_commands:                 # alias tổng hợp — điền sau khi có verify commands thật
  install: null
  web_typecheck: null
  web_lint: null
  api_typecheck: null
  api_lint: null
  test: null
  build: null
  migration: null               # khi migration_required=true
  docs_inventory: node scripts/generate-inventory.mjs
```

## Models per role

> Model KHÔNG đọc từ `.env.local`. Khai ở đây rồi **chạy `/setup-profile`** (hoặc
> `node scripts/apply-agent-models.mjs --write` khi đã điền tay) để ghi `model:` frontmatter
> vào `.opencode/agent/*.md`, rồi **restart opencode** (config không hot-reload).
> Quy tắc: **builder ≠ reviewer** khác **model family** (không nhất thiết khác gateway/provider prefix) để lộ blind spot khác nhau.

```yaml
models:
  builder:        <provider/model>
  builder_strong: <provider/model>   # chỉ dùng khi user yêu cầu rõ (§7 gate)
  reviewer:       <provider/model>
  spec_validator: <provider/model>
```

## UI rules (nếu project có UI)

```yaml
ui:
  device_targets: [small 360-390, large 414-430]   # React Native — không dùng breakpoint web
  max_file_lines: 300
  max_function_lines: 50
```

## Secrets

```yaml
secrets:
  source: env                    # chỉ đọc từ env; KHÔNG hardcode/commit
  required: []
```
