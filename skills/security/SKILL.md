---
name: security
description: "Security review cho mobile app + API: OWASP API Top 10, mobile auth & token/session security, secure defaults/sharp edges, Semgrep scan, supply-chain audit. Front-load keyword: security, OWASP, auth, token, JWT, session, secret, upload, semgrep, dependency/CVE. Dùng khi code/review auth, storage, API endpoint, secret, upload, dependency, hoặc chạy security gate trước commit/CI."
---

# Security Review (Mobile + API) (Curated)

Wrapper skill cho checklist security khi build/review app mobile và API. Áp dụng khi vùng chạm tới auth, token, secret, storage, upload, endpoint hoặc dependency.

## Khi nào dùng

- Code/review **authentication, token/session, refresh token, storage** trên mobile.
- Thêm/sửa **API endpoint** hoặc xử lý input/upload.
- Review **config, secret, quyền truy cập file/storage**.
- Thêm dependency mới hoặc chạy **security gate** trước commit/CI.

## File tham khảo trong thư mục này

- `api-owasp.md` — OWASP API Top 10 trong context mobile (auth, broken object/function level auth, rate limit, injection, misconfig, logging).
- `mobile-auth.md` — mobile API auth + token security (lưu token, refresh, revoke, checklist test/review).
- `sharp-edges.md` — secure-by-default, vulnerable defaults, các API/config dễ gây lỗi bảo mật.
- `semgrep-scan.md` — lệnh Semgrep quick/full/TS-RN/changed-files cho reviewer gate.
- `supply-chain-audit.md` — tiêu chí dependency rủi ro cao + audit supply chain.

## Quy tắc rút gọn

- Secret/token chỉ đọc từ env hoặc secure storage; **không hardcode/commit** (xem `.agent/PROJECT_PROFILE.md` §Secrets).
- Không log token/secret/PII.
- Mọi endpoint ghi phải kiểm tra auth + ownership (object-level authorization).
- Dependency mới: chạy audit, tránh package ít maintainer/không update.
