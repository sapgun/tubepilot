# TubePilot

PC 유튜브용 ReVanced 스타일 파워팩. Tampermonkey 유저스크립트 하나로 동작한다.

## 기능

| 기능 | 설명 |
|---|---|
| 영상 광고 자동 스킵 | 프리롤/미드롤 감지 시 스킵 버튼 자동 클릭. 스킵 불가 광고는 끝으로 시크 + 16배속 + 음소거로 통과, 종료 후 원래 음량/배속 복원 |
| SponsorBlock 마킹 + 스킵 | 스폰서/인트로/아웃트로/자기홍보 구간을 진행 바에 색깔 마커로 표시하고 자동 스킵 (공개 SponsorBlock API 사용) |
| 영상 줌/패닝 | ＋/－ 버튼으로 최대 400% 확대, 줌 상태에서 영상 드래그로 화면 이동 |
| 다시보기 라이브러리 | 태그 + 키워드/메모와 함께 영상 저장. 설명란 `#해시태그` 자동 추출, 태그 칩 필터 + 통합 검색, 저장된 영상 열면 리콜 배너로 태그/메모 표시 |

우측 하단 🎬 패널에서 모든 기능을 켜고 끌 수 있다. 설정과 라이브러리는 브라우저에 저장된다.

## 설치

1. 유저스크립트 매니저 설치 (둘 중 편한 걸로): [Tampermonkey](https://www.tampermonkey.net/) 또는 [Violentmonkey](https://violentmonkey.github.io/) (오픈소스)
2. 아래 방법 중 하나:
   - **파일 설치**: `tubepilot.user.js`를 브라우저로 열기 → 매니저가 설치 확인창을 띄움
   - **URL 설치** (레포를 public으로 전환한 경우): 매니저 대시보드에서 `https://raw.githubusercontent.com/sapgun/tubepilot/main/tubepilot.user.js` 로 설치
3. youtube.com 접속 → 우측 하단에 🎬 패널이 뜨면 완료

`@updateURL`이 설정되어 있어 새 버전이 푸시되면 Tampermonkey가 자동으로 업데이트를 확인한다.

## 개발

단일 파일 구조라 수정 후 버전만 올리면 된다.

1. `tubepilot.user.js` 수정
2. 헤더의 `@version` 올리기 (semver)
3. `CHANGELOG.md`에 변경점 기록
4. 커밋 & 푸시 → Tampermonkey 자동 업데이트가 나머지 처리

## 참고

- 네트워크 단위 광고 차단(uBlock Origin 역할)이 아니라 플레이어 단위 스킵이라 유튜브 안티 애드블록 팝업과 무관하게 동작한다. uBlock Origin과 병행 사용 가능.
- SponsorBlock 구간 데이터는 커뮤니티 기여 기반이라 없는 영상도 있다.
- 유튜브 DOM 구조가 바뀌면 스킵 버튼 선택자 등 일부가 깨질 수 있다. 그땐 이슈에 제보.

## 라이선스

MIT
