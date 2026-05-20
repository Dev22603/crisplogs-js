# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (treating 0.x as breaking-change-allowed).

## [Unreleased]

## [0.3.0] - 2026-05-20

### Added

- `moduleLogger(name?)` — per-file logger whose `[tag]` is derived from the caller's path (basename without extension); optional `name` override delegates to `getLogger`.
- `Logger.captureCallerInfo` getter; child loggers from `getLogger` now inherit the root's `captureCallerInfo` setting.
- Typed error hierarchy: `CrisplogsError`, `InvalidLevelError`, `InvalidStyleError`, `InvalidColorError`, `InvalidExtraFormatError`, `InvalidWidthError`, `InvalidFilePathError`. All errors are exported from the package root.
- Runtime validation of `style` and `extraFormat` against their literal unions.
- Per-method JSDoc on `Logger.debug` / `info` / `warning` / `warn` / `error` / `critical` / `log`, including notes on when extras render and the level/handler interaction.
- `AGENTS.md` for AI coding assistants.
- `CHANGELOG.md` (this file).
- "Common Pitfalls" section and 0.x versioning note in `README.md`.

### Changed

- `setupLogging` now throws `InvalidLevelError` / `InvalidWidthError` / `InvalidStyleError` / `InvalidExtraFormatError` / `InvalidFilePathError` instead of plain `TypeError`. The new error classes still extend `Error`, so `catch (e) { e instanceof Error }` is unaffected; code that specifically catches `TypeError` should switch to `CrisplogsError`.
- `parseColorString` now throws `InvalidColorError` on unrecognized tokens. Previously it silently dropped them and returned an empty ANSI sequence, which masked typos like `"brigt_red"`.
- Documented `Logger.addHandler` deduplication and the fact that mutating `logger.level` does not propagate to already-attached handlers.

## [0.2.3] - 2025-04-15

### Fixed

- Patch release rolling up minor bug fixes.

## [0.2.2] - 2025-04-15

### Fixed

- Bug fixes in formatting and output paths.

## [0.2.0] - 2025-04-14

### Added

- `resetLogging()` and `removeLogger(name)` for cleanup of the global registry.
- `Handler.close()` method on the `Handler` interface; called from `Logger.clearHandlers()`.
- `Logger.removeHandler(handler)` and `Logger.isEnabledFor(level)`.
- `extraFormat` option (`"inline" | "json" | "pretty"`) for structured-data rendering.
- `captureCallerInfo` option to disable stack-trace capture in hot paths.
- Examples directory with runnable scripts for every documented feature.

### Changed

- Consolidated four formatter classes into a single configurable `LogFormatter`.
- `addHandler` is now idempotent — adding the same handler twice is a no-op.
- `Handler.level` is now `readonly`.
- `wordWrap` measures visible width (ANSI-stripped) so colored text wraps correctly.
- Broadened the ANSI-strip regex to cover CSI / OSC sequences in addition to SGR.

### Fixed

- `handler.emit` errors are now caught and reported to stderr instead of crashing the host process.
- Circular references in `extra` objects are handled via a `safeStringify` helper; inline format no longer renders `[object Object]` for nested objects.

## [0.1.x]

Initial public releases. See `git log` for early commit history.

[Unreleased]: https://github.com/Dev22603/crisplogs-js/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/Dev22603/crisplogs-js/compare/v0.2.3...v0.3.0
[0.2.3]: https://github.com/Dev22603/crisplogs-js/releases/tag/v0.2.3
[0.2.2]: https://github.com/Dev22603/crisplogs-js/releases/tag/v0.2.2
[0.2.0]: https://github.com/Dev22603/crisplogs-js/releases/tag/v0.2.0
