---
name: monitoring
description: "Production observability cho React Native/Expo: crash reporting, performance tracking, structured logging, alert, và OpenTelemetry (instrumentation, collector, semantic conventions). Front-load keyword: monitoring, observability, crash, Sentry, performance, logging, OTel, OpenTelemetry, tracing, alert. Dùng khi setup/review monitoring, crash/perf, tracing hoặc logging cho mobile app."
---

# Production Monitoring (Mobile) (Curated)

Wrapper skill cho observability production của app **React Native / Expo**: crash, performance, logging, alert và OpenTelemetry.

## Khi nào dùng

- Setup/review **crash reporting**, performance tracking, structured logging, alert.
- Tích hợp **OpenTelemetry** (instrumentation, collector, semantic conventions).
- Debug vấn đề production/observability sau khi ship.

## File tham khảo trong thư mục này

- `production-monitoring.md` — setup end-to-end: crash reporting, performance, logging, alert + review checklist.
- `mobile-crash-performance.md` — crash & performance monitoring chuyên sâu cho mobile.
- `otel-instrumentation.md` — OTel instrumentation cho React Native/Expo (packages, setup sketch).
- `otel-collector.md` — cấu hình OpenTelemetry Collector (OTLP pipeline tối thiểu).
- `otel-semantic-conventions.md` — quy tắc đặt tên attribute/span theo semantic conventions.

## Quy tắc rút gọn

- Không log PII/secret (xem skill `security`).
- Log có cấu trúc (structured), có level rõ ràng.
- Alert phải actionable, tránh noise.
- Telemetry không chặn luồng chính (fire-and-forget, có sampling).
