# ADR 0001: Keep Zustand state slice-based

## Status

Accepted

## Context

TrailReplay has multiple dense frontend domains: tracks, journey composition, media placement, playback, export, and UI state. A single monolithic Zustand store made ownership boundaries difficult to reason about.

## Decision

Keep the public store unified for consumers, but compose it from focused slices in `app/src/store/slices`.

Export concerns are split from generic settings so export runtime state does not leak into unrelated configuration logic.

## Consequences

- easier ownership boundaries for future features
- simpler targeted tests
- less risk of accidental coupling across domains
- still one import surface for React components (`useAppStore`)
