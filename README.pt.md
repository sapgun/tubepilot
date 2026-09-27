<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.es.md">Español</a> ·
  <a href="README.pt.md"><strong>Português</strong></a>
</p>

<p align="center">
  <img src="assets/hero.png" alt="TubePilot" width="720">
</p>

<p align="center">
  <strong>YouTube no PC, como o ReVanced.</strong><br>
  Pule anúncios, pule patrocínios e salve vídeos com tags para depois.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.8.0-blue" alt="version">
  <img src="https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-orange" alt="platform">
  <img src="https://img.shields.io/badge/languages-ko%20%7C%20en%20%7C%20ja%20%7C%20es%20%7C%20pt-purple" alt="languages">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="prs welcome">
</p>

---

## ✨ Recursos

| | Recurso | Descrição |
|---|---|---|
| ⏭ | **Pular anúncios de vídeo automaticamente** | Clica no botão de pular ao detectar anúncios pre-roll/mid-roll. Anúncios impossíveis de pular são avançados até o fim + 16x de velocidade + mudo, e depois seu volume/velocidade originais são restaurados |
| 🟩 | **Marcação + pulo do SponsorBlock** | Segmentos de patrocinador/introdução/encerramento/autopromoção aparecem como marcadores coloridos na barra de progresso, com pulo automático. Ativação por categoria (usa a API pública do SponsorBlock) |
| 🔍 | **Zoom e panorâmica de vídeo** | Zoom de até 400% com os botões ＋/－, arraste o vídeo para mover com zoom |
| 💬 | **Ocultar comentários (modo foco)** | Oculta toda a seção de comentários para você focar no vídeo |
| 📚 | **Biblioteca para assistir depois** | Salve vídeos com tags + palavras-chave/notas. Extrai `#hashtags` das descrições, filtros por tags + busca unificada em título/canal/tags/notas. Ao reabrir um vídeo salvo, um **banner de lembrete** mostra suas tags e notas para você lembrar na hora por que o salvou |
| 💾 | **Backup e restauração** | Exporte suas configurações + biblioteca como JSON e restaure quando quiser |
| 📷 | **Captura de tela** | Salva o quadro atual como PNG (`Alt+S`), recortado para a área do player |
| ⌨️ | **Atalhos de teclado** | `Alt+S` captura · `Alt+H` ocultar/exibir comentários · `Alt+B` diálogo de salvar |

Tudo é ativado no painel 🎬 no canto inferior direito das páginas do YouTube.
**Arraste o cabeçalho do painel para colocá-lo onde quiser** (a posição é salva, duplo clique para redefinir).
Fixe **abaixo do player** nas configurações e ele acompanha redimensionamentos.
**Clique em um marcador colorido** na barra de progresso para ir direto ao início daquele segmento.

🌍 Interface disponível em **한국어 · English · 日本語 · Español · Português** — detectada do seu navegador, trocável a qualquer hora no popup da extensão.

## 📦 Instalação

### A. Extensão do navegador (recomendado)

1. Clone este repo ou baixe + descompacte `tubepilot-1.8.0.zip` na [release mais recente](https://github.com/sapgun/tubepilot/releases)
2. Acesse `chrome://extensions` → ative o **modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação** → selecione a pasta `extension/`
4. Abra o youtube.com → pronto quando o painel 🎬 aparecer no canto inferior direito

> O ícone do TubePilot na barra controla a ativação geral e o idioma. Os ajustes finos ficam no painel 🎬 das páginas do YouTube.

### B. Userscript (alternativa)

Usuários de Tampermonkey / Violentmonkey podem usar o `tubepilot.user.js` diretamente.
Abra o arquivo no navegador após instalar um gerenciador de userscripts e confirme a instalação.
(`@updateURL` verifica novas versões automaticamente)

## 🚀 Uso

- **Pular anúncios**: deixe ativado. Os anúncios são pulados sozinhos.
- **Segmentos de patrocinador**: veja os marcadores coloridos na barra de progresso; desative categorias indesejadas no painel.
- **Zoom**: botões ＋/－ do painel; arraste o vídeo para mover com zoom acima de 100%.
- **Salvar para depois**: botão **Salvar** do painel → adicione tags e notas. As `#hashtags` da descrição entram com um clique.
- **Biblioteca**: botão **Lista** do painel → filtre por tags ou digite na busca.

## 🔒 Privacidade

- As configurações e a biblioteca ficam **só no armazenamento local do seu navegador**. Nunca são enviadas a servidores.
- Ao buscar segmentos de patrocinador, o ID do vídeo é enviado à API pública do SponsorBlock (`sponsor.ajay.app`). Nenhum outro dado pessoal é transmitido.

## ❓ FAQ

**Posso usar com o uBlock Origin?**
Sim. O TubePilot pula no nível do player em vez de bloquear rede, então não há conflito.

**Os marcadores de segmentos não aparecem.**
Os dados do SponsorBlock são da comunidade, então alguns vídeos não têm informações de segmentos.

**Funciona no Safari / Firefox?**
Sim, com a versão userscript (`tubepilot.user.js`).

**E se uma atualização do YouTube quebrar?**
Mudanças no DOM do YouTube podem quebrar recursos. Por favor [abra uma issue](https://github.com/sapgun/tubepilot/issues).

## 🗺 Roteiro

- [ ] Publicação na Chrome Web Store
- [ ] Atalhos de teclado
- [ ] Notas com timestamp ao salvar

## 🤝 Contribuir

Bugs e sugestões em [issues](https://github.com/sapgun/tubepilot/issues); código via PR.
Antes de um PR, rode `cd extension/test && npm install && npm test`.

## 📄 Licença

MIT — veja [LICENSE](LICENSE).
