# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## What this is

`expo-translate-text` is a published npm package — an Expo native module that exposes platform-native translation APIs to React Native. It uses Apple's Translation framework on iOS and Google ML Kit on Android. There is no server-side component.

## Commands

```sh
yarn              # install all dependencies
yarn build        # compile TypeScript → build/
yarn lint         # ESLint + Prettier check
yarn lint --fix   # auto-fix formatting
yarn typecheck    # tsc type check
yarn test         # Jest unit tests

# Example app
yarn example:start    # start Metro bundler
yarn example:ios      # run on iOS (physical device only — Translation not supported on simulator)
yarn example:android  # run on Android emulator/device

# Open native projects
yarn open:ios         # open example/ios in Xcode
yarn open:android     # open example/android in Android Studio
```

Native code changes require a full rebuild of the example app. TypeScript/JS changes hot-reload without rebuilding.

Publishing: `yarn release` (release-it — bumps semver, creates git tag, publishes to npm).

## Architecture

### JS layer (`src/`)

- `ExpoTranslateText.types.ts` — shared TypeScript interfaces for requests and responses
- `ExpoTranslateTextModule.ts` — loads the native module via `requireNativeModule('ExpoTranslateText')` and exports `TranslationError`
- `index.ts` — public API; wraps the raw native calls in `onTranslateTask` and `onTranslateSheet`, normalises errors into `TranslationError`

The `build/` directory is the compiled output (committed) — this is what gets published to npm.

### iOS (`ios/`)

Built against Apple's `Translation` framework (gated on `#if canImport(Translation)`):

- `ExpoTranslateTextModule.swift` — Expo module definition; exposes `translateTask` and `translateSheet` async functions. Manages a hidden `UIHostingController` (1×1px, invisible) that hosts the SwiftUI views needed to drive the Translation API.
- `Props.swift` — `ObservableObject` state bridges between the module and the SwiftUI views (`Props` for task mode, `SheetProps` for sheet mode).
- `TranslationViews.swift` — SwiftUI views: `IOSTranslateTasks` attaches `.translationTask` modifier; `IOSTranslateSheet` attaches `.translationPresentation` modifier. These views are the actual entry points into the Apple Translation framework.
- `Exceptions.swift` — typed `Exception` subclasses used by the module (surfaces string error codes to JS matching Android's convention).
- `TranslationHelpers.swift` — `parseTexts()` flattens string/array/dict input into `[String]`; `makeConfiguration()` builds `TranslationSession.Configuration`.

**Key iOS design pattern:** Apple's Translation API requires SwiftUI view modifiers (`.translationTask`, `.translationPresentation`). The module works around this by programmatically attaching a hidden `UIHostingController` to the root view controller, using `ObservableObject` props as a data bridge, and tearing it down after translation completes.

Version gates: `translateTask` requires iOS 18.0+; `translateSheet` requires iOS 17.4+.

### Android (`android/`)

Uses Google ML Kit's on-device translation (`com.google.mlkit:translate`):

- `ExpoTranslateTextModule.kt` — single file; exposes only `translateTask` (no sheet support on Android). Handles: input flattening (`extractItems`), optional language identification via ML Kit's `LanguageIdentification`, model download with configurable `DownloadConditions` (WiFi, charging), parallel translation with `AtomicBoolean`/`AtomicInteger` for safe promise settlement, and output reconstruction (`reconstructOutput`).

**Key Android design pattern:** All three input shapes (string, array, dict) are flattened into a list of `TranslationItem` with positional metadata, translated in parallel, then reconstructed back to the original shape. When `sourceLangCode` is omitted, each item is language-detected individually before translation.

### Input shape support

Both platforms handle three input shapes identically:
- `string` → `string`
- `string[]` → `string[]`
- `{ [key: string]: string | string[] }` → same shape with values translated

### Example app (`example/`)

A minimal Expo app configured with `autolinking.nativeModulesDir: ".."` to consume the local module source directly. Used to manually test native changes.

## Commit convention

Follows [Conventional Commits](https://www.conventionalcommits.org/): `fix:`, `feat:`, `refactor:`, `docs:`, `test:`, `chore:`. Pre-commit hooks enforce this format and run linter + tests.
