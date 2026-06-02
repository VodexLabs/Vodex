# VODEX Premium Intro — Anime Edit Storyboard (Plan Only)

**Status:** P0.9 doc-only. No intro code changes until TSX/preview pipeline is stable in production.

## Creative direction

Premium “anime edit” energy: kinetic typography, icon punch-in, subtle chromatic shimmer, and a fast handoff to the workspace. Total runtime **2.8s** with crisp beats (not a slow fade slideshow).

## Timeline (2.8s)

| Beat | Time | Layer | Action |
|------|------|-------|--------|
| 1 | 0.0–0.4s | Background | Dark gradient + soft vignette; optional grain overlay (CSS noise or SVG filter) |
| 2 | 0.2–0.8s | Logo mark | Icon scales 0.72 → 1.0 with overshoot (`cubic-bezier` spring); gold ring stroke draws on |
| 3 | 0.5–1.4s | Wordmark | “VODEX” letters stagger in (per-letter `opacity` + `translateY`) |
| 4 | 1.0–1.8s | Accent | Horizontal light sweep (masked gradient) across wordmark |
| 5 | 1.6–2.4s | Tagline | “Build apps at the speed of thought” fades up |
| 6 | 2.2–2.8s | Exit | Whole shell scales to 0.98 + fades; `sessionStorage` gate prevents repeat |

## Layer stack

1. **Canvas/SVG (optional):** particle burst on beat 2 (low particle count for perf).
2. **CSS:** `vodex-premium-intro` shell, letter spans, icon container, sweep pseudo-element.
3. **Reduced motion:** `@media (prefers-reduced-motion: reduce)` — static logo + wordmark, 400ms fade only.

## Integration points (future)

- `src/components/session/vodex-session-intro.tsx` — orchestration + `sessionStorage` key.
- `src/app/globals.css` — keyframes (`vodex-intro-icon-in`, letter stagger, sweep).
- Preload: logo asset in layout head when intro enabled.

## QA checklist (when implemented)

- [ ] First visit per session shows intro once.
- [ ] Reduced motion path completes without vestibular triggers.
- [ ] No layout shift on builder route after intro dismiss.
- [ ] LCP not regressed on `/create` cold load.

## Out of scope (P0.9)

- Audio stinger
- Video background
- Per-user intro variants
