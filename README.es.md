<p align="center"><a href="https://tubepilot-rho.vercel.app/">Sitio oficial</a></p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.es.md"><strong>Español</strong></a> ·
  <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <img src="assets/hero.png" alt="TubePilot" width="720">
</p>

<p align="center">
  <strong>YouTube en PC, como ReVanced.</strong><br>
  Salta los anuncios, omite los patrocinios y guarda videos con etiquetas para más tarde.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.8.0-blue" alt="version">
  <img src="https://img.shields.io/badge/platform-Chrome%20%7C%20Edge%20%7C%20Brave-orange" alt="platform">
  <img src="https://img.shields.io/badge/languages-ko%20%7C%20en%20%7C%20ja%20%7C%20es%20%7C%20pt-purple" alt="languages">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="license">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="prs welcome">
</p>

---

## ✨ Funciones

| | Función | Descripción |
|---|---|---|
| ⏭ | **Salto automático de anuncios** | Hace clic en el botón de saltar al detectar anuncios pre-roll/mid-roll. Los anuncios no omitibles se pasan buscando el final + 16x de velocidad + silencio, y luego se restauran tu volumen/velocidad originales |
| 🟩 | **Marcado + salto de SponsorBlock** | Los segmentos de patrocinador/intro/outro/autopromoción se muestran como marcadores de colores en la barra de progreso, con salto automático. Activación por categoría (usa la API pública de SponsorBlock) |
| 🔍 | **Zoom y paneo de video** | Zoom de hasta 400% con los botones ＋/－, arrastra el video para moverlo con zoom |
| 💬 | **Ocultar comentarios (modo enfoque)** | Oculta toda la sección de comentarios para concentrarte en el video |
| 📚 | **Biblioteca para ver más tarde** | Guarda videos con etiquetas + palabras clave/notas. Extrae `#hashtags` de las descripciones, filtros por etiquetas + búsqueda unificada en título/canal/etiquetas/notas. Al reabrir un video guardado, un **banner de recuerdo** muestra sus etiquetas y notas para que recuerdes al instante por qué lo guardaste |
| 💾 | **Respaldo y restauración** | Exporta tu configuración + biblioteca como JSON y restáuralas cuando quieras |
| 📷 | **Captura de pantalla** | Guarda el fotograma actual como PNG (`Alt+S`), recortado al área del reproductor |
| ⌨️ | **Atajos de teclado** | `Alt+S` captura · `Alt+H` mostrar/ocultar comentarios · `Alt+B` diálogo de guardar |

Todo se activa desde el panel 🎬 en la parte inferior derecha de las páginas de YouTube.
**Arrastra el encabezado del panel para colocarlo donde quieras** (la posición se guarda, doble clic para restablecer).
Fíjalo **debajo del reproductor** en los ajustes y seguirá los cambios de tamaño.
**Haz clic en un marcador de color** de la barra de progreso para ir al inicio de ese segmento.

🌍 Interfaz disponible en **한국어 · English · 日本語 · Español · Português** — se detecta desde tu navegador y puedes cambiarla en el popup de la extensión.

## 📦 Instalación

### A. Extensión del navegador (recomendado)

1. Clona este repo o descarga + descomprime `tubepilot-1.8.0.zip` desde la [última release](https://github.com/sapgun/tubepilot/releases)
2. Ve a `chrome://extensions` → activa el **modo de desarrollador** (arriba a la derecha)
3. Haz clic en **Cargar descomprimida** → selecciona la carpeta `extension/`
4. Abre youtube.com → listo cuando aparezca el panel 🎬 abajo a la derecha

> El icono de TubePilot en la barra controla la activación general y el idioma. Los ajustes detallados están en el panel 🎬 de las páginas de YouTube.

### B. Userscript (alternativa)

Los usuarios de Tampermonkey / Violentmonkey pueden usar `tubepilot.user.js` directamente.
Abre el archivo en tu navegador tras instalar un gestor de userscripts y confirma la instalación.
(`@updateURL` busca nuevas versiones automáticamente)

## 🚀 Uso

- **Salto de anuncios**: déjalo activado. Los anuncios se saltan solos.
- **Segmentos de patrocinador**: revisa los marcadores de colores en la barra de progreso; desactiva las categorías que no quieras en el panel.
- **Zoom**: botones ＋/－ del panel; arrastra el video para moverlo con zoom superior al 100%.
- **Guardar para más tarde**: botón **Guardar** del panel → añade etiquetas y notas. Los `#hashtags` de la descripción se añaden con un clic.
- **Biblioteca**: botón **Lista** del panel → filtra por etiquetas o escribe en el buscador.

## 🔒 Privacidad

- La configuración y la biblioteca se guardan **solo en el almacenamiento local de tu navegador**. No se envían a ningún servidor.
- Al buscar segmentos de patrocinador, el ID del video se envía a la API pública de SponsorBlock (`sponsor.ajay.app`). No se transmite ningún otro dato personal.

## ❓ FAQ

**¿Puedo usarlo con uBlock Origin?**
Sí. TubePilot salta a nivel de reproductor en lugar de bloquear red, así que no hay conflicto.

**No aparecen los marcadores de segmentos.**
Los datos de SponsorBlock los aporta la comunidad, así que algunos videos no tienen información de segmentos.

**¿Funciona en Safari / Firefox?**
Sí, con la versión userscript (`tubepilot.user.js`).

**¿Y si una actualización de YouTube lo rompe?**
Los cambios en el DOM de YouTube pueden romper funciones. Por favor [abre un issue](https://github.com/sapgun/tubepilot/issues).

## 🗺 Hoja de ruta

- [ ] Publicación en Chrome Web Store
- [ ] Atajos de teclado
- [ ] Notas con marca de tiempo al guardar

## 🤝 Contribuir

Reportes de errores y sugerencias en [issues](https://github.com/sapgun/tubepilot/issues); código vía PR.
Antes de un PR, ejecuta `cd extension/test && npm install && npm test`.

## 📄 Licencia

MIT — ver [LICENSE](LICENSE).
