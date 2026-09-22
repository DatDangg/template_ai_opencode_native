# docs/generated/ — Auto-generated (không sửa tay)

Sinh bởi `scripts/generate-inventory.mjs`, đọc từ code trong `source_roots`
(`.agent/PROJECT_PROFILE.md`). Deterministic — chạy lại cho kết quả giống nhau (theo git HEAD).

## Chạy

```bash
node scripts/generate-inventory.mjs
# hoặc, khi project đã khai script:
<pkg-manager> docs:inventory
```

## Quy tắc

- **KHÔNG sửa tay** file trong thư mục này — sẽ bị ghi đè.
- Đây là **pointer**: docs canonical (`reviewed/API_CONTRACTS_P0.md`, `reviewed/ERD_REVIEW_P0.md`,
  `API_SPEC.md`, `ERD.md`) trỏ về đây, không nhúng code/schema tay.
- `inventory.md` hiện liệt kê file + thống kê. Có thể mở rộng để extract route/schema khi có code thật.
