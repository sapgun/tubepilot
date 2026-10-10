<p align="center"><a href="https://tubepilot.trenchclub.dev/">Site oficial</a></p>

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
  <strong>Uma forma mais confortável de assistir ao YouTube.</strong><br>
  Pule anúncios, pule patrocínios e salve vídeos com tags para depois.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.11.0-blue" alt="version">
  <img src="https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-orange" alt="platform">
  <img src="https://img.shields.io/badge/languages-ko%20%7C%20en%20%7C%20ja%20%7C%20es%20%7C%20pt-purple" alt="languages">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="prs welcome">
</p>


---

## Um painel que deixa espaço para o vídeo

O TubePilot adiciona trechos, pulos e uma biblioteca local ao player original do YouTube no desktop. Não exige conta do TubePilot.

## Recursos

| Recurso | Descrição |
|---|---|
| Desfazer pulo | O aviso permite voltar por seis segundos. O trecho e os trechos sobrepostos não serão pulados automaticamente nesta visita. |
| Ações por categoria | Escolha automático, manual ou só marcar por categoria. O controle geral de pulo automático continua valendo. |
| Regras por canal | Use ajustes gerais, manual ou só marcar no canal atual. O canal é identificado pelo link, não pelo nome. |
| Meus trechos | Digite início/fim ou registre o tempo atual. Aplicam-se apenas ao vídeo, ficam neste navegador, podem ser excluídos da lista e fazem parte do backup JSON dos ajustes. Não são enviados ao SponsorBlock. |
| Trechos | Marcadores, linha do tempo e lista com início/fim para patrocinadores, introduções, encerramentos, autopromoção, pedidos de interação e música fora do tema. Inclui pulo manual. |
| Pulo automático | Ajuste geral e por categoria. Desativá-lo mantém os dados dos trechos visíveis. |
| Painel | `＋ / −` abre/fecha; `↗ / ↙` alterna entre amplo e compacto. Salva o estado. Novas instalações começam fechadas abaixo do player. |
| Anúncios | Tenta clicar no botão de pular, avançar e acelerar anúncios detectados. Pode silenciar e restaurar o estado de áudio e a velocidade anteriores. Não garante a remoção. |
| Visualização | Zoom até 400%, arraste para deslocar e opção de ocultar comentários. |
| Biblioteca | Vídeos com tags e notas, pesquisa, filtros e lembrete ao reabri-los. |
| Marcadores de intervalos | Salva intervalos com notas, pula até eles e pausa ao final. |
| Capturas | PNG da área visível do player: arquivo, área de transferência ou ambos. Recorta a captura da aba; não extrai quadros diretamente. |
| Backup | JSON com ajustes, biblioteca e marcadores. A restauração substitui ajustes e biblioteca; marcadores incluídos também substituem os existentes. |

Interface em coreano, inglês, japonês, espanhol e português. Altere idioma, capturas e atalhos no popup da extensão.

## Instalação e atualização

1. Baixe e extraia o [ZIP da main](https://github.com/sapgun/tubepilot/archive/refs/heads/main.zip), ou clone o repositório.
2. Abra `chrome://extensions` ou `edge://extensions` e ative o modo de desenvolvedor.
3. Escolha **Carregar sem compactação** e selecione `extension/`, a pasta com `manifest.json`.
4. Recarregue o YouTube e clique em `＋` no painel abaixo do vídeo.

Antes de atualizar, exporte um backup pela biblioteca. Substitua os arquivos da pasta instalada, recarregue a extensão e depois o YouTube. Evite instalar cópias duplicadas. O controle geral é verificado ao carregar a página: recarregue o YouTube após alterá-lo.

## Controles

- Os ajustes incluem categorias, zoom, posição, opacidade e ações de salvar/biblioteca/captura/marcadores. Escolha **abaixo do player** para não cobrir o vídeo.
- Compacto: 340px. Amplo: largura disponível abaixo do player ou 540px quando flutuante, limitado à largura da tela.
- Arraste o cabeçalho no modo flutuante; clique duplo redefine a posição e clique simples abre/fecha. O painel fica oculto em tela cheia.
- Marcadores levam ao início; **Pular** leva ao fim. O pulo manual fica indisponível durante anúncios detectados do YouTube.
- `Alt+S`: captura; `Alt+H`: comentários; `Alt+B`: salvar. São configuráveis.

## Dados, limites e privacidade

Os trechos vêm da comunidade pela [API do SponsorBlock](https://wiki.sponsor.ajay.app/w/API_Docs). O conteúdo não é analisado para descobrir anúncios não reportados. Ausência de dados e erros de consulta são estados separados. Anúncios do YouTube e patrocinadores dentro do vídeo usam tratamentos diferentes. Mudanças do YouTube podem afetar o funcionamento; a compatibilidade com outras ferramentas de anúncios não é garantida. Sem afiliação ao YouTube, ReVanced ou SponsorBlock.

O [userscript](https://raw.githubusercontent.com/sapgun/tubepilot/main/tubepilot.user.js) **1.1.2** é mantido separadamente da extensão **1.11.0**. Instale com Tampermonkey/Violentmonkey. Ele não inclui o novo painel nem todos os recursos da extensão. Firefox/Safari não foram verificados. Não execute as duas edições ao mesmo tempo.

Ajustes, biblioteca e marcadores ficam no navegador. Consultas enviam o ID do vídeo a `sponsor.ajay.app`, que também recebe metadados normais de rede. Não há sincronização na nuvem. Backups exportados contêm vídeos e notas.

Permissões: `storage` para dados locais; `activeTab` para captura da aba; `clipboardWrite` para copiar imagens; `downloads` para salvá-las; `https://sponsor.ajay.app/*` para consultar trechos. Capturas podem exigir uma ação do usuário, como clicar no ícone da extensão.

## Ajuda e contribuições

Se o painel não aparecer, ative a extensão, recarregue e confira abaixo do vídeo ou a posição salva. Se faltarem marcadores, confira ajustes, metadados e estado da consulta. Para capturas, mantenha o player visível e clique no ícone se necessário. [Relate problemas](https://github.com/sapgun/tubepilot/issues) com versões, passos e URL do vídeo, sem dados privados.

```sh
cd extension/test
npm install
npm test
```

Os testes verificam funções, ajustes e traduções em um navegador simulado, não o sucesso ao pular anúncios reais. Confira reprodução, tela cheia, abertura/fechamento e atualizações no navegador de destino. [Histórico](CHANGELOG.md) · [Licença MIT](LICENSE)
