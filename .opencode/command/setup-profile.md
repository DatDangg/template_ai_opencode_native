---
description: Onboarding repo thật — auto-detect stack, hỏi branch/DB, ghi .agent/PROJECT_PROFILE.md, sync quyền verify command.
---

Chạy **Project Profile Setup** cho repo hiện tại. Đây là bước chạy khi clone template
vào project thật — Phase 0.5 của pipeline greenfield (`AGENT.md`) gọi command này; re-run bất kỳ
lúc nào để đổi cấu hình (branch, verify command, model...). Mục tiêu: biến placeholder trong `.agent/PROJECT_PROFILE.md`
thành giá trị thật để builder/reviewer biết chạy lệnh gì và `/bug`, `/feature` biết commit/push ở đâu.

`$ARGUMENTS`

## Bước 0 — Auto-detect (không hỏi)

1. Chạy `node scripts/detect-profile.mjs` và đọc JSON trả về.
2. Nếu script không tồn tại, đọc repo thủ công: lockfile, `package.json` scripts, `source_roots`,
   `**/prisma/schema.prisma` hoặc `**/drizzle.config.*` (monorepo: tìm trong `apps/*`, `packages/*`, không chỉ root).
3. Hiển thị gọn giá trị detect được + `warnings` (nếu có).

## Bước 1 — Hỏi bắt buộc (từng câu một, KHÔNG đoán)

1. **`target_branch`** — branch đích để commit/push (vd `staging`, `develop`). Không được là `main`
   nếu `forbidden_branch: main`.
2. **`forbidden_branch`** — branch cấm push. Mặc định `main`, chỉ cần confirm.
3. **`auto_commit_after_pass`** — `true|false`. Giải thích rõ: commit sau PASS review là **bắt buộc luôn**;
   flag này chỉ quyết định có **tự PUSH** lên `target_branch` sau PASS hay không.

## Bước 2 — Confirm giá trị detect được (user sửa nếu sai)

4. Stack + `package_manager` + `source_roots`.
5. Verify commands: `install`, `lint`, `typecheck`, `test`, `build`. Nếu repo không phải Node hoặc
   `package.json` không có script → hỏi user hoặc để `null` (workflow sẽ ghi `skip, no app configured`).

## Bước 3 — DB (chỉ khi detect/confirm `db_tool != none`)

6. Confirm `db_tool` và `migration_required`.
7. Hỏi `staging_db` và `prod_db` — ghi **tên env var**, KHÔNG ghi secret/connection string.
   Bắt buộc `staging_db != prod_db`; nếu trùng → dừng, báo user (workflow cấm dùng chung/sync data staging↔prod).
8. Hỏi `migration_command` nếu project có lệnh migrate riêng (vd `pnpm prisma migrate deploy`).

## Bước 4 — Ghi `.agent/PROJECT_PROFILE.md`

- Fill đúng các field đã chốt, **giữ nguyên cấu trúc + comment** của file.
- KHÔNG ghi secret/token/connection string; secret chỉ đọc từ env.
- Field không xác định để `null` / giữ placeholder, không bịa.

## Bước 5 — Sync agent cho role (dry-run trước, ghi sau)

### 5a — Model theo role

Bước này chạy được cả lần đầu **và** khi muốn đổi model sau này (re-run `/setup-profile`).

1. **Lấy danh sách model khả dụng** (live từ provider đã đăng nhập):
   - Lấy 4 ứng viên khác family, ưu tiên gateway đang dùng:
     `node scripts/resolve-model.mjs --suggest --count 4` → JSON `suggestions[] { model, family, name }`.
   - Muốn xem hết: `node scripts/resolve-model.mjs --list`.
   - Nếu script báo thiếu auth/catalog → ghi rõ, cho user nhập tay `provider/model` và bỏ qua validate.
2. **Với từng role** `builder`, `builder_strong`, `reviewer`, `spec_validator`:
   - `default` = giá trị hiện có trong block `models:` của `.agent/PROJECT_PROFILE.md` (lần đầu chưa có
     thì lấy suggestion đầu).
   - Trình bằng `question` tool (single-select, cho "Type your own answer"):
     - Option đầu = `default`, label `<model> (Recommended)`, description `đang dùng`.
     - Option còn lại = label là chuỗi model, description ngắn lấy từ catalog: `family: <family>`
       (hoặc `khác family với <role>` nếu hữu ích).
     - **KHÔNG** dùng description kiểu "Gợi ý 1 / Gợi ý 2" — vô nghĩa và xấu.
   - Chọn 1 option → dùng model đó; đóng/không chọn (Enter) = giữ `default`.
   - Gõ tên (kể cả gần đúng) → chạy `node scripts/resolve-model.mjs "<input>"` và đọc JSON:
     - `confidence` = `exact` / `id` / `contains` → dùng `resolved`, báo user đã chuẩn hoá thành gì.
     - `confidence` = `fuzzy` → in `resolved` + `alternatives`, **bắt user xác nhận** rồi mới dùng;
       user từ chối thì hỏi lại.
     - `confidence` = `none` → in `alternatives` (nếu có), hỏi lại; **không ghi bừa** giá trị không khớp.
   - Ghi giá trị đã chốt vào block `models:` (giữ nguyên cấu trúc/comment của file).
3. **Cảnh báo family** (advisory, không chặn): `builder` ≠ `reviewer` nên khác **model family** để lộ
   blind spot; nhưng vẫn hợp lệ nếu user chỉ có 1 model/family khả dụng. Lưu ý family ≠ gateway:
   cùng một gateway (vd `opencode-go`) vẫn phục vụ nhiều family.
4. **Sync xuống agent**: chạy `node scripts/apply-agent-models.mjs` (dry-run) cho user xem, rồi
   `node scripts/apply-agent-models.mjs --write` để ghi `model:` frontmatter vào
   `.opencode/agent/{builder,builder-strong,reviewer,spec-validator}.md`.
5. Chỉ **dừng** khi script exit code khác 0 do lỗi thật (thiếu agent file / không parse được `models:`).
   `bug-check-scanner` kế thừa model primary (chủ ý) nên không nằm trong script này.

### 5b — Quyền verify command

1. Chạy `node scripts/apply-verify-permissions.mjs` (**mặc định dry-run**, chưa ghi).
   Script đọc command trong profile, tự bỏ qua command không an toàn (quote/backslash, wildcard toàn bộ,
   DB-destructive, git-mutating, `--force`) và in danh sách `Bỏ qua` kèm lý do.
2. Xem output:
   - Command đủ an toàn → sẽ được auto-allow.
   - Command bị bỏ qua → **hỏi user**: có muốn tự thêm allow rule không? Nếu có, hướng dẫn sửa tay
     block `# verify-commands:start` … `# verify-commands:end` trong `.opencode/agent/reviewer.md`,
     `.opencode/agent/spec-validator.md` và `.opencode/agent/bug-check-scanner.md`.
3. Chỉ khi user đồng ý với danh sách auto-allow, chạy lại `node scripts/apply-verify-permissions.mjs --write`
   để ghi file.
4. Nếu script exit code khác 0 (thiếu marker `# verify-commands:start/end`) → **dừng**, báo chưa hoàn tất,
   không tự thêm marker vào file agent.
5. Không auto-allow `migration_command` (lệnh migrate) — để user tự thêm nếu thật sự cần.
6. Pattern sinh ra là **exact** (không nối `*`) để tránh `cmd && lệnh phá hoại` đi kèm.

## Bước 6 — Tóm tắt

In ra:
- `target_branch`, `forbidden_branch`, `auto_commit_after_pass`
- package manager + verify commands đã ghi
- `db_tool`/`migration_required` + `staging_db`/`prod_db`
- model đã sync cho từng agent role + allow rules đã sync
- nhắc: **quit và restart opencode** vì `.opencode/*` và config không hot-reload.

Không commit/push trong bước này. Nếu `PROJECT_PROFILE.md` còn field quan trọng chưa chốt, ghi rõ
là chưa hoàn tất thay vì báo done.
