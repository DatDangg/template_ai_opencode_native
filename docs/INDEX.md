# docs/ — Project Documentation

This folder contains your project's design documents.
The Brainstorm agent will **auto-scan and classify** all files here.

## Optional: Manual Index

If you want to hint the agent about each file's type, fill in below.
Otherwise, leave this file as-is and the agent will classify by content.

```yaml
# Uncomment and fill in as needed:
# - filename.md: brd              # Business Requirements Document
# - filename.md: prd              # Product Requirements Document
# - filename.md: design           # UI/UX Design Spec (Figma, wireframes)
# - filename.md: api_spec         # API Spec (OpenAPI/Swagger/endpoint list)
# - filename.md: erd              # Database Schema / ERD
# - filename.md: architecture     # System Architecture
# - filename.md: other            # Other reference docs
```

## Supported Doc Types

| Type | Keywords agent looks for | Effect on brainstorm |
|------|--------------------------|----------------------|
| **BRD/PRD** | user story, acceptance criteria, business rule, feature list | Skip feature questions already covered |
| **Design Spec** | screen name, color, typography, layout, component, Figma | Skip UI/design questions |
| **API Spec** | endpoint, request, response, OpenAPI, swagger, REST | Skip API design questions |
| **ERD/Schema** | table, column, foreign key, index, relationship | Skip data model questions |
| **Architecture** | service, microservice, deployment, infrastructure | Skip stack/deploy questions |

## No docs yet?

That's fine — just leave this folder empty (or delete it).
The agent will run a full brainstorm instead.

---

## Phân loại canonical / historical (workflow maintenance)

> Dùng cho gate **Doc Impact & Reconcile** (`.agent/FEATURE_WORKFLOW.md` §6).
> Đây là mặc định của template — project có thể đổi tên file, nhưng phải khai ở bảng dưới
> để workflow reconcile đúng chỗ.

### Canonical — source of truth (dùng để validate & reconcile)

| File | Loại | Ghi chú |
|---|---|---|
| `API_SPEC.md` | api_spec | Overview/pointer tới contract thật (vd `reviewed/API_CONTRACTS_*.md` nếu có) |
| `ERD.md` | database_schema | Overview/pointer tới schema thật (vd `reviewed/ERD_REVIEW_*.md` nếu có) |
| `DESIGN.md` | design_spec | Screen/component, design tokens |
| `ARCHITECTURE.md` (nếu có) | architecture | Stack, pipeline, lộ trình |
| `BRD.md` / `PRD.md` (nếu có) | intent | **Intent** — chỉ đổi qua Change Request + user duyệt |
| `generated/` | generated | Sinh bởi `scripts/generate-inventory.mjs` — **không sửa tay** |

### Historical — tham khảo (không dùng để chặn)

| File | Ghi chú |
|---|---|
| `<source doc>` | Bản gốc để đối chiếu |
| `<store metadata>` | Metadata store — tham khảo |

> Docs canonical là overview + pointer, **không nhúng code/schema tay**.
