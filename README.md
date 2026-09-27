<p align="center">
  <img src="assets/hero.png" alt="TubePilot" width="720">
</p>

<p align="center">
  <strong>PC 유튜브를 ReVanced처럼.</strong><br>
  광고는 넘기고, 스폰서는 건너뛰고, 보고 싶은 영상은 태그로 저장하세요.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.2.0-blue" alt="version">
  <img src="https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-orange" alt="platform">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="prs welcome">
</p>

---

## ✨ 기능

| | 기능 | 설명 |
|---|---|---|
| ⏭ | **영상 광고 자동 스킵** | 프리롤/미드롤 감지 시 스킵 버튼 자동 클릭. 스킵 불가 광고는 끝으로 시크 + 16배속 + 음소거로 통과하고, 끝나면 원래 음량/배속으로 복원 |
| 🟩 | **SponsorBlock 마킹 + 스킵** | 스폰서/인트로/아웃트로/자기홍보 구간을 진행 바에 색깔 마커로 표시하고 자동 스킵. 카테고리별 on/off 가능 (공개 SponsorBlock API 사용) |
| 🔍 | **영상 줌/패닝** | ＋/－ 버튼으로 최대 400% 확대, 줌 상태에서 영상 드래그로 화면 이동 |
| 📚 | **다시보기 라이브러리** | 태그 + 키워드/메모와 함께 영상 저장. 설명란의 `#해시태그` 자동 추출, 태그 칩 필터 + 제목·채널·태그·메모 통합 검색. 저장된 영상을 다시 열면 **리콜 배너**가 태그와 메모를 보여줘서 "왜 저장했더라"를 바로 유추 가능 |

모든 기능은 유튜브 페이지 우측 하단의 🎬 패널에서 켜고 끌 수 있습니다.

## 📦 설치

### A. 브라우저 확장 (권장)

1. 이 레포를 클론하거나 [최신 릴리즈](https://github.com/sapgun/tubepilot/releases)에서 `tubepilot-1.2.0.zip` 다운로드 후 압축 해제
2. `chrome://extensions` 접속 → 우측 상단 **개발자 모드** 켜기
3. **압축해제된 확장 프로그램을 로드합니다** 클릭 → `extension/` 폴더 선택
4. youtube.com 접속 → 우측 하단에 🎬 패널이 뜨면 완료

> 툴바의 TubePilot 아이콘으로 전체 사용 on/off 가능. 세부 설정은 유튜브 페이지의 🎬 패널에서 변경.

### B. 유저스크립트 (대안)

Tampermonkey / Violentmonkey 사용자라면 `tubepilot.user.js`를 그대로 사용할 수 있습니다.
매니저 설치 후 파일을 브라우저로 열면 설치 확인창이 뜹니다.
(`@updateURL`이 있어 새 버전 푸시 시 자동 업데이트 확인)

## 🚀 사용법

- **광고 스킵**: 켜두기만 하면 됩니다. 광고가 나오면 자동으로 넘어갑니다.
- **스폰서 구간**: 진행 바의 색깔 마커로 구간을 확인하고, 원치 않는 카테고리는 패널에서 끄세요.
- **줌**: 패널의 ＋/－ 버튼으로 확대, 100% 초과 상태에서 영상을 드래그하면 화면을 이동합니다.
- **다시보기 저장**: 패널의 **저장** 버튼 → 태그와 메모를 적어 저장. 설명란의 `#해시태그`는 클릭 한 번으로 태그에 추가됩니다.
- **다시보기 목록**: 패널의 **목록** 버튼 → 태그 칩으로 필터링하거나 검색창에 키워드를 입력하세요.

## 🔒 프라이버시

- 설정과 다시보기 라이브러리는 **브라우저 로컬에만 저장**됩니다. 외부 서버로 전송되지 않습니다.
- SponsorBlock 구간 조회 시 영상 ID가 공개 SponsorBlock API(`sponsor.ajay.app`)로 전송됩니다. 그 외의 개인정보는 전송되지 않습니다.

## ❓ FAQ

**uBlock Origin과 같이 써도 되나요?**
네. TubePilot은 네트워크 차단이 아니라 플레이어 단위 스킵이라 충돌하지 않습니다.

**스폰서 구간 마커가 안 보여요.**
SponsorBlock 데이터는 커뮤니티 기여 기반이라 구간 정보가 없는 영상도 있습니다.

**Safari / Firefox에서도 되나요?**
유저스크립트(`tubepilot.user.js`) 버전으로 사용할 수 있습니다.

**유튜브 업데이트로 안 되면 어떻게 하나요?**
유튜브 DOM 구조가 바뀌면 일부 기능이 깨질 수 있습니다. [이슈](https://github.com/sapgun/tubepilot/issues)에 제보해 주세요.

## 🗺 로드맵

- [ ] Chrome 웹스토어 정식 게시
- [ ] 키보드 단축키 지원
- [ ] 다시보기 라이브러리 내보내기/가져오기 (JSON)
- [ ] 저장 시점 타임스탬프 메모

## 🤝 기여

버그 제보와 기능 제안은 [이슈](https://github.com/sapgun/tubepilot/issues)로, 코드 기여는 PR로 환영합니다.

## 📄 라이선스

MIT — 자세한 내용은 [LICENSE](LICENSE)를 참고하세요.
