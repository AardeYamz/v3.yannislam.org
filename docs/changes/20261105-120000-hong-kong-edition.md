Date: 2026-11-05 12:00:00

# Hong Kong Edition (hk.yannislam.org)

A Traditional Chinese edition with Hong Kong wording, next to English and
Simplified Chinese. Builds on the Chinese edition.

## What changed

- **`src/assets/config.hk.json`**: `config.zh.json` converted to Traditional
  characters (OpenCC, `cn` to `hk`), then the UI strings reworded by hand for
  Hong Kong (e.g. 電郵, 預設, 選單, 履歷). `config-parity.spec.ts` now checks
  it against `config.json` too. Machine-converted and machine-reviewed; worth a
  read by a native Hong Kong speaker.
- **`LanguageService`**: `Language` is `en | zh | hk`; `toggle()` became
  `select(lang)`. An `hk.*` hostname pins Hong Kong. `detectLanguage()` sends
  `zh-HK`/`zh-MO`/`zh-TW`/`zh-Hant` browsers and the Hong Kong, Macau and Taipei
  time zones to `hk`. `<html lang>` is `zh-Hant-HK`.
- **Header**: one flag button per other language (US, China, Hong Kong flags,
  inline SVG); `ui.header.languageAriaLabel` takes a `{language}` placeholder.

## Going live

Add `hk.yannislam.org` to the Vercel project and a DNS record (not done here).
