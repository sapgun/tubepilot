# Verification — 2026-09-27

## Build and content

- `npm run check`: PASS. 215 source messages with four translations each; 218 static references; five supported locales; placeholder parity; no raw Korean JSX; required local assets present.
- `npm run build`: PASS, Vite 7.3.6. Generates both `dist/index.html` and `dist/privacy.html`.
- Production preview opened at `http://localhost:4173/?lang=ko`. Final browser error log: empty.
- GitHub API confirmed latest release `v1.9.2` and asset `tubepilot-v1.9.2-extension.zip`.

## Browser scenarios

Tested using Codex's Chromium-based in-app browser. Responsive viewport tests are emulation, not physical-device or Safari/Firefox tests.

| Scenario                                              | Result                                                                                                                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KO / EN / JA / PT / ES × 1440 / 768 / 390 / 320 px    | No document-level horizontal overflow in 20 combinations                                                                                                    |
| Translated headings, body text, buttons, footer links | No unexpected Korean text in inspected elements of EN / JA / PT / ES                                                                                        |
| Five-language privacy page                            | All five sections and localized heading present; no Korean leaks in other locales                                                                           |
| Portuguese selection → reload                         | Portuguese selection and heading preserved                                                                                                                  |
| Mobile menu                                           | Opens, exposes links, and closes after navigation                                                                                                           |
| Library tag filter                                    | Travel filter reduces the two sample entries to the single travel entry                                                                                     |
| Sponsor skip                                          | Status changes to a 32-second skip; progress moves to the end of the sample segment                                                                         |
| Zoom                                                  | Reaches 400%; increase button is disabled at the upper bound                                                                                                |
| Drag panning                                          | Image transform updated to `translate(110px, 30px) scale(4)`                                                                                                |
| Bookmark                                              | Saved state and `aria-pressed=true` confirmed                                                                                                               |
| Capture                                               | Actual PNG generated; final desktop preview is 1280×680, preserving the displayed frame's ratio; image contains no player controls                          |
| Capture dialog                                        | Opens, displays generated image, and closes with its close control                                                                                          |
| Capture download link                                 | Has a blob URL and `download="tubepilot-demo-capture.png"`; browser automation's download event timed out, so filesystem completion is unverified           |
| Browser installation tabs                             | Edge switches address to `edge://extensions`                                                                                                                |
| Address copy                                          | Browser Clipboard API resolved and UI showed the copied status. Independent clipboard-tool read returned empty; paste into an external app was not verified |
| FAQ                                                   | Expanding the free-use question reveals its answer and source link                                                                                          |

## Implementation safeguards inspected

- `prefers-reduced-motion` disables CSS motion and renders a static WebGL frame.
- WebGL animation pauses offscreen and in hidden documents; CSS fallback remains if WebGL is unavailable.
- Object URLs, WebGL objects, observers, intervals and event listeners are cleaned up.
- Clipboard access errors/timeouts reveal a manual-copy message instead of an indefinite wait.
- Language persistence tolerates localStorage restrictions; the URL remains usable.
- The demo is clearly distinguished from the real extension interface.
- Decorative imagery is local; no runtime font/image CDN or analytics dependency.

## Remaining boundaries

- No Vercel deployment, GitHub push, or modification to the original extension.
- No actual YouTube ad-skipping, extension installation, wallet opening, donation transaction or native clipboard paste verification.
- No separate Safari, Firefox, physical phone, performance benchmark or complete WCAG audit.
- Languages were implemented and checked for structural completeness; no professional native-language review was commissioned.

Desktop, feature-section and mobile screenshots are provided alongside the project ZIP in the parent outputs folder.

## Designeer refinement verification — 2026-09-27

- Added Motion shared selection rails, monospaced editorial labels, dashed section rules and fine-pointer card illumination.
- `npm run check`: 215 messages × 4 translations, 218 static translation references passed.
- `npm run build`: passed. Vite emits upstream Motion `use client` directive warnings for this client-only build; output is produced successfully.
- Production preview: switching demo to zoom updates pressed state and description; selecting Edge updates its selected state and installation address to `edge://extensions`. Two selection rails render at 2px height.
- At 390px, all five locales render four cards and two rails without horizontal document overflow. Spanish fourth demo tab updates its description and renders its selection rail at about 81px width.
- Runtime error log: empty during desktop checks. Updated feature section visually inspected and screenshot saved alongside the deliverable.
- Reduced-motion and pointer conditions reviewed in source; OS-level reduced-motion and physical touch-device behavior were not tested in this refinement.

## Repository consolidation — 2026-09-27

The sole landing source is now `landing/` in the TubePilot repository. Deployment configuration moved to root `vercel.json`; old Pages HTML and its duplicated images were removed. Extension and userscript files are unchanged. Root install (`npm ci --prefix landing`), translation/deployment checks and production build passed. Both `landing/dist/index.html` and `landing/dist/privacy.html` were generated. Remote publication/settings were not changed.
