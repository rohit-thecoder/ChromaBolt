# ChromaBolt: Workshop Sort — Engineering Rules

ChromaBolt is a portrait-only React Native game built with Expo and TypeScript. These rules are mandatory for every change.

## Architecture

- Keep routes in `src/app/`. Put game rules in `src/engine/`, screens in `src/screens/`, reusable UI in `src/components/`, visual tokens in `src/theme/`, integrations in `src/services/`, persistence in `src/storage/`, and shared domain definitions in `src/types/`.
- Keep UI declarative and thin. Screens coordinate presentation; game rules belong in the engine and I/O belongs in services or storage.
- The app must remain portrait-only. Do not introduce landscape layouts, orientation overrides, or rotation-dependent interactions.

## TypeScript

- Use strict TypeScript throughout. `any`, implicit `any`, `@ts-ignore`, and untyped external data are prohibited.
- Model API, storage, navigation, and game-domain data with explicit types. Treat parsed JSON and other external values as `unknown` until validated.

## Visual System

Only use the named palette tokens exported from `src/theme/theme.ts`:

| Token | Value |
| --- | --- |
| Workbench Surface | `#1E242B` |
| Blueprint Grid | `#2A323C` |
| Brass Accent | `#EAB308` |
| Steel | `#94A3B8` |
| Off-White | `#F8FAFC` |

- Do not introduce ad-hoc color literals in components or screens.
- Every animation must use `react-native-reanimated` and run on the native/UI driver at 60fps. Do not use `Animated`, `LayoutAnimation`, CSS animations, or JS-thread timer loops for motion.

## Ads and Persistence

- UI screens and components must never import native AdMob modules directly. All ad interactions go through `src/services/adService.ts`.
- `adService` must be safe in Expo Go: native ad availability is detected inside the service and unavailable rewards resolve to a typed mock reward.
- Use `@react-native-async-storage/async-storage` only through `src/storage/gameStorage.ts`. Do not access AsyncStorage from screens, components, the engine, or other services.
- Persist the complete game state through `gameStorage`: `currentStage`, `highestUnlockedStage`, `coins`, `unlockedSkins`, `equippedSkin`, `soundEnabled`, and `hapticsEnabled`.

## Validation

- Before finishing every task, run `npx tsc --noEmit` and resolve every TypeScript error.
