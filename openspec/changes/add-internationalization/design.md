## Context
The current UI ships with hard-coded English text. Internationalization will require a centralized translation store, a selection mechanism, and a way to render localized strings across the UI.

## Goals / Non-Goals
- Goals:
  - Support English and Romanian locales for all user-facing UI text.
  - Provide a language switcher and persist the user's choice.
  - Keep the solution lightweight and aligned with the existing static frontend.
- Non-Goals:
  - Server-side localization of scraped content.
  - Automatic language detection based on browser locale (may be future work).

## Decisions
- Decision: Implement a client-side translation dictionary in a single JS module.
- Decision: Persist language selection via localStorage.
- Decision: Default language to English when no preference is stored.

## Risks / Trade-offs
- Risk: Missing translation keys can lead to blank UI text → Mitigation: fallback to English and log missing keys in console.

## Migration Plan
1. Add translation store and language selector.
2. Replace hard-coded strings with translation lookups.
3. Verify Romanian and English coverage.

## Open Questions
- Should the default language be inferred from browser locale in a later iteration?
