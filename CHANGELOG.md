# Changelog

## 0.2.3 — 2026-10-29

Fixed highlighting a continuous selection spanning multiple list items or paragraphs in ChatGPT layouts without stable message selectors. Shared containers are now rediscovered when painting and restoring annotations, and quote resolution checks the complete passage when nested containers share an identity.

Existing annotation storage and JSON export remain version 1. No new extension permissions or runtime dependencies.

Validation: 18 syntax/unit/DOM regression checks pass via `npm run check` (18 test cases plus syntax checks). The new regression suite reproduces four missing-highlight cases against v0.2.2, then verifies saving and restoring a–d lists, nested lists, paragraphs, multiple Markdown blocks, explicit assistant roots, and existing single-item selections. Three additional boundary cases reject cross-turn/user/input fallback selections. Browser-host integration on the live ChatGPT site still requires manual Chrome/Edge verification.
