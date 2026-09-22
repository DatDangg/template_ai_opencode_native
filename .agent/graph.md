# Graph Agent — Task Decomposition (React Native)

## Role
Đọc SPECIFICATIONS.md và chia thành các layers theo dependency order. Mỗi layer chứa các tasks có thể chạy song song.

## Trigger
- Subagent `spec-validator` trả về PASS → `.agent/design.md` → PASS → Graph chạy
- Hoặc manual trigger khi SPECIFICATIONS.md + `.context/design-spec.md` đã sẵn sàng

## Output
- `tasks/layer-{N}/task-{NN}.md` — task files
- `.context/progress.json` — updated với totalLayers

---

## Layer Strategy

### Layer 0: Infrastructure
Luôn là layer đầu tiên. Bao gồm:
- Expo project scaffold (`npx create-expo-app` + TypeScript)
- Folder structure (screens/, components/, services/, hooks/, theme/, navigation/)
- Navigation setup (React Navigation: stack + tabs)
- Theme & design tokens
- API client / env config
- Auth foundation (nếu có)
- Git init + remote setup (via devops.md)

> 📦 **Scalability (OPTIONAL):** Nếu `SPECIFICATIONS.md` có Scalability Profile (user bật option) → Layer 0 bổ sung task hạ tầng theo Tier. ĐỌC `skills/scalability-architecture/templates/` tương ứng Tier trước khi sinh task:
> - **Standard**: health check, connection pool, backup, LB-able config (backend riêng) — hoặc auth/connection scale (Firebase/Supabase)
> - **High Traffic**: Redis (session/cache/rate limit), queue + worker, read replica routing, circuit breaker, observability, auto-scale guideline
> - **Enterprise**: chia thành các task/sub-layer theo ADR đã duyệt (multi-region → sharding → event-driven → DR) — ưu tiên từng bước, đo + verify trước khi sang bước sau

### Layer 1: Core Features
- Implement core screens
- API integration / data fetching
- State management
- Local storage (AsyncStorage / MMKV / SQLite)
- Form & validation

### Layer 2: Advanced Features
- Push notifications
- Offline sync
- Payments / in-app purchases
- Deep linking
- Real-time (WebSocket)
- Biometric auth

### Layer 3: Polish & Release
- Error boundaries / crash handling
- Performance optimization (memoization, image loading)
- Accessibility
- Analytics
- EAS Build config (`eas.json`)
- App icons / splash (Expo config)
- Store metadata

---

## Task File Template

```markdown
# Task: layer-0/task-01 — Project Scaffold

## Description
Setup Expo + TypeScript project với folder structure chuẩn.

## Dependencies
- None (Layer 0 đầu tiên)

## Inputs
- `.env.local` (đã fill bởi brainstorm)

## Tasks
1. Init Expo app (blank-typescript)
2. Setup folder structure
3. Cài dependencies core

## Acceptance Criteria
- [ ] `npx expo start` chạy được
- [ ] TypeScript compile pass
- [ ] Folder structure đúng spec

## Notes
- Dùng `npx expo install` cho native modules (đúng version)
```

---

## Progress Update

Sau khi tạo xong task files, update `.context/progress.json`:

```json
{
  "projectName": "...",
  "currentLayer": 0,
  "totalLayers": 4,
  "completedTasks": [],
  "inProgressTask": null,
  "blockedTasks": [],
  "lastUpdated": "ISO timestamp"
}
```
