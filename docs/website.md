# Website structure and deployment

랜딩페이지 소스는 `landing/` 한 곳에서 관리하고 Vercel로 배포합니다.

```text
tubepilot/
├── landing/                 React/Vite 랜딩 + 5개 언어 + privacy.html
│   ├── src/
│   ├── public/
│   ├── scripts/
│   ├── package.json
│   └── package-lock.json
├── extension/               확장 프로그램 (변경 없음)
├── assets/                  저장소 README 이미지
├── docs/                    스토어 제출 자료와 프로젝트 문서
├── tubepilot.user.js         유저스크립트 (변경 없음)
└── vercel.json              저장소 루트에서 landing/ 빌드
```

## Vercel

- URL: https://tubepilot-rho.vercel.app/
- Root Directory: 저장소 루트 (`.` 또는 빈 값)
- 설정 파일: 루트 `vercel.json`
- 설치: `npm ci --prefix landing`
- 빌드: `npm run build --prefix landing`
- 산출물: `landing/dist`
- Node.js: 22.12 이상

기존 프로젝트의 Root Directory가 `docs` 또는 이전 폴더명으로 지정되어 있으면 루트로 바꾸고 다시 배포합니다. 이 변경본을 GitHub에 반영해야 Git 연동 배포에서 사용할 수 있습니다.

## 기존 GitHub Pages

`docs/index.html`, `docs/privacy.html`과 해당 페이지 전용 이미지 `docs/hero.png`, `docs/icon.png`는 제거했습니다. 이전 내용은 Git 기록에서 복구할 수 있습니다. `assets/hero.png` 등 README 자산, 스토어 프로모 이미지는 유지했습니다.

이 저장소에는 Pages 배포 워크플로 파일이 없습니다. GitHub 저장소 설정에서 관리되는 기존 배포는 로컬 파일 삭제만으로 즉시 종료되지 않습니다.

1. Vercel에서 메인 페이지와 `/privacy.html`이 정상적으로 열리는지 확인합니다.
2. GitHub → Settings → Pages에서 **Unpublish site**로 기존 사이트를 종료하고, Build and deployment → Source의 브랜치를 **None**으로 설정해 다시 게시되지 않도록 합니다.
3. 스토어 개인정보처리방침 URL도 Vercel의 `/privacy.html`로 갱신합니다.

GitHub에 이 구조를 반영한 뒤 Vercel에서 해당 커밋을 배포합니다. Git 연동 설정에 따라 push 시 자동 배포될 수 있습니다. 기존 Pages 종료는 Vercel의 메인 페이지와 개인정보처리방침이 정상 동작하는지 확인한 뒤 진행하세요.

## 확인

저장소 루트에서:

```sh
npm ci --prefix landing
npm run check --prefix landing
npm run build --prefix landing
```

Vercel 설정 근거: https://vercel.com/docs/project-configuration/vercel-json
