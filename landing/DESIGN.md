# Design and product basis

## 제품 근거

- 저장소: https://github.com/sapgun/tubepilot
- 분석 기준 커밋: `bb5bbb34ecefb7988c0f5ff0c9137846c0b6ed7e`
- 실제 manifest 및 GitHub 최신 릴리즈: `v1.9.2`
- 릴리즈 파일: `tubepilot-v1.9.2-extension.zip`
- 기존 페이지: https://sapgun.github.io/tubepilot/
- 읽은 소스: README, CHANGELOG, extension/manifest.json, extension/content.js, docs/index.html, docs/privacy.html.
- README 일부 버전 표시는 1.8.0이지만 manifest와 최신 릴리즈를 기준으로 문구를 정했습니다.

## 방향

제품은 광고 스킵 하나에 국한되지 않고 시청·기억·캡처·탐색을 다룹니다. 중심 메시지는 ‘시청의 주도권’이며, 영문은 ‘Your YouTube. Your rules.’로 자연스럽게 조정했습니다.

상단의 어두운 배경은 영상과 조작 데모에 집중시키고, 밝은 기능 섹션은 긴 페이지의 리듬을 바꿉니다. 서체는 Manrope와 Noto Sans KR, 메인 색상은 `#101410`과 `#D1F99A`입니다. WebGL 등고선은 ‘탐색/조종’이라는 성격을 보조하며 저속으로 움직입니다.

순서: 히어로 → 기능 체험 → 네 가지 핵심 기능 → 로컬 저장과 프라이버시 → 실제 설치 안내 → FAQ → 최종 CTA → 개발자·후원.

## 레퍼런스 적용 방식

- Untitled UI: https://www.untitledui.com/react/components — 명확한 버튼 계층, 탭, 설치 단계, FAQ 패턴 및 일관된 간격을 참고했습니다.
- Uiverse: https://uiverse.io/ — 버튼의 빛 반사, 상태 변화와 작은 상호작용에서 영감을 받았습니다.
- 유료 컴포넌트나 사이트 코드를 복제하지 않고 React/CSS로 직접 작성했습니다. 해당 라이브러리를 설치했다고 주장하지 않습니다.
- 사용자 수, 평점, 기업 고객 로고, 추천 문구, 성능 수치는 만들어 넣지 않았습니다.
- 400%와 5개 언어는 확장 소스/README에 근거한 실제 지원 범위입니다.

## 정확성

스토어 원클릭 설치처럼 표현하지 않고 GitHub 수동 설치를 안내합니다. 광고 스킵은 완전한 차단을 보장하지 않으며, SponsorBlock은 커뮤니티 데이터가 있는 영상에만 작동한다는 점을 FAQ에 명시했습니다. 캡처 설명은 원시 비디오 프레임 추출을 보장하지 않고 플레이어 영역 캡처로 표현했습니다.

## 범위

이 작업은 랜딩페이지 제작입니다. 확장의 실제 광고 차단, YouTube 호환성, 지갑 프로그램, 송금 동작은 변경하거나 검증하지 않았습니다. 데모는 기능을 설명하기 위한 별도의 조작형 프리뷰입니다.

## Designeer refinement

Designeer (https://designeer.xyz/) is a curated resource directory. Its fine dashed rules, compact monospaced labels and restrained interaction hierarchy informed the refinement, rather than its full sidebar layout.

- Motion (https://motion.dev/docs/react-layout-animations), listed in Designeer, powers a shared spring selection rail in the product demo and browser installation tabs. Motion Primitives (https://motion-primitives.com/) informed the minimal interaction direction; its component code was not copied.
- Feature cards have a low-opacity pointer-following highlight on fine-pointer devices. Touch interaction is unaffected. Reduced-motion preference disables both the shared travel animation and pointer illumination.
- Existing WebGL contours remain the main ambient texture. The shader catalogue was reviewed, but an additional animated sphere would compete with the product demo, so it was not added.
