---
description: Read-only soi/kiểm tra một màn hoặc khu vực, liệt kê defect. KHÔNG sửa code.
agent: bug-check-scanner
---

Chạy **Bug discovery (sweep)** — chế độ **READ-ONLY** — trong `AGENTS.md`,
`.agent/FEATURE_WORKFLOW.md` (§2b) cho khu vực/màn sau:

`$ARGUMENTS`

> ⚠️ **This command is prompt-enforced read-only**; the final read-only check is **mandatory**.
> Kiểm chứng bằng **baseline diff**, KHÔNG dùng `git status` toàn cây (cây có thể đã dirty sẵn):
> chụp `git status --short` ở **đầu lượt** làm baseline; cuối lượt chỉ tính vi phạm nếu có file
> MỚI/thay đổi ngoài baseline và ngoài `tasks/bug-<slug>/scan.md` → **stop and report the violation**.
> Không đổi command này thành builder flow — không build, không fix, không sửa code.

Bạn là người **soi lỗi**, KHÔNG phải người sửa lỗi. Tuyệt đối tuân thủ:

1. **KHÔNG sửa code** — không edit bất kỳ file nguồn nào, không refactor, không format.
2. **KHÔNG gọi subagent `builder` / `builder-strong`**.
3. **KHÔNG update** `.context/progress.json`, **KHÔNG commit / push / deploy**.
4. **KHÔNG sửa mò** — chỉ ghi nhận điều quan sát được, đánh dấu rõ chỗ chưa chắc chắn.
5. Chỉ được phép **tạo/ghi đúng một file**: `tasks/bug-<slug>/scan.md`
   (`<slug>` = slug ngắn mô tả khu vực, vd `checkout-flow` → `tasks/bug-checkout-flow/scan.md`).
6. Nếu khu vực mơ hồ tới mức không xác định được phạm vi → hỏi lại 1 lần rồi mới soi.

## Cách soi (chỉ đọc)

- Đọc `.agent/PROJECT_PROFILE.md` trước để lấy `source_roots`; nếu `source_roots: []` hoặc placeholder
  → ghi `skip, no app configured` / `[cần xác nhận]`, không tự hardcode path app.
- Phân loại phạm vi trước khi soi:
  - **SINGLE-SURFACE**: 1 màn/luồng cụ thể.
  - **CROSS-CUTTING**: lỗi lặp hệ thống như theme/dark mode, permission, i18n, tenant/campus,
    responsive, format tiền/ngày, a11y, loading/empty state.
- SINGLE-SURFACE: xác định màn hình / module / route / file liên quan.
- CROSS-CUTTING: bắt buộc enumerate toàn bộ surface ứng viên trước khi kết luận, **CẤM sampling**.
  Theo từng `source_roots`, liệt kê screen `app/**/*.tsx`, layout `app/**/_layout.tsx`, component dùng chung
  `components/**/*.tsx`, hook `hooks/**/*.ts`, service/API client `services/**/*.ts` (RN không có CSS).
- CROSS-CUTTING query count-based: đếm match theo từng file. File `count=0` vẫn coi là đã soi và ghi coverage;
  file `count>0` chỉ đọc đúng vùng match để xác nhận, loại trừ variant hợp lệ như `dark:` hoặc design token đúng.
- Chia batch 15–25 file/batch; append `scan.md` sau **mỗi batch**, không chờ cuối.
- Không kết luận khi coverage chưa đủ. Chỉ dừng khi 100% surface đã enumerate hoặc liệt kê rõ `## Chưa soi`
  với lý do và `% đã soi`.
- Đọc code + trace luồng; đối chiếu `docs/**`, `SPECIFICATIONS.md`, `.agent/PROJECT_PROFILE.md`.
- Với mỗi nghi vấn: xác định **tái hiện** (điều kiện, bước), **expected vs actual**,
  **root cause kèm `file:line`** (nếu chưa chắc ghi `nghi ngờ` + lý do).
- CRUD/capability: **KHÔNG đánh giá cấp module**. Mỗi API collection/mutation
  (`GET/POST/PATCH/DELETE /module/resource`) là **một dòng capability riêng**.
- `Create UI = Có` chỉ khi đúng resource đó có nút/form; không suy từ resource khác cùng module.
- API có `POST` nhưng FE chỉ list, không có nút/form/empty CTA → ghi DEFECT hoặc `[cần xác nhận]`.
- Empty state không chỉ cách tạo data nguồn → ghi DATA_SETUP/UX_DEFECT.
- Ưu tiên chạy check read-only để có bằng chứng (đọc `.agent/PROJECT_PROFILE.md` →
  `web_typecheck_command`, `web_lint_command`, `api_typecheck_command`, `api_lint_command`,
  `test_command`; `check_commands` chỉ là alias tổng hợp nếu project đã điền).
  Không chạy lệnh ghi/xóa/mutate dữ liệu. Nếu project chưa có app code hoặc command chưa cấu hình
  → ghi `skip, no app configured`, không coi là workflow fail.

## Output — bắt buộc ghi vào `tasks/bug-<slug>/scan.md`

```markdown
# Scan: <khu vực> — <YYYY-MM-DD>

## Phạm vi đã soi
- ...

## Classification
- Type: SINGLE-SURFACE | CROSS-CUTTING
- Source roots: ...

## Coverage
- Enumerated surfaces: <n>
- Đã soi: <n>
- Coverage: <percent>%

| File | Surface type | Batch | Count | Kết luận |
|---|---|---:|---:|---|
| `path/file.tsx` | screen/layout/component/hook/service | 1 | 0 | soi, no match |

## Chưa soi
- <file/surface> — <lý do> — <% còn lại>

## CRUD / Capability Matrix

| Module | Sub-resource/API | FE section/table | List | Create UI | Edit UI | Delete UI | Empty CTA | Evidence |
|---|---|---|---|---|---|---|---|---|
| ... | `GET/POST/PATCH/DELETE /module/resource` | ... | Có/Không | Có/Không/[cần xác nhận] | Có/Không | Có/Không | Có/Không | `file:line` |

## Defects

| # | Mô tả | Tái hiện | Expected | Actual | Root cause (file:line) | Severity | File cần sửa | Ước lượng |
|---|-------|----------|----------|--------|------------------------|----------|--------------|-----------|
| 1 | ... | ... | ... | ... | `path/file.ts:42` | blocker/high/medium/low | ... | S/M/L |

## Chưa xác minh / cần thêm info
- ...
```

## Kết thúc

1. In bảng defect ở trên cho user.
2. **DỪNG — chờ user chọn defect** muốn xử lý (user sẽ chạy `/bug` cho từng defect).
3. **Kiểm chứng read-only bằng baseline diff** (không dùng `git status` toàn cây):
   - Đầu lượt: chạy `git status --short`, ghi nhận danh sách file đã dirty sẵn (baseline).
   - Cuối lượt: chạy lại `git status --short`; chỉ tính **vi phạm** nếu có file MỚI/thay đổi
     ngoài baseline và ngoài `tasks/bug-<slug>/scan.md`.
   - Có vi phạm → **stop and report violation** ngay (bạn đã vi phạm read-only).
   - Cây vốn đã dirty sẵn (không phải do lượt này) → **không** báo vi phạm.
