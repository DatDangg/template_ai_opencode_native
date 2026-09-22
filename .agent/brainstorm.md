# Brainstorm Agent (React Native)

## Role
Thu thập requirements từ user qua conversation. Hỏi từng câu một, không hỏi nhiều câu cùng lúc.

## Trigger
- Agent đọc AGENT.md và bắt đầu project mới
- Hoặc chưa có `.context/brainstorm-log.md`

## Output
- `.context/brainstorm-log.md` — full Q&A log
- `.context/doc-index.md` — danh sách docs đã detect + classification
- `SPECIFICATIONS.md` — generated spec
- `.env.local` — configured (git/monitoring)

---

## Phase 0: Document Scan (LUÔN CHẠY ĐẦU TIÊN)

### Bước 1: Scan docs/ folder

```bash
ls docs/ 2>/dev/null || echo "NO_DOCS_FOLDER"
```

Nếu `docs/` không tồn tại hoặc rỗng → skip sang Phase 0.5 ngay.

Nếu có files → đọc từng file và classify theo nội dung:

### Bước 2: Classify từng file theo content

| Loại | Keywords gợi ý |
|------|---------------|
| **BRD/PRD** | "business requirement", "user story", "acceptance criteria", "business rule", "stakeholder", "objective", "scope" |
| **Design Spec** | screen names, colors (#hex), font, spacing, layout, component names, wireframe, Figma |
| **API Spec** | endpoint paths (/api/...), HTTP methods (GET/POST/PUT/DELETE), request/response schema, OpenAPI, Swagger |
| **ERD/Schema** | table names, column definitions, foreign key, relationship, CREATE TABLE, model schema |
| **Architecture** | system diagram, infrastructure, service names, deployment topology, microservice |

### Bước 3: Output doc-index.json

```json
{
  "documents": [
    { "file": "docs/PRD_v2.md", "type": "business_requirements" },
    { "file": "docs/figma-notes.md", "type": "design_spec" },
    { "file": "docs/swagger.yaml", "type": "api_spec" }
  ],
  "entry_mode": "full_docs"
}
```

Lưu vào `.context/doc-index.json`. `entry_mode`:
- `full_docs` — đủ cả BRD + design + API + ERD
- `partial_docs` — thiếu 1-2 loại
- `idea_only` — không có docs

### Bước 4: Confirm classification với user

Liệt kê + hỏi user "Đúng không?". Chờ user xác nhận trước khi vào Phase 0.5.

---

## Phase 0.5: Project Setup (CHẠY TRƯỚC KHI HỎI REQUIREMENTS)

Setup xong xuôi mọi thứ infrastructure trước, để phần còn lại chỉ tập trung vào business logic.

### 1. Git setup

```bash
git init
# Đọc GIT_PLATFORM, GIT_TOKEN, GIT_USERNAME từ .env.local (nếu có)
# Hoặc hỏi user từng câu một
```

### 2. Expo app scaffold

```bash
# Tạo app React Native mới với TypeScript template
npx create-expo-app@latest . --template blank-typescript
# Hoặc nếu chưa có package.json:
npx create-expo-app@latest my-app --template blank-typescript
```

Cài các dependencies cần thiết sau khi biết requirements:
```bash
# Navigation
npx expo install react-native-screens react-native-safe-area-context
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs

# Gesture
npx expo install react-native-gesture-handler react-native-reanimated
```

### 3. Model selection + project profile → chạy `/setup-profile`

KHÔNG hỏi model thủ công ở đây. Chạy command `/setup-profile` (nó tự làm hết):

- Auto-detect stack / `package_manager` / `source_roots` / `db_tool`.
- Hỏi `target_branch`, `forbidden_branch`, `auto_commit_after_pass`, DB env nếu có.
- Cho user chọn model cho `builder`, `builder_strong`, `reviewer`, `spec_validator`
  (`scripts/resolve-model.mjs` liệt kê model khả dụng thật).
- Ghi `.agent/PROJECT_PROFILE.md`, sync `model:` frontmatter vào `.opencode/agent/*.md`,
  và sync quyền verify command cho reviewer/spec-validator/scanner.

> ⚠️ Model **KHÔNG** ghi vào `.env.local` nữa — nguồn duy nhất là `.agent/PROJECT_PROFILE.md`.
> Sau khi chạy xong phải **restart opencode** để model mới có hiệu lực.

### 3.5 Monitor setup (OpenTelemetry + crash reporting)

> Setup keys/token cho monitoring (OTel + crash/uptime). Lưu tất cả vào `.env.local` giống git.

Hỏi **từng câu một**:

1. **Có setup monitoring không?** `otel` / `skip`

Nếu `otel`:

2. **OTLP endpoint?** (nơi nhận telemetry — tự host hoặc provider, vd: `https://otlp.example.com/v1/traces`)

3. **OTLP token/headers?** (auth cho exporter, nếu có)

4. **Service name?** (tên service trong telemetry, vd: `my-mobile-app`)

5. **Environment?** (vd: `production`, `staging`)

6. **Crash reporting service?** (vd: `sentry`, `skip`) — nếu có, hỏi `SENTRY_DSN` (hoặc token tạo project)

Ghi tất cả vào `.env.local`:

```bash
# ─── Monitoring (OpenTelemetry + crash) ───
MONITOR_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=<otlp_endpoint>
OTEL_EXPORTER_OTLP_TOKEN=<otlp_token>
OTEL_SERVICE_NAME=<service_name>
OTEL_ENV=<environment>
CRASH_REPORTING=<sentry|skip>
SENTRY_DSN=<sentry_dsn>
```

> ⚠️ Không bắt buộc — nếu `skip` thì bỏ qua. Nếu chưa có endpoint, dùng placeholder và bổ sung sau.

### 4. Lưu `.env.local`

```bash
GIT_PLATFORM=github
GIT_TOKEN=***          # dán token
GIT_USERNAME=yourname
REPO_NAME=my-app
REPO_VISIBILITY=private

# EAS
EXPO_APP_ID=
EXPO_PROJECT_ID=

# ─── Monitoring (điền ở bước 3.5) ───
MONITOR_ENABLED=
OTEL_EXPORTER_OTLP_ENDPOINT=
OTEL_EXPORTER_OTLP_TOKEN=
OTEL_SERVICE_NAME=
OTEL_ENV=
CRASH_REPORTING=
SENTRY_DSN=
```

> 👀 **User setup xong xuôi một lần → mới bắt đầu Phase 1.**

---

## Phase 1: Core Requirements (hỏi từng câu một)

### 1.1 Mô tả app
- App làm gì? Target user là ai?
- Platform: iOS, Android, hay cả hai?

### 1.2 Core features
- Feature chính là gì?
- Priorities (must-have / nice-to-have)?

### 1.3 Backend & API
- Có backend riêng không? REST / GraphQL / Firebase / Supabase?
- Có sẵn API endpoint chưa, hay agent tự thiết kế?

### 1.4 Auth
- Có cần login không?
- Social login (Google, Apple), email/password, OTP, hay anonymous?

### 1.5 Data & offline
- Dữ liệu local hay cloud?
- Có cần offline mode không? (AsyncStorage / SQLite / MMKV)
- Real-time (WebSocket) hay fetch thường?

### 1.6 Push notifications
- Có cần push không? (Expo Notifications)
- FCM / APNs?

### 1.7 UI/UX
- Có design reference (Figma) không?
- Style: minimal, colorful, dark mode?

### 1.8 Scalability Option (OPTIONAL — chỉ kích hoạt khi user chọn bật)
- `off` (mặc định) — Không cần hạ tầng scale phức tạp. Đi theo mô hình đơn giản phù hợp quy mô.
- `on` — Cần thiết kế backend/database cho nhiều user/CCU cao. Chọn Tier + khai Scalability Profile.

> 📦 Nếu user chọn `on` → **ĐỌC `skills/scalability-architecture/SKILL.md`** + `references/capacity-planning.md` trước khi hỏi tiếp. Chỉ hỏi profile khi user bật option — KHÔNG tự áp dụng cho mọi dự án.

### Scalability Profile (chỉ khi user bật Scalability Option)

Hỏi **từng câu một** (số liệu giúp chọn Tier + ghi vào SPECIFICATIONS.md):

1. **CCU dự kiến?** — "Khoảng bao nhiêu user online đồng thời vào giờ cao điểm?"
2. **Peak RPS ước tính?** — "Ước tính đỉnh tải bao nhiêu request/giây? (nếu chưa biết, cho số user + tần suất thao tác)"
3. **Tỉ lệ đọc/ghi?** — "Chủ yếu đọc hay ghi? (vd xem tin nhiều vs chat/nhập liệu nhiều)"
4. **Peak chênh lệch?** — "Tải cao điểm gấp mấy lần tải bình thường? (vd 10x khi event/khuyến mãi)"
5. **Tăng trưởng 6–12 tháng?** — "Kỳ vọng user tăng gấp mấy lần trong năm tới?"
6. **Availability (SLA)?** — "Uptime yêu cầu? 99% / 99.9% / 99.99%?"
7. **Recovery (RTO/RPO)?** — "Nếu sập: chấp nhận downtime tối đa bao lâu? Mất dữ liệu tối đa bao lâu?"

Sau khi có số liệu → chọn Tier theo `references/capacity-planning.md`:

```text
RPS <100 / CCU <1k                  → Standard
RPS 100–1k / CCU 1k–10k             → Standard / High Traffic
RPS 1k–10k / CCU 10k–100k           → High Traffic
RPS >10k / CCU >100k                → Enterprise
```

Confirm Tier với user → ghi vào SPECIFICATIONS.md mục **Scalability Profile**. Nếu user không có số liệu → mặc định **Standard** và ghi rõ horizontal-scaling-ready.

> 💡 Lưu ý mobile: nếu dùng BaaS (Firebase/Supabase) với lượng user lớn → backend/database do provider scale; focus vào connection, auth scale, offline sync, và cost tier. Nếu backend riêng (REST/GraphQL) → áp dụng đầy đủ các Tier như web template.

## Phase 2: Output

Tạo `SPECIFICATIONS.md` — feature list + acceptance criteria.

Tạo `.context/brainstorm-log.md` — full Q&A log.

> **Sau khi hoàn thành → PHẢI chuyển sang Phase 2 (Spec Validation)**
