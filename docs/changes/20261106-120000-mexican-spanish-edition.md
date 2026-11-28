Date: 2026-11-06 12:00:00

# Mexican Spanish Edition (mx.yannislam.org)

A Mexican Spanish edition, next to English, Simplified Chinese and Hong Kong
Traditional Chinese. Stacked on the Hong Kong edition.

## What changed

- **`src/assets/config.mx.json`**: a full translation of `config.json` in the same
  shape (informal "tú", Mexican vocabulary: computadora, practicante, licenciatura).
  Proper nouns, technology names and links stay as in English. Section anchors are
  translated (`/#voluntariado`, `/#acerca-de`, `/#educacion`, `/#experiencia`) and
  resolve alongside the English ids. Machine-written; worth a read by a native speaker.
- **`LanguageService`**: `Language` gains `mx` (`<html lang>` `es-MX`, name
  "Español (México)"); an `mx.*` hostname pins it. `detectLanguage()` is now ordered:
  the first browser language with an edition wins (any `es*` goes to `mx`), then the
  time zone (Mexico's zones go to `mx`), else English.
- **`config-loader.ts`** has one lazy import per translation (`IMPORTERS`), so the
  Spanish text is its own chunk. **`FlagComponent`** gains the Mexican flag (the
  coat of arms is a simplified disc).

## Going live

Add `mx.yannislam.org` to the Vercel project and a DNS record (not done here).
