import fs from 'node:fs';
import { messages, languages } from '../src/translations.js';

const origin = 'https://tubepilot.trenchclub.dev';
const repo = 'https://github.com/sapgun/tubepilot';
const version = JSON.parse(fs.readFileSync(new URL('../../extension/manifest.json', import.meta.url))).version;
const dist = new URL('../dist/', import.meta.url);
const indexes = { en: 0, ja: 1, pt: 2, es: 3 };
const translate = (key, lang) => lang === 'ko' ? key : messages[key][indexes[lang]];
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const urlFor = (path, lang) => `${origin}${path}${lang === 'ko' ? '' : `?lang=${lang}`}`;
const templates = Object.fromEntries(['index.html', 'privacy.html'].map(file => [file, fs.readFileSync(new URL(file, dist), 'utf8')]));
const privacyDescription = {
  ko: 'TubePilot의 로컬 데이터 저장, SponsorBlock 조회, 백업과 삭제에 관한 개인정보처리방침.',
  en: 'How TubePilot handles local data, SponsorBlock requests, backups and deletion.',
  ja: 'TubePilotのローカル保存、SponsorBlock照会、バックアップと削除について。',
  pt: 'Como o TubePilot trata dados locais, consultas ao SponsorBlock, backups e exclusão.',
  es: 'Cómo TubePilot trata datos locales, consultas a SponsorBlock, copias y eliminación.',
};
const noScript = {
  ko: '인터랙티브 체험에는 JavaScript가 필요합니다. 확장 파일과 설치 안내는 아래에서 확인할 수 있습니다.',
  en: 'The interactive demo requires JavaScript. Extension files and installation instructions are available below.',
  ja: '体験デモにはJavaScriptが必要です。拡張ファイルと導入手順は以下で確認できます。',
  pt: 'A demo interativa precisa de JavaScript. Arquivos e instruções de instalação estão abaixo.',
  es: 'La demo interactiva necesita JavaScript. Los archivos e instrucciones están abajo.',
};
const locales = { ko: 'ko_KR', en: 'en_US', ja: 'ja_JP', pt: 'pt_BR', es: 'es_ES' };
const allUrls = [];
for (const { code: lang } of languages) {
  for (const file of ['index.html', 'privacy.html']) {
    const privacy = file === 'privacy.html';
    const path = privacy ? '/privacy.html' : '/';
    const canonical = urlFor(path, lang);
    const title = privacy ? `TubePilot — ${translate('개인정보처리방침', lang)}` : `TubePilot — ${translate('시청의 주도권을,', lang)} ${translate('당신에게.', lang)}`;
    const description = privacy ? privacyDescription[lang] : translate('스킵부터 확대, 캡처, 다시보기까지. PC YouTube를 내 방식대로.', lang);
    let html = templates[file].replace(/<html lang="[^"]+">/, `<html lang="${lang}">`);
    // Replace social/SEO fields in built HTML, leaving Vite's asset references intact.
    html = html.replace(/<title>[\s\S]*?<\/title>/, '').replace(/<link rel="canonical"[^>]*>/g, '').replace(/<meta[^>]*(?:name="(?:description|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/g, '');
    const meta = [
      `<title>${escape(title)}</title>`,
      `<meta name="description" content="${escape(description)}">`,
      `<meta name="robots" content="index,follow,max-image-preview:large">`,
      `<link rel="canonical" href="${escape(canonical)}">`,
      ...languages.map(({code}) => `<link rel="alternate" hreflang="${code}" href="${escape(urlFor(path, code))}">`),
      `<link rel="alternate" hreflang="x-default" href="${origin}${path}">`,
      `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">`,
      `<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`,
      `<meta property="og:site_name" content="TubePilot">`,
      `<meta property="og:type" content="website">`,
      `<meta property="og:title" content="${escape(title)}">`,
      `<meta property="og:description" content="${escape(description)}">`,
      `<meta property="og:url" content="${escape(canonical)}">`,
      `<meta property="og:locale" content="${locales[lang]}">`,
      ...Object.values(locales).filter(l => l !== locales[lang]).map(l => `<meta property="og:locale:alternate" content="${l}">`),
      `<meta property="og:image" content="${origin}/assets/social-preview.png">`,
      `<meta property="og:image:type" content="image/png">`,
      `<meta property="og:image:width" content="1200">`,
      `<meta property="og:image:height" content="630">`,
      `<meta property="og:image:alt" content="TubePilot — desktop YouTube tools">`,
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${escape(title)}">`,
      `<meta name="twitter:description" content="${escape(description)}">`,
      `<meta name="twitter:image" content="${origin}/assets/social-preview.png">`,
      `<meta name="twitter:image:alt" content="TubePilot — desktop YouTube tools">`,
    ];
    const schema = privacy
      ? { '@context': 'https://schema.org', '@type': 'WebPage', name: title, description, url: canonical, inLanguage: lang }
      : { '@context': 'https://schema.org', '@graph': [
          { '@type': 'WebSite', name: 'TubePilot', url: origin + '/', inLanguage: languages.map(l => l.code) },
          { '@type': 'SoftwareApplication', name: 'TubePilot', url: canonical, description, softwareVersion: version, applicationCategory: 'BrowserApplication', operatingSystem: 'Desktop Chrome, Edge, Brave', downloadUrl: `${repo}/archive/refs/heads/main.zip`, license: `${repo}/blob/main/LICENSE`, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, author: { '@type': 'Person', name: 'sapgun', url: 'https://github.com/sapgun' } },
        ] };
    meta.push(`<script type="application/ld+json" id="site-schema">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`);
    html = html.replace('</head>', meta.join('\n') + '\n</head>');
    const privacySections = privacy ? [
      ['1. 외부로 전송되는 정보', '스폰서 구간을 조회할 때 시청 중인 YouTube 영상의 ID를 SponsorBlock API(sponsor.ajay.app)로 전송합니다. 구간 정보를 받기 위한 용도로 사용합니다.'],
      ['2. 브라우저에 저장되는 정보', '확장 설정, 다시보기 라이브러리, 태그, 메모, 구간 북마크는 브라우저의 로컬 저장소에 보관됩니다. TubePilot 개발자의 서버로 전송하지 않습니다.'],
      ['3. 이 웹사이트의 데이터', '랜딩페이지는 언어 선택을 브라우저에 저장합니다. 데모 상태는 페이지를 새로고침하면 초기화됩니다. 분석·광고 추적 스크립트는 포함하지 않습니다. 외부 링크를 열면 해당 서비스의 정책이 적용됩니다.'],
      ['4. 백업과 삭제', '확장을 삭제하면 해당 확장의 로컬 데이터도 삭제됩니다. 필요한 데이터는 삭제 전에 JSON으로 백업하세요. 내려받은 백업 파일은 사용자가 직접 관리합니다. 사이트의 언어 설정은 브라우저 사이트 데이터에서 삭제할 수 있습니다.'],
      ['5. 문의', '개인정보 관련 문의는 GitHub Issues 또는 비즈니스 이메일로 연락해 주세요.'],
    ].map(([heading, text]) => `<section><h2>${escape(translate(heading, lang))}</h2><p>${escape(translate(text, lang))}</p></section>`).join('') : '';
    html = html.replace('</body>',  `<noscript><main style="max-width:720px;margin:48px auto;padding:24px;font-family:system-ui;line-height:1.8"><h1>${escape(title)}</h1><p>${escape(description)}</p><p>${escape(noScript[lang])}</p>${privacySections}<p><a href="${repo}/archive/refs/heads/main.zip">${escape(translate('최신 버전 다운로드', lang))}</a> · <a href="${repo}">GitHub</a> · <a href="${urlFor('/privacy.html', lang)}">${escape(translate('개인정보처리방침', lang))}</a></p></main></noscript>\n</body>`);
    const directory = new URL(`locales/${lang}/`, dist);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(new URL(file, directory), html);
    if (lang === 'ko') fs.writeFileSync(new URL(file, dist), html);
    allUrls.push(canonical);
  }
}
fs.writeFileSync(new URL('sitemap.xml', dist), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allUrls.map(u => `  <url><loc>${escape(u)}</loc></url>`).join('\n')}\n</urlset>\n`);
console.log('Generated static social/search metadata and no-JavaScript installation guidance for 5 languages × 2 pages.');
