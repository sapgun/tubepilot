<p align="center"><a href="https://tubepilot.trenchclub.dev/">공식 홈페이지</a></p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.ko.md"><strong>한국어</strong></a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <img src="assets/hero.png" alt="TubePilot" width="720">
</p>

<p align="center">
  <strong>더 편안한 YouTube 시청.</strong><br>
  광고는 넘기고, 스폰서는 건너뛰고, 보고 싶은 영상은 태그로 저장하세요.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.10.1-blue" alt="version">
  <img src="https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-orange" alt="platform">
  <img src="https://img.shields.io/badge/languages-ko%20%7C%20en%20%7C%20ja%20%7C%20es%20%7C%20pt-purple" alt="languages">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="prs welcome">
</p>


---

## 시청을 방해하지 않는 작은 도구

TubePilot은 데스크톱의 원래 YouTube 플레이어에 작은 제어 패널을 더합니다. 커뮤니티가 등록한 구간을 확인하고 스폰서를 건너뛰며, 영상은 로컬 라이브러리에 저장할 수 있습니다. TubePilot 계정은 필요하지 않습니다.

## 기능

| 기능 | 동작 |
|---|---|
| 구간 타임라인 | 스폰서·인트로·아웃트로·자기홍보·구독 유도·주제 외 음악을 진행 바와 패널에 색으로 표시합니다. 목록에서 시작·종료 시간과 수동 건너뛰기 버튼을 제공합니다. |
| 구간 자동 스킵 | 전체 자동 스킵과 종류별 자동 스킵을 설정합니다. 자동 스킵을 꺼도 구간 정보는 표시됩니다. |
| 접을 수 있는 패널 | `＋ / −`로 펼치기·접기, `↗ / ↙`로 넓게·작게 보기. 크기와 접힘 상태를 저장하며, 새 설치는 영상 아래의 접힌 패널로 시작합니다. |
| 영상 광고 처리 | 감지된 광고의 스킵 버튼 클릭, 끝으로 이동·배속 변경을 시도합니다. 광고 중 음소거를 설정할 수 있고 종료 후 이전 음소거 상태·배속을 복원합니다. YouTube 변경에 영향을 받습니다. |
| 줌과 몰입 모드 | 최대 400% 확대, 드래그로 화면 이동, 댓글 숨기기를 제공합니다. |
| 로컬 라이브러리 | 태그·메모와 함께 영상 저장, 검색·필터링, 다시 열 때 리콜 배너를 제공합니다. |
| 구간 북마크 | 시간 범위와 메모를 저장하고, 해당 구간으로 이동해 종료 시점에 일시정지합니다. |
| 스크린샷 | 보이는 플레이어 영역을 PNG로 다운로드·클립보드 복사·동시 저장합니다. 탭 캡처를 잘라 저장하는 방식으로, 영상 프레임을 직접 추출하지 않습니다. |
| 백업·복원 | 설정·라이브러리·구간 북마크를 JSON으로 내보냅니다. 복원은 기존 설정과 라이브러리를 덮어쓰며, 북마크가 포함되어 있으면 기존 북마크도 덮어씁니다. |

한국어·영어·일본어·스페인어·포르투갈어를 지원합니다. 확장 팝업에서 언어, 캡처 저장 방식, 단축키를 변경할 수 있습니다.

## 설치와 업데이트

1. [main 브랜치 ZIP](https://github.com/sapgun/tubepilot/archive/refs/heads/main.zip)을 내려받아 압축을 풀거나 저장소를 클론합니다.
2. `chrome://extensions` 또는 `edge://extensions`에서 **개발자 모드**를 켭니다.
3. **압축해제된 확장 프로그램 로드**를 눌러 `manifest.json`이 있는 `extension/` 폴더를 선택합니다. 저장소 최상위 폴더가 아닙니다.
4. YouTube를 새로고침합니다. 시청 페이지의 영상 아래에 작은 TubePilot 패널이 나타나면 `＋`로 펼칩니다.

업데이트 전 라이브러리에서 데이터를 백업하세요. 기존 확장 폴더의 파일을 새 코드로 교체하고, 확장 관리 화면에서 해당 확장의 **새로고침**을 누른 다음 YouTube도 새로고침합니다. 중복 설치는 피하세요. 툴바의 전체 사용 토글은 페이지 로드 시 확인하므로, 변경 후 YouTube를 새로고침해야 합니다.

## 패널과 단축키

- **재생 및 스킵 설정**을 펼치면 종류별 스킵, 줌, 패널 위치·투명도, 목록·저장·캡처·구간 북마크를 사용할 수 있습니다.
- 영상을 가리지 않으려면 패널 위치를 **플레이어 아래**로 선택하세요. 작은 보기는 340px, 넓은 보기는 영상 아래의 가용 너비 또는 떠 있는 패널의 540px로 표시하며 화면 너비 안으로 제한합니다.
- 떠 있는 패널은 헤더를 드래그해 이동하고 더블클릭으로 저장된 위치를 초기화합니다. 헤더 클릭으로도 접고 펼칠 수 있습니다. 전체화면에서는 패널을 숨깁니다.
- 진행 바 마커와 패널 타임라인은 구간 시작으로, 목록의 **건너뛰기**는 구간 끝으로 이동합니다. 감지된 YouTube 광고 재생 중에는 수동 건너뛰기를 사용할 수 없습니다.
- 기본 단축키: `Alt+S` 캡처, `Alt+H` 댓글 숨기기, `Alt+B` 영상 저장. 확장 팝업에서 변경할 수 있습니다.

## 구간 데이터와 지원 범위

구간 정보는 [SponsorBlock 커뮤니티 API](https://wiki.sponsor.ajay.app/w/API_Docs)에서 가져옵니다. TubePilot이 영상 내용을 분석해 미등록 광고를 찾아내는 방식은 아닙니다. 구간이 없으면 커뮤니티 제보가 없을 수 있고, 조회 실패는 별도 상태로 표시합니다. YouTube가 재생하는 광고와 영상 안의 스폰서 구간은 서로 다른 방식으로 처리합니다. 모든 광고 제거를 보장하지 않으며 YouTube·ReVanced·SponsorBlock과 제휴된 제품이 아닙니다.

대안인 [유저스크립트](https://raw.githubusercontent.com/sapgun/tubepilot/main/tubepilot.user.js)는 **1.1.2**로, **1.10.1** 확장 프로그램과 별도로 관리됩니다. Tampermonkey·Violentmonkey 같은 매니저로 설치하세요. 새 구간 패널, 패널 크기·접힘 저장 및 확장의 모든 기능이 포함된 버전이 아닙니다. Firefox·Safari 지원은 매니저와 브라우저에 따라 달라지며 여기서 호환성을 검증하지 않았습니다. 확장과 유저스크립트는 동시에 실행하지 마세요.

## 개인정보와 권한

설정·라이브러리·북마크는 브라우저 로컬에 저장됩니다. 구간 조회 시 현재 영상 ID를 `sponsor.ajay.app`에 보내며, 서비스는 일반적인 네트워크 요청 정보도 받습니다. TubePilot 계정이나 클라우드 동기화는 없습니다. 내보낸 백업에는 저장한 영상과 메모가 포함됩니다.

| 권한 | 용도 |
|---|---|
| `storage` | 설정·라이브러리·북마크 로컬 저장 |
| `activeTab` | 스크린샷용 현재 탭 캡처. 브라우저에서 사용자 동작이 필요할 수 있습니다. |
| `clipboardWrite` | 스크린샷 클립보드 복사 |
| `downloads` | 스크린샷 파일 저장 |
| `https://sponsor.ajay.app/*` | 커뮤니티 구간 정보 조회 |

## 문제 해결과 기여

- **패널이 없어요:** 확장을 켠 뒤 YouTube를 새로고침하고, 영상 아래 또는 저장한 떠 있는 패널 위치를 확인하세요.
- **마커가 없어요:** 구간 표시 설정, 영상 메타데이터 로드, 패널의 조회·오류 상태를 확인하세요. 모든 영상에 제보가 있는 것은 아닙니다.
- **캡처가 실패해요:** 플레이어를 보이게 두고, 필요하면 확장 아이콘을 눌러 현재 탭 접근을 허용한 뒤 다시 시도하세요. 전체화면에서는 단축키를 사용할 수 있습니다.
- **광고 스킵이 안 돼요:** YouTube 변경으로 감지가 깨질 수 있습니다. 브라우저·확장 버전, 재현 순서, 영상 URL을 [이슈](https://github.com/sapgun/tubepilot/issues)에 남겨주세요. 개인정보는 제외하세요. 다른 광고 도구와의 호환성을 보장하지 않습니다.

확장 변경 시 다음 검사를 실행하세요.

```sh
cd extension/test
npm install
npm test
```

검사는 모의 브라우저에서 본문 기능·팝업·번역을 확인합니다. 실제 YouTube 광고 스킵 성공을 증명하지 않습니다. 대상 브라우저에서 설치·재생·전체화면·접기·펼치기·업데이트도 직접 확인하세요. 변경 내역은 [CHANGELOG](CHANGELOG.md), MIT 라이선스는 [LICENSE](LICENSE)를 참고하세요.
