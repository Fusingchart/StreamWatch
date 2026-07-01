# Contributing to StreamWatch

Thank you for your interest in StreamWatch! This document explains how to contribute effectively.

## Ways to Contribute

- **Bug reports** — open an issue with steps to reproduce
- **Classification prompt tuning** — refine the Gemini vision prompt in `src/services/gemini.ts` for edge cases (most impactful)
- **Agency routing data** — help expand `src/utils/routing.ts` for additional counties
- **Downstream POI data** — add verified points of interest to `src/data/downstream.ts`
- **Feature development** — see open issues tagged `feature`

## Development Setup

Follow the [Getting Started](README.md#getting-started) steps in the README.

The app requires a native build — Expo Go is not supported. Run `npx expo run:ios` for the simulator, or `npx expo run:ios --device` for a physical iPhone.

## Branch Convention

```
main          — stable, deployable
feature/xyz   — new features
fix/xyz       — bug fixes
data/xyz      — data-only changes (POIs, routing, etc.)
```

Open a PR against `main`. Include a short description of what changed and why.

## Code Style

- TypeScript throughout — no `any` except where explicitly required by RN interop
- Zustand selectors: always select individual primitives, never return object literals from a single selector (causes infinite re-renders)
- No comments explaining *what* code does — only *why* for non-obvious constraints
- No Co-Authored-By lines in commits

## Adding Pollution Data

### New downstream POI (`src/data/downstream.ts`)

Each POI needs:
- Real name and verified coordinates (check Google Maps / county GIS)
- A `waterway` field matching the feature's drainage
- A factual `description` — include specific stats where possible (visitor counts, species listed, etc.)

### New waterway (`src/data/waterways.ts`)

Add a bounding box that covers the waterway's main stem and major tributaries. The bounds are used to assign sightings — overly tight bounds will miss reports.

### Agency routing (`src/utils/routing.ts`)

Agency email addresses must be verified public contacts. Do not add personal emails. County-specific overrides go in the `COUNTY_OVERRIDES` map.

## Reporting Security Issues

Do not open public issues for security vulnerabilities. Email directly instead.
