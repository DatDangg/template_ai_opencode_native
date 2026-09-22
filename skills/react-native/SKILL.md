---
name: react-native
description: "React Native + Expo conventions, patterns và troubleshooting cho app mobile. Front-load keyword: React Native, Expo, Expo SDK, Metro, navigation, TanStack Query, Zustand, FlatList, expo-notifications, design tokens, RN common errors. Dùng khi code/review/debug một screen/component/hook trong apps/mobile."
---

# React Native + Expo (Curated)

Wrapper skill cho conventions, patterns và lỗi thường gặp khi làm app **React Native / Expo** (đối chiếu `apps/mobile` trong repo này).

## Khi nào dùng

- Viết/sửa screen, component, hook, navigation trong `apps/mobile`.
- Chọn stack/pattern (state, data fetching, form, storage, push, image, list).
- Debug lỗi Metro/Hermes/Reanimated/EAS build hoặc type lỗi liên quan RN.
- Review UI theo design tokens + quy ước mobile (device small 360-390, large 414-430).

## File tham khảo trong thư mục này

- `stack.md` — tech stack + version pinning (Expo, RN, state, UI, networking, testing, dev/build).
- `conventions.md` — folder structure, naming, component/hook rules, styling, platform-specific, do/don't.
- `patterns.md` — navigation, data fetching (TanStack Query), state (Zustand), auth (JWT), local storage, forms (RHF + Zod), push notification, image, FlatList, error handling.
- `design-tokens.md` — colors, spacing, radius, typography, elevation, motion/haptics, contrast, anti-patterns.
- `common-errors.md` — các lỗi thường gặp + cách fix (module version, Metro cache, SafeAreaView, Hermes, keyboard, FlatList, push, image-picker, memory leak, deep link, EAS, cleartext, Reanimated).

## Quy tắc rút gọn

- List lớn **bắt buộc** dùng `FlatList` (không `.map` trong ScrollView).
- Style theo design tokens, không hardcode màu/khoảng cách rời rạc.
- Mọi listener/subscription phải cleanup để tránh memory leak.
- Cài package native qua `npx expo install` để đúng version SDK.
