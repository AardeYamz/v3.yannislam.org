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
- **Hong Kong wording pass** on the content, since OpenCC only converts
  characters and left Mainland vocabulary: 「」 quotes instead of “”; 戶 for 户,
  社群, 靈修; 麻省大學 for 馬薩諸塞大學; 曼寧資訊及電腦科學學院 and 電腦 for
  計算機; 理學士 / 文學士; 義工 for 志願者; 透過, 支援, 建立, 整合, 介面, 文件,
  伺服器, 寄存, 即時, 感應器, 保安, 變數, 營運, 策略, 網上, 遙距教學, 縮時攝影 /
  影片; 替假技術員, 輪調計劃, 全級排名, 數碼鑑證 and similar.
- **`LanguageService`**: `Language` is `en | zh | hk`; `toggle()` became
  `select(lang)`. An `hk.*` hostname pins Hong Kong. `detectLanguage()` sends
  `zh-HK`/`zh-MO`/`zh-TW`/`zh-Hant` browsers and the Hong Kong, Macau and Taipei
  time zones to `hk`. `<html lang>` is `zh-Hant-HK`.
- **Header**: one flag button showing the current language, each click moving to the next (US, China, Hong Kong flags,
  inline SVG); `ui.header.languagePickerLabel` labels the button. The two translations are lazy chunks (Lighthouse script budget); `select()` and `init()` are async and wait for the chunk.

## Going live

Add `hk.yannislam.org` to the Vercel project and a DNS record (not done here).
