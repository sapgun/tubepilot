<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.ja.md"><strong>日本語</strong></a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <img src="assets/hero.png" alt="TubePilot" width="720">
</p>

<p align="center">
  <strong>PCのYouTubeをReVancedのように。</strong><br>
  広告をスキップし、スポンサーを飛ばし、気になる動画はタグ付きで保存。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.8.0-blue" alt="version">
  <img src="https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-orange" alt="platform">
  <img src="https://img.shields.io/badge/languages-ko%20%7C%20en%20%7C%20ja%20%7C%20es%20%7C%20pt-purple" alt="languages">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="prs welcome">
</p>

---

## ✨ 機能

| | 機能 | 説明 |
|---|---|---|
| ⏭ | **動画広告の自動スキップ** | プレロール/ミッドロール検出時にスキップボタンを自動クリック。スキップ不可の広告は末尾へシーク＋16倍速＋ミュートで通過し、終了後は元の音量・速度に復元 |
| 🟩 | **SponsorBlockのマーキング＋スキップ** | スポンサー/イントロ/アウトロ/自己宣伝の区間をプログレスバーに色付きマーカーで表示し、自動スキップ。カテゴリ別にon/off可能（公開SponsorBlock APIを使用） |
| 🔍 | **動画のズーム・パン** | ＋/－ボタンで最大400%まで拡大、ズーム状態で動画をドラッグして画面移動 |
| 💬 | **コメント非表示（集中モード）** | コメント欄全体を隠して動画に集中 |
| 📚 | **後で見るライブラリ** | タグ＋キーワード/メモ付きで動画を保存。概要欄の`#ハッシュタグ`を自動抽出、タグチップのフィルター＋タイトル・チャンネル・タグ・メモの統合検索。保存した動画を再度開くと**リコールバナー**がタグとメモを表示し、「なぜ保存したんだっけ」をすぐ思い出せる |
| 💾 | **バックアップ・復元** | 設定＋ライブラリをJSONファイルに書き出し、いつでも復元 |
| 📷 | **スクリーンショット** | 今の動画画面をPNGファイルで保存 (`Alt+S`)、プレイヤー領域だけを切り抜き |
| ⌨️ | **ショートカット** | `Alt+S` キャプチャ · `Alt+H` コメント表示切替 · `Alt+B` 保存ダイアログ |

すべての機能はYouTubeページ右下の🎬パネルからon/offできます。
**パネルのヘッダーをドラッグして好きな位置に配置可能**（位置は保存され、ダブルクリックでリセット）。
パネル設定で**プレーヤー下に固定**にすれば、プレーヤーのサイズ変更に追従します。
プログレスバーの色付きマーカーを**クリックすると、その区間の開始位置にすぐ移動**します。

🌍 UIは**한국어 · English · 日本語 · Español · Português**に対応 — ブラウザの言語から自動検出され、拡張機能のポップアップからいつでも変更可能。

## 📦 インストール

### A. ブラウザ拡張機能（推奨）

1. このレポをクローン、または[最新リリース](https://github.com/sapgun/tubepilot/releases)から`tubepilot-1.8.0.zip`をダウンロードして展開
2. `chrome://extensions`を開き、右上の**デベロッパーモード**をオン
3. **パッケージ化されていない拡張機能を読み込む**をクリック → `extension/`フォルダを選択
4. youtube.comを開く → 右下に🎬パネルが表示されれば完了

> ツールバーのTubePilotアイコンから全体のon/offと言語変更が可能。詳細設定はYouTubeページの🎬パネルから変更。

### B. ユーザースクリプト（代替）

Tampermonkey / Violentmonkeyユーザーは`tubepilot.user.js`をそのまま使えます。
マネージャーのインストール後、ファイルをブラウザで開くとインストール確認が表示されます。
（`@updateURL`により新バージョンを自動チェック）

## 🚀 使い方

- **広告スキップ**: オンにしておくだけ。広告は自動でスキップされます。
- **スポンサー区間**: プログレスバーの色付きマーカーで区間を確認し、不要なカテゴリはパネルでオフに。
- **ズーム**: パネルの＋/－ボタンで拡大、100%超の状態で動画をドラッグすると画面を移動します。
- **後で見る保存**: パネルの**保存**ボタン → タグとメモを入力して保存。概要欄の`#ハッシュタグ`はワンクリックでタグに追加できます。
- **後で見る一覧**: パネルの**一覧**ボタン → タグチップで絞り込むか、検索ボックスにキーワードを入力。

## 🔒 プライバシー

- 設定と後で見るライブラリは**ブラウザのローカルにのみ保存**されます。外部サーバーには送信されません。
- SponsorBlockの区間取得時に、動画IDが公開SponsorBlock API（`sponsor.ajay.app`）に送信されます。それ以外の個人情報は送信されません。

## ❓ FAQ

**uBlock Originと併用できますか？**
はい。TubePilotはネットワーク遮断ではなくプレーヤーレベルのスキップなので競合しません。

**スポンサー区間のマーカーが表示されません。**
SponsorBlockのデータはコミュニティ提供のため、区間情報がない動画もあります。

**Safari / Firefoxでも使えますか？**
ユーザースクリプト（`tubepilot.user.js`）版で使えます。

**YouTubeのアップデートで動かなくなったら？**
YouTubeのDOM構造変更により一部機能が壊れることがあります。[issue](https://github.com/sapgun/tubepilot/issues)で報告してください。

## 🗺 ロードマップ

- [ ] Chromeウェブストアへの正式公開
- [ ] キーボードショートカット対応
- [ ] 保存時のタイムスタンプ付きメモ

## 🤝 貢献

バグ報告・機能提案は[issue](https://github.com/sapgun/tubepilot/issues)へ、コード貢献はPRで歓迎します。
PRの前に`cd extension/test && npm install && npm test`でテストを実行してください。

## 📄 ライセンス

MIT — 詳細は[LICENSE](LICENSE)を参照してください。
