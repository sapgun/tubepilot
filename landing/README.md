# TubePilot landing

TubePilot v1.9.2의 실제 기능과 설치 경로를 바탕으로 만든 React + Vite 랜딩페이지입니다. 한국어·영어·일본어·포르투갈어·스페인어를 지원합니다. 랜딩 소스는 이 `landing/` 폴더에서만 관리합니다. 확장 프로그램 소스는 상위 `extension/`에 있습니다.

## 실행

Node.js 22.12 이상을 권장합니다.

```sh
npm ci
npm run dev
```

개발 서버: http://localhost:5173

```sh
npm run check
npm run build
npm run preview
```

## Vercel 설정

서비스 주소: https://tubepilot-rho.vercel.app/

GitHub 저장소를 연결할 때 **Root Directory는 저장소 루트(`.`)** 로 설정하세요. 루트의 `vercel.json` 한 곳에서 빌드를 관리합니다.

| 항목 | 값 |
| --- | --- |
| Root Directory | `.` (비워 두기) |
| Framework Preset | Other (`framework: null`) |
| Install | `npm ci --prefix landing` |
| Build | `npm run build --prefix landing` |
| Output | `landing/dist` |
| 환경 변수 | 없음 |

이 폴더에서 로컬 개발할 때는 위 실행 명령을 그대로 사용합니다. 배포는 사용자가 수행합니다. 메인 페이지와 `privacy.html`이 함께 생성됩니다.

구조 변경과 기존 GitHub Pages 종료 절차는 상위 `docs/website.md`를 참고하세요.

## 언어 지원

- 기본 언어는 한국어입니다. 상단 선택기에서 변경할 수 있습니다.
- `?lang=ko`, `?lang=en`, `?lang=ja`, `?lang=pt`, `?lang=es`로 직접 열 수 있습니다.
- URL의 언어 → 저장된 선택 → 한국어 순서로 결정합니다. 저장소 접근이 제한돼도 URL로 동작합니다.
- 선택을 브라우저 로컬 저장소에 보관합니다. 언어 전환 시 데모 상태는 초기화됩니다.
- 본문, CTA, 데모 안내, 접근성 레이블, FAQ, 설치 안내, 개인정보처리방침을 번역했습니다.
- 브랜드명, 예시 영상의 영문 타이틀, 일부 디자인용 영문 라벨은 의도적으로 유지했습니다.
- 번역 수정: `src/translations.js`. 원문 키마다 영어·일본어·포르투갈어·스페인어 순서입니다.
- 포르투갈어는 브라질식, 스페인어는 범용 표현을 사용했습니다. 원어민 전문 감수는 별도로 진행하지 않았습니다.

## 구현

- 차콜·라임 색상, 넓은 여백, 사진 중심 플레이어 데모, 밝은 기능 섹션, 설치 가이드, FAQ, 후원 푸터.
- 직접 작성한 WebGL 등고선 배경. WebGL 미지원 시 CSS 배경 유지. 화면 밖·숨겨진 탭에서 애니메이션 중지, reduced-motion 지원.
- 인터랙티브 기능 설명: 구간 마커 이동, 스킵, 100–400% 줌, 드래그 패닝, 북마크 토글, 태그 필터.
- 캡처는 로컬 예시 이미지에서 PNG를 생성하고 모달로 미리 봅니다. 실제 YouTube 영상 재생·광고 차단을 페이지 안에서 실행하지 않습니다.
- 공개 프로젝트에 실제 앱 스크린샷이 없으므로 데모에는 실제 UI와 다르다는 표시를 넣었습니다. 향후 실화면으로 교체할 수 있습니다.
- 브라우저별 설치 주소와 복사 UI. 클립보드 권한이 거부되면 직접 복사 안내가 표시됩니다.
- 모든 사진·폰트를 로컬 제공. 방문 시 분석 서비스나 원격 이미지·폰트 서버를 호출하지 않습니다.
- 후원은 원본의 Ko-fi, ETH/SOL 주소와 지갑 링크를 제공합니다. 지갑 앱 실행·송금은 테스트하지 않았습니다.

## 구성

```text
src/main.jsx          페이지, 데모, 언어 선택, 개인정보처리방침
src/Ambient.jsx       WebGL 등고선 배경
src/style.css         반응형 디자인과 모션
src/translations.js   5개 언어와 선택 언어 관리
scripts/check.mjs     번역 누락·변수·정적 참조 검사
public/assets/        로컬 이미지
privacy.html          개인정보처리방침 진입점
vite.config.js        메인/개인정보처리방침 빌드 설정
```

검증 범위와 한계는 `QA.md`, 디자인 판단과 출처는 `DESIGN.md`, 자산 정보는 `THIRD_PARTY_NOTICES.md`에 기록했습니다.
