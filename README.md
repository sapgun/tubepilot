<p align="center"><a href="https://tubepilot.trenchclub.dev/">Website</a></p>

<p align="center">
  <a href="README.md"><strong>English</strong></a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <img src="assets/hero.png" alt="TubePilot" width="720">
</p>

<p align="center">
  <strong>A clearer way to watch YouTube.</strong><br>
  Skip ads, jump over sponsors, and save videos with tags for later.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.11.0-blue" alt="version">
  <img src="https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-orange" alt="platform">
  <img src="https://img.shields.io/badge/languages-ko%20%7C%20en%20%7C%20ja%20%7C%20es%20%7C%20pt-purple" alt="languages">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="prs welcome">
</p>


---

## Watch with less clutter

TubePilot adds a compact control panel to the original YouTube player on desktop. See community-reported segments, skip sponsors, and keep a local video library. No TubePilot account is required.

## Features

| Feature | What it does |
|---|---|
| Undo skip | A six-second Undo notice returns to the previous position. That range and overlapping ranges are excluded from automatic skipping for this visit. |
| Category actions | Choose automatic, manual or mark-only for each category. The global automatic-skip toggle still applies. |
| Channel rules | Use global settings, manual skipping or mark-only for the current channel. Rules use the channel link, not its display name. |
| My skip ranges | Enter start/end times or capture the current time. Ranges apply only to this video, stay in this browser, can be deleted from the segment list and are included in JSON settings backups. They are not submitted to SponsorBlock. |
| Segment timeline | Colored progress-bar markers and a panel timeline for sponsors, intros, outros, self-promotion, interaction reminders and off-topic music. Lists start/end times with a manual skip button. |
| Automatic segment skip | Enable automatic skipping globally and per category. Turning off automatic skipping keeps segment data visible. |
| Compact panel | `＋ / −` expands or collapses; `↗ / ↙` switches wide/compact view. Size and collapsed state persist. New installations start collapsed below the player. |
| Video ads | Attempts to click skip buttons and seek/speed through detected ads; optionally mutes them and restores the previous mute state and playback rate afterward. YouTube changes may break this behavior. |
| Zoom and focus | Zoom up to 400%, drag to pan, and hide comments. |
| Local library | Save videos with tags and notes; search and filter them. Saved videos show a recall banner. |
| Segment bookmarks | Save custom time ranges with memos; jump to a range and pause at its end. |
| Screenshots | Capture the visible player area as PNG: download, clipboard, or both. This is a cropped tab screenshot, not direct video-frame extraction. |
| Backup | Export and restore settings, library and segment bookmarks as JSON. Restore replaces the library and settings; included bookmarks also replace existing bookmarks. |

The interface supports Korean, English, Japanese, Spanish and Portuguese. Change language, screenshot mode and shortcuts in the extension popup.

## Install and update

1. Download the [main branch ZIP](https://github.com/sapgun/tubepilot/archive/refs/heads/main.zip) and extract it, or clone this repository.
2. Open `chrome://extensions` or `edge://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the folder containing `extension/manifest.json` — the `extension/` folder, not the repository root.
4. Reload YouTube. A small TubePilot panel appears below the player on a watch page. Click `＋` to open it.

To update, back up your data from the Library first, replace the files in your existing extension folder, click the extension's **Reload** button, then reload YouTube. Avoid installing a second copy. The toolbar master toggle is checked when a page loads; reload YouTube after changing it.

## Panel controls and shortcuts

- **Playback & skip settings** contains category toggles, zoom, panel position and opacity, and Library/Save/Capture/Bookmark actions.
- Use **below the player** to avoid overlaying the video. Compact view is 340px; wide view fills the available width below the player or uses 540px when floating, within the viewport.
- In floating modes, drag the header to move the panel; double-click the header to reset its saved position. Clicking the header also toggles collapse. Fullscreen hides the panel.
- Progress-bar markers and the panel timeline jump to a segment's start. The list's **Skip** button jumps to its end; it is unavailable during a detected YouTube ad.
- Default shortcuts: `Alt+S` capture, `Alt+H` toggle comments, `Alt+B` save video. Remap them in the popup.

## Segment data and limitations

Segments come from the [SponsorBlock community API](https://wiki.sponsor.ajay.app/w/API_Docs). TubePilot does not analyze video content to discover unreported ads. No segments can mean no community reports; loading failures are shown separately. YouTube-served ads and in-video sponsor segments use different handling. Ad removal is not guaranteed, and TubePilot is not affiliated with YouTube, ReVanced or SponsorBlock.

The alternative [userscript](https://raw.githubusercontent.com/sapgun/tubepilot/main/tubepilot.user.js) is **1.1.2**, maintained separately from the **1.11.0** extension. Install it through a userscript manager such as Tampermonkey or Violentmonkey. It does not include the new segment panel, persistent panel sizing/collapse, or all extension features. Firefox/Safari support depends on the manager and browser; compatibility has not been verified here. Run one edition at a time.

## Privacy and permissions

Settings, library and bookmarks stay in browser-local storage. Segment lookups send the current video ID to `sponsor.ajay.app`; the service also receives normal network request metadata. TubePilot has no account or cloud sync. Exported backups contain your saved videos and notes.

| Permission | Purpose |
|---|---|
| `storage` | Local settings, library and bookmarks |
| `activeTab` | Capture the visible tab for screenshots; a browser user gesture may be required |
| `clipboardWrite` | Copy screenshots to the clipboard |
| `downloads` | Save screenshots as files |
| `https://sponsor.ajay.app/*` | Retrieve community segment data |

## Troubleshooting and contributing

- **No panel:** ensure the extension is enabled, reload YouTube, and check below the player or the saved floating position.
- **No markers:** enable segment marking, wait for video metadata, and check the panel's loading/error status. Not every video has reports.
- **Screenshot fails:** keep the player visible, click the extension icon to grant active-tab access if needed, then retry. Fullscreen hides the panel; keyboard shortcuts remain available.
- **Ad skipping stops working:** YouTube changes can affect detection. Report browser/extension versions, reproduction steps and the video URL in an [issue](https://github.com/sapgun/tubepilot/issues), without private data. Compatibility with other ad tools is not guaranteed.

For extension changes, run:

```sh
cd extension/test
npm install
npm test
```

The suite covers content behavior, popup settings and translations in a simulated browser. It does not establish live YouTube ad-skipping success. Manually check installation, playback, fullscreen, collapse/expand and updates in the target browser. See [CHANGELOG](CHANGELOG.md) and [LICENSE](LICENSE) (MIT).
