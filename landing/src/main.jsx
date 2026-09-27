import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, MotionConfig, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  ArrowRight,
  Play,
  Pause,
  FastForward,
  Camera,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Minus,
  RotateCcw,
  Maximize,
  Volume2,
  ShieldCheck,
  Github,
  Download,
  Menu,
  X,
  MousePointer2,
  Search,
  SlidersHorizontal,
  Grip,
  Copy,
  Coffee,
  Globe2,
  ScanLine,
  LockKeyhole,
  Mail,
  Layers,
  ExternalLink,
} from "lucide-react";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans-kr";
import Ambient from "./Ambient";
import "./style.css";
import { t, languages, getLocale, setLocale } from "./translations";

const REPO = "https://github.com/sapgun/tubepilot";
const RELEASES = `${REPO}/releases/latest`;
const ETH = "0xe8F1B706223652E672ffF62cE1FEf9c7C98eFc68";
const SOL = "BzsE914REG8op1uonEv7rz2NxiS9k3Jcrivz84NdNd5H";
const imageURL = "/assets/mountain.jpg";
const localeForLink = () => getLocale();

function SelectionRail({ id }) {
  const reduce = useReducedMotion();
  return (
    <motion.i
      className="selection-rail"
      layoutId={reduce ? undefined : id}
      transition={{ type: "spring", stiffness: 430, damping: 36 }}
      aria-hidden="true"
    />
  );
}

function FeatureCard({ className, children }) {
  const reduce = useReducedMotion();
  function illuminate(event) {
    if (reduce || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--spot-x",
      `${event.clientX - box.left}px`,
    );
    event.currentTarget.style.setProperty(
      "--spot-y",
      `${event.clientY - box.top}px`,
    );
  }
  return (
    <article className={className} onPointerMove={illuminate}>
      {children}
    </article>
  );
}

function LanguageSelect({ locale, onChange }) {
  return (
    <label className="language-select">
      <Globe2 size={15} />
      <span className="sr-only">{t("언어 선택")}</span>
      <select
        aria-label={t("페이지 언어")}
        value={locale}
        onChange={(e) => onChange(e.target.value)}
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.name}
          </option>
        ))}
      </select>
      <ChevronDown size={11} />
    </label>
  );
}

function Logo({ small = false }) {
  return (
    <span className={`logo ${small ? "small" : ""}`}>
      <img src="/favicon.svg" alt="" width="32" height="32" />
      <span>
        TubePilot<span className="logo-dot">.</span>
      </span>
    </span>
  );
}
function ButtonLink({
  children,
  href = "#install",
  secondary = false,
  className = "",
  ...props
}) {
  return (
    <a
      className={`button ${secondary ? "secondary" : "primary"} ${className}`}
      href={href}
      {...props}
    >
      {children}
    </a>
  );
}
function Eyebrow({ children, light = false }) {
  return (
    <p className={`eyebrow ${light ? "light" : ""}`}>
      <span />
      {children}
    </p>
  );
}
function CopyButton({ value, label = t("주소 복사") }) {
  const [state, setState] = useState("idle");
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    clearTimeout(timer.current);
    let deadline;
    try {
      await Promise.race([
        navigator.clipboard.writeText(value),
        new Promise((_, reject) => {
          deadline = setTimeout(
            () => reject(new Error("Clipboard unavailable")),
            1800,
          );
        }),
      ]);
      setState("copied");
    } catch {
      setState("error");
    } finally {
      clearTimeout(deadline);
    }
    timer.current = setTimeout(() => setState("idle"), 3500);
  }
  return (
    <div className="copy-wrap">
      <button
        className="icon-button copy-button"
        onClick={copy}
        aria-label={label}
      >
        {state === "copied" ? <Check size={16} /> : <Copy size={16} />}
      </button>
      <span className="copy-status" role="status">
        {state === "copied"
          ? t("복사했어요")
          : state === "error"
            ? t("주소를 선택해 직접 복사해 주세요.")
            : ""}
      </span>
    </div>
  );
}

const getModes = () => [
  {
    id: "skip",
    icon: FastForward,
    title: t("방해 없이"),
    name: t("스마트 스킵"),
    body: t(
      "스폰서·인트로 구간은 건너뛰고, 보고 싶은 내용으로 바로. 색으로 구분된 마커를 눌러 이동할 수도 있어요.",
    ),
  },
  {
    id: "zoom",
    icon: Maximize,
    title: t("더 가까이"),
    name: t("줌 & 패닝"),
    body: t(
      "최대 400% 확대하고, 드래그로 자세히 살펴보세요. 작은 글씨도, 놓쳤던 디테일도 선명하게.",
    ),
  },
  {
    id: "capture",
    icon: Camera,
    title: t("순간을 남기고"),
    name: t("클린 캡처"),
    body: t(
      "컨트롤 UI를 숨기고 영상 영역만 깔끔하게. 파일 저장과 클립보드 복사로 필요한 장면을 간직하세요.",
    ),
  },
  {
    id: "save",
    icon: Bookmark,
    title: t("다시 발견하기"),
    name: t("다시보기 라이브러리"),
    body: t(
      "태그와 메모로 기억하는 나만의 라이브러리. 제목이 생각나지 않아도, 저장했던 이유는 남아 있어요.",
    ),
  },
];

function ProductDemo() {
  const modes = getModes();
  const [mode, setMode] = useState("skip");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(24);
  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState(t("스폰서 구간을 건너뛸 준비가 됐어요"));
  const [flash, setFlash] = useState(false);
  const [captureUrl, setCaptureUrl] = useState(null);
  const [captureHeight, setCaptureHeight] = useState(720);
  const captureDialog = useRef(null);
  const photo = useRef(null),
    drag = useRef(null),
    flashTimer = useRef();
  useEffect(() => {
    if (!captureUrl) return;
    captureDialog.current?.showModal();
    return () => URL.revokeObjectURL(captureUrl);
  }, [captureUrl]);
  useEffect(() => () => clearTimeout(flashTimer.current), []);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () => setProgress((p) => (p >= 99 ? 0 : p + 0.2)),
      150,
    );
    return () => clearInterval(timer);
  }, [playing]);
  function select(id) {
    setMode(id);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPlaying(false);
    setNotice(
      id === "skip"
        ? t("스폰서 구간을 건너뛸 준비가 됐어요")
        : id === "zoom"
          ? t("＋를 누르고 풍경을 드래그해 보세요")
          : id === "capture"
            ? t("캡처 버튼으로 데모 이미지를 저장해 보세요")
            : t("북마크를 눌러 데모 라이브러리에 저장해 보세요"),
    );
  }
  async function capture() {
    try {
      const img = photo.current;
      if (!img?.complete || !img.naturalWidth)
        throw new Error("Image not ready");
      const canvas = document.createElement("canvas");
      const frame = img.parentElement.getBoundingClientRect();
      canvas.width = 1280;
      canvas.height = Math.round((1280 * frame.height) / frame.width);
      setCaptureHeight(canvas.height);
      const ctx = canvas.getContext("2d");
      // Same object-fit: cover geometry as the interactive image.
      const cover = Math.max(
        frame.width / img.naturalWidth,
        frame.height / img.naturalHeight,
      );
      const scale = cover * zoom;
      const sw = frame.width / scale,
        sh = frame.height / scale;
      const sx = (img.naturalWidth - sw) / 2 - pan.x / scale,
        sy = (img.naturalHeight - sh) / 2 - pan.y / scale;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Capture failed");
      setCaptureUrl(URL.createObjectURL(blob));
      setFlash(true);
      flashTimer.current = setTimeout(() => setFlash(false), 350);
      setNotice(t("캡처 미리보기가 준비됐어요"));
    } catch {
      setNotice(t("이미지를 불러온 뒤 다시 캡처해 주세요."));
    }
  }
  function onPointerDown(e) {
    if (zoom <= 1) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!drag.current) return;
    const r = e.currentTarget.getBoundingClientRect(),
      d = drag.current;
    const bx = (r.width * (zoom - 1)) / 2,
      by = (r.height * (zoom - 1)) / 2;
    setPan({
      x: Math.max(-bx, Math.min(bx, d.px + e.clientX - d.x)),
      y: Math.max(-by, Math.min(by, d.py + e.clientY - d.y)),
    });
  }
  function adjustZoom(next) {
    setZoom(next);
    setPan({ x: 0, y: 0 });
    setNotice(
      t(t("데모 배율 {zoom}% · 드래그로 이동할 수 있어요"), {
        zoom: Math.round(next * 100),
      }),
    );
  }
  const current = modes.find((m) => m.id === mode);
  return (
    <section
      className="demo-section container"
      id="experience"
      aria-label={t("TubePilot 기능 체험")}
    >
      <div className="demo-overline">
        <span>
          <i /> {t("INTERACTIVE PREVIEW")}
        </span>
        <span>
          {t("내 방식대로, 직접 조작해 보세요")} <ArrowRight size={14} />
        </span>
      </div>
      <div className="demo-shell">
        <div className="browser-bar">
          <div className="traffic">
            <i />
            <i />
            <i />
          </div>
          <span>
            <LockKeyhole size={11} /> youtube.com/watch
          </span>
          <span className="demo-badge">{t("기능 체험용 데모")}</span>
        </div>
        <div className="demo-layout">
          <div className="demo-video-col">
            <div
              className={`video-scene ${zoom > 1 ? "pannable" : ""} ${flash ? "flash" : ""}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
            >
              <img
                ref={photo}
                className="mountain-photo"
                src={imageURL}
                alt={t(
                  "구름 사이로 드러난 산봉우리. 확대와 캡처를 체험할 수 있는 예시 이미지",
                )}
                style={{
                  transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
                }}
                draggable="false"
                fetchPriority="high"
              />
              <div className="scene-vignette" />
              <div className="scene-top">
                <span className="scene-series">
                  THE OUTSIDE SERIES <span>— 01</span>
                </span>
                <span className="quality">4K</span>
              </div>
              <div className="scene-title">
                <span>LESS NOISE. MORE WORLD.</span>
                <p>
                  A little closer
                  <br />
                  to the extraordinary.
                </p>
              </div>
              <div className="scene-coordinates">
                46°34′38.6″N &nbsp; 8°00′19.7″E
              </div>
              <div className="player-bottom">
                <div className="timeline">
                  <span style={{ width: `${progress}%` }} />
                  <button
                    aria-label={t("스폰서 구간으로 이동")}
                    className="segment sponsor"
                    onClick={() => {
                      setProgress(32);
                      setNotice(t("스폰서 구간 시작으로 이동했어요"));
                    }}
                  />
                  <button
                    aria-label={t("인트로 구간으로 이동")}
                    className="segment intro"
                    onClick={() => {
                      setProgress(8);
                      setNotice(t("인트로 구간 시작으로 이동했어요"));
                    }}
                  />
                  <button
                    aria-label={t("아웃트로 구간으로 이동")}
                    className="segment outro"
                    onClick={() => {
                      setProgress(90);
                      setNotice(t("아웃트로 구간 시작으로 이동했어요"));
                    }}
                  />
                </div>
                <div className="player-controls">
                  <button
                    className="icon-button"
                    aria-label={playing ? t("데모 일시정지") : t("데모 재생")}
                    onClick={() => setPlaying(!playing)}
                  >
                    {playing ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <Volume2 size={15} />
                  <span>
                    {`${Math.floor((progress * 7.54) / 60)}:${String(Math.floor(progress * 7.54) % 60).padStart(2, "0")}`}{" "}
                    <em>/ 12:34</em>
                  </span>
                  <span className="player-right">
                    {t("데모 이미지")} <ScanLine size={15} />
                  </span>
                </div>
              </div>
            </div>
            <div className="cockpit">
              <div className="cockpit-brand">
                <Grip size={14} />
                <Logo small />
              </div>
              <div className="cockpit-tools">
                <button
                  className={mode === "skip" ? "tool active" : "tool"}
                  onClick={() => {
                    setMode("skip");
                    setProgress(46);
                    setNotice(t("스폰서 구간 00:32를 건너뛰었어요"));
                  }}
                  aria-label={t("스폰서 구간 스킵")}
                >
                  <FastForward size={16} />
                  <span>{t("스킵")}</span>
                </button>
                <div className="zoom-controls">
                  <button
                    className="icon-button"
                    aria-label={t("축소")}
                    disabled={zoom <= 1}
                    onClick={() => adjustZoom(Math.max(1, zoom - 0.25))}
                  >
                    <Minus size={14} />
                  </button>
                  <output>{Math.round(zoom * 100)}%</output>
                  <button
                    className="icon-button"
                    aria-label={t("확대")}
                    disabled={zoom >= 4}
                    onClick={() => {
                      setMode("zoom");
                      adjustZoom(Math.min(4, zoom + 0.25));
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button
                  className="tool"
                  onClick={capture}
                  aria-label={t("데모 이미지 캡처")}
                >
                  <Camera size={16} />
                  <span>{t("캡처")}</span>
                </button>
                <button
                  className={`tool ${saved ? "active" : ""}`}
                  aria-label={
                    saved ? t("데모 저장 취소") : t("데모 라이브러리에 저장")
                  }
                  aria-pressed={saved}
                  onClick={() => {
                    setSaved(!saved);
                    setMode("save");
                    setNotice(
                      saved
                        ? t("데모 저장을 취소했어요")
                        : t("#여행 #영감 태그로 데모에 저장했어요"),
                    );
                  }}
                >
                  <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
                  <span>{saved ? t("저장됨") : t("저장")}</span>
                </button>
              </div>
            </div>
          </div>
          <aside className="demo-sidebar">
            <div className="sidebar-head">
              <span>{t("YOUR COCKPIT")}</span>
              <span className="live-dot" />
            </div>
            <h3>
              {t("작은 패널.")}
              <br />
              {t("달라지는 시청.")}
            </h3>
            <p>
              {t("영상은 그대로.")}
              <br />
              {t("컨트롤은 자유롭게.")}
            </p>
            <div className="sidebar-rule" />
            <div className="status-label">
              <ShieldCheck size={15} />
              <span>SponsorBlock</span>
              <span className="on">ON</span>
            </div>
            <div className="segment-legend">
              <span>
                <i className="green" />
                {t("스폰서")}
              </span>
              <span>
                <i className="blue" />
                {t("인트로")}
              </span>
              <span>
                <i className="yellow" />
                {t("아웃트로")}
              </span>
            </div>
            <div className="sidebar-note">
              <span className="note-icon">
                {saved ? <Bookmark size={18} /> : <FastForward size={18} />}
              </span>
              <p role="status">{notice}</p>
            </div>
            <span className="sidebar-foot">
              <LockKeyhole size={12} /> {t("설치 없이 체험 중")}
            </span>
          </aside>
        </div>
      </div>
      <div
        className="demo-tabs"
        role="group"
        aria-label={t("체험할 기능 선택")}
      >
        {modes.map((m, i) => (
          <button
            key={m.id}
            onClick={() => select(m.id)}
            className={mode === m.id ? "selected" : ""}
            aria-pressed={mode === m.id}
          >
            <m.icon size={18} />
            <span>{m.title}</span>
            <small>0{i + 1}</small>
            {mode === m.id && <SelectionRail id="demo-selection" />}
          </button>
        ))}
      </div>
      <div className="demo-description">
        <strong>{current.name}</strong>
        <p>{current.body}</p>
      </div>
      <p className="demo-disclaimer">
        {t(
          "이 미리보기는 기능을 설명하는 인터랙티브 데모이며, 실제 YouTube 화면이나 확장 프로그램 UI와 다릅니다.",
        )}
      </p>
      <dialog
        className="capture-dialog"
        ref={captureDialog}
        onClose={() => setCaptureUrl(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        aria-labelledby="capture-title"
      >
        <div className="capture-dialog-head">
          <div>
            <span className="eyebrow light">1280 × {captureHeight} · PNG</span>
            <h2 id="capture-title">{t("캡처 미리보기")}</h2>
          </div>
          <button
            className="icon-button"
            onClick={() => captureDialog.current.close()}
            aria-label={t("닫기")}
          >
            <X size={20} />
          </button>
        </div>
        {captureUrl && (
          <img src={captureUrl} alt={t("컨트롤 없이 캡처한 데모 이미지")} />
        )}
        <div className="capture-dialog-footer">
          <p>{t("지금 보이는 영역만, UI 없이 담았어요.")}</p>
          <a
            className="button primary"
            href={captureUrl ?? undefined}
            download="tubepilot-demo-capture.png"
          >
            <Download size={16} />
            {t("PNG 다운로드")}
          </a>
        </div>
      </dialog>
    </section>
  );
}

function Features() {
  const [filter, setFilter] = useState(t("전체"));
  const cards = [
    {
      tag: t("여행"),
      title: t("다음 여행에서 만나고 싶은 풍경"),
      note: t("능선이 보이는 이 장면, 꼭 다시 보기"),
      time: "04:32",
      className: "travel",
    },
    {
      tag: t("영감"),
      title: t("시선을 바꾸면 보이는 것들"),
      note: t("작업하기 전에 꺼내 볼 무드"),
      time: "02:18",
      className: "inspiration",
    },
  ];
  return (
    <section className="features light-section" id="features">
      <div className="container">
        <div className="section-heading reveal">
          <div>
            <Eyebrow>{t("BUILT AROUND YOUR WATCHING")}</Eyebrow>
            <h2>
              {t("좋아하는 영상에만,")}
              <br />
              <span>{t("온전히 집중하세요.")}</span>
            </h2>
          </div>
          <p>
            {t("시청의 흐름을 끊는 번거로움은 덜어내고,")}
            <br />
            {t("다시 꺼내 보고 싶은 순간은 남겨두세요.")}
          </p>
        </div>
        <div className="feature-grid">
          <FeatureCard className="feature-card skip-card reveal">
            <div className="feature-copy">
              <span className="feature-icon">
                <FastForward size={22} />
              </span>
              <span className="feature-number">01 / WATCH</span>
              <h3>
                {t("기다림은 짧게.")}
                <br />
                {t("몰입은 길게.")}
              </h3>
              <p>
                {t("광고 자동 스킵과 SponsorBlock으로")}
                <br />
                {t("보고 싶은 내용에 더 빠르게 도착하세요.")}
              </p>
            </div>
            <div className="skip-visual" aria-hidden="true">
              <div className="skip-line">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="skip-notification">
                <span>
                  <FastForward size={18} />
                </span>
                <div>
                  <strong>{t("본론으로 바로 가기")}</strong>
                  <small>{t("스폰서 구간을 건너뛰었어요")}</small>
                </div>
                <Check size={16} />
              </div>
              <div className="time-labels">
                <span>02:14</span>
                <span className="skip-jump">
                  {t("+32초")} <ArrowRight size={14} />
                </span>
                <span>02:46</span>
              </div>
            </div>
            <span className="card-footnote">
              {t("커뮤니티가 등록한 구간이 있는 영상에서 작동합니다.")}
            </span>
          </FeatureCard>
          <FeatureCard className="feature-card library-card reveal">
            <div className="feature-copy">
              <span className="feature-icon">
                <Bookmark size={22} />
              </span>
              <span className="feature-number">02 / REMEMBER</span>
              <h3>
                {t("제목은 잊어도,")}
                <br />
                {t("이유는 기억하니까.")}
              </h3>
              <p>
                {t("태그·메모·구간 북마크로 정리하는 다시보기.")}
                <br />
                {t("저장한 영상을 열면 기억을 깨우는 리콜 배너까지.")}
              </p>
            </div>
            <div className="library-preview">
              <div className="library-preview-head">
                <span>
                  <Layers size={15} /> {t("나의 라이브러리")}
                </span>
                <span className="example-label">{t("예시")}</span>
              </div>
              <div
                className="library-filters"
                role="group"
                aria-label={t("예시 라이브러리 태그 필터")}
              >
                {[t("전체"), t("여행"), t("영감")].map((tag) => (
                  <button
                    key={tag}
                    aria-pressed={filter === tag}
                    className={filter === tag ? "active" : ""}
                    onClick={() => setFilter(tag)}
                  >
                    {tag === t("전체") ? t("전체") : `# ${tag}`}
                  </button>
                ))}
              </div>
              <div className="library-items">
                {cards
                  .filter((c) => filter === t("전체") || c.tag === filter)
                  .map((c) => (
                    <div className="library-item" key={c.tag}>
                      <div className={`library-thumb ${c.className}`}>
                        <img src={imageURL} alt="" loading="lazy" />
                        <span>{c.time}</span>
                      </div>
                      <div>
                        <strong>{c.title}</strong>
                        <p>{c.note}</p>
                        <span className="tag"># {c.tag}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </FeatureCard>
          <FeatureCard className="feature-card capture-card reveal">
            <div className="feature-copy">
              <span className="feature-icon">
                <Camera size={22} />
              </span>
              <span className="feature-number">03 / CAPTURE</span>
              <h3>
                {t("좋은 장면은,")}
                <br />
                {t("깨끗하게 남겨요.")}
              </h3>
              <p>
                {t("영상 영역만 캡처해 파일로 저장하거나 복사하세요.")}
                <br />
                {t("스크린샷·저장 단축키도 원하는 조합으로.")}
              </p>
            </div>
            <div className="capture-visual" aria-hidden="true">
              <div className="photo-print">
                <img src={imageURL} alt="" loading="lazy" />
                <div>
                  <span>A MOMENT WORTH KEEPING</span>
                  <span>001</span>
                </div>
              </div>
              <div className="keycaps">
                <kbd>Alt</kbd>
                <span>+</span>
                <kbd>S</kbd>
              </div>
            </div>
          </FeatureCard>
          <FeatureCard className="feature-card zoom-card reveal">
            <div className="feature-copy">
              <span className="feature-icon">
                <Maximize size={22} />
              </span>
              <span className="feature-number">04 / EXPLORE</span>
              <h3>
                {t("놓치기 아까운")}
                <br />
                {t("작은 디테일까지.")}
              </h3>
              <p>
                {t("최대 400% 확대와 드래그 패닝.")}
                <br />
                {t("패널도 원하는 위치로 옮기거나 아래에 도킹하세요.")}
              </p>
            </div>
            <div className="zoom-visual" aria-hidden="true">
              <span className="zoom-tick t1" />
              <span className="zoom-tick t2" />
              <span className="zoom-tick t3" />
              <span className="zoom-tick t4" />
              <strong>
                400<span>%</span>
              </strong>
              <span className="zoom-caption">A CLOSER LOOK.</span>
              <div className="zoom-slider">
                <Minus size={16} />
                <span>
                  <i />
                </span>
                <Plus size={16} />
              </div>
            </div>
          </FeatureCard>
        </div>
        <div className="extras reveal">
          <span>
            <SlidersHorizontal size={17} /> {t("패널 위치·투명도 조절")}
          </span>
          <span>
            <ScanLine size={17} /> {t("댓글 숨기기")}
          </span>
          <span>
            <Download size={17} /> {t("JSON 백업·복원")}
          </span>
          <span>
            <Globe2 size={17} /> {t("확장 UI 5개 언어")}
          </span>
        </div>
      </div>
    </section>
  );
}

function Installation() {
  const [browser, setBrowser] = useState("Chrome");
  const address =
    browser === "Edge" ? "edge://extensions" : "chrome://extensions";
  return (
    <section className="install-section container" id="install">
      <div className="install-intro reveal">
        <Eyebrow light>{t("READY WHEN YOU ARE")}</Eyebrow>
        <h2>
          {t("다음 영상부터,")}
          <br />
          <span>{t("조금 더 나답게.")}</span>
        </h2>
        <p>
          {t("계정도, 구독도 필요 없어요.")}
          <br />
          {t("브라우저에 TubePilot을 더하기만 하세요.")}
        </p>
        <ButtonLink href={RELEASES} target="_blank" rel="noreferrer">
          <Download size={17} /> {t("최신 버전 다운로드")}{" "}
          <ArrowUpRight size={17} />
        </ButtonLink>
        <small className="install-note">
          {t("무료 · v1.9.2 · GitHub 릴리즈에서 수동 설치")}
        </small>
        <a
          className="text-link"
          href={`${REPO}#b-userscript-alternative`}
          target="_blank"
          rel="noreferrer"
        >
          {t("유저스크립트 설치 방법")} <ArrowUpRight size={14} />
        </a>
      </div>
      <div className="install-guide reveal">
        <div
          className="browser-tabs"
          role="group"
          aria-label={t("설치할 브라우저")}
        >
          {["Chrome", "Edge", "Brave"].map((b) => (
            <button
              key={b}
              aria-pressed={browser === b}
              className={browser === b ? "selected" : ""}
              onClick={() => setBrowser(b)}
            >
              {b === "Chrome" ? (
                <Globe2 size={16} />
              ) : b === "Edge" ? (
                <span className="browser-letter">e</span>
              ) : (
                <ShieldCheck size={16} />
              )}{" "}
              {b}
              {browser === b && <SelectionRail id="browser-selection" />}
            </button>
          ))}
        </div>
        <ol className="steps">
          <li>
            <span className="step-number">01</span>
            <div>
              <h3>{t("최신 확장 파일을 내려받으세요.")}</h3>
              <p>
                {t("릴리즈의 extension ZIP 파일을 다운로드하고")}
                <br className="desktop-br" /> {t("압축을 풀어주세요.")}
              </p>
              <a href={RELEASES} target="_blank" rel="noreferrer">
                {t("GitHub 릴리즈 열기")} <ArrowUpRight size={14} />
              </a>
            </div>
          </li>
          <li>
            <span className="step-number">02</span>
            <div>
              <h3>{t("개발자 모드를 켜주세요.")}</h3>
              <p>
                {t("아래 주소를 브라우저 주소창에 붙여넣고,")}
                <br className="desktop-br" />{" "}
                {t("확장 관리 화면에서 개발자 모드를 켜주세요.")}
              </p>
              <div className="code-copy">
                <code>{address}</code>
                <CopyButton value={address} label={t("확장 관리 주소 복사")} />
              </div>
            </div>
          </li>
          <li>
            <span className="step-number">03</span>
            <div>
              <h3>{t("불러오면, 준비 끝.")}</h3>
              <p>
                {t("‘압축해제된 확장 프로그램을 로드’를 누르고")}
                <br className="desktop-br" /> <code>extension</code>{" "}
                {t("폴더를 선택한 뒤 YouTube를 새로고침하세요.")}
              </p>
            </div>
          </li>
        </ol>
        <div className="guide-foot">
          <span className="live-dot" />{" "}
          {t("웹 스토어 등록 전까지 GitHub에서 설치할 수 있어요.")}
        </div>
      </div>
    </section>
  );
}

const getFaqs = () => [
  [
    t("정말 무료인가요?"),
    <>
      {t(
        "네. TubePilot은 MIT 라이선스로 공개된 무료 오픈소스 프로젝트입니다. 계정 생성이나 유료 구독 없이 사용할 수 있어요.",
      )}{" "}
      <a href={REPO} target="_blank" rel="noreferrer">
        {t("GitHub에서 소스 보기")} <ArrowUpRight size={13} />
      </a>
    </>,
  ],
  [
    t("어떤 브라우저에서 사용할 수 있나요?"),
    t(
      "확장 프로그램은 PC의 Chrome, Edge, Brave 등 Chromium 기반 브라우저용입니다. Firefox와 Safari 사용자는 저장소의 Tampermonkey·Violentmonkey 유저스크립트 안내를 확인해 주세요. 버전과 브라우저에 따라 지원 기능은 다를 수 있어요.",
    ),
  ],
  [
    t("모든 광고와 스폰서 구간을 건너뛰나요?"),
    t(
      "TubePilot은 플레이어에서 광고를 감지해 스킵을 시도합니다. 모든 광고의 제거를 보장하지 않으며 YouTube 변경에 따라 동작이 달라질 수 있어요. SponsorBlock 구간은 커뮤니티가 등록한 데이터가 있는 영상에서만 표시됩니다.",
    ),
  ],
  [
    t("시청 기록이나 개인정보를 수집하나요?"),
    <>
      {t(
        "설정과 다시보기 라이브러리는 브라우저의 로컬 저장소에 보관됩니다. 스폰서 구간을 조회할 때는 영상 ID가 SponsorBlock API로 전송됩니다.",
      )}{" "}
      <a href={`/privacy.html?lang=${localeForLink()}`}>
        {t("개인정보처리방침 확인")} <ArrowUpRight size={13} />
      </a>
    </>,
  ],
  [
    t("업데이트와 데이터 백업은 어떻게 하나요?"),
    t(
      "새 릴리즈의 ZIP 파일을 내려받아 확장 파일을 교체하고, 브라우저 확장 관리 화면에서 새로고침하세요. 작업 전에 TubePilot의 백업 기능으로 설정과 라이브러리를 JSON 파일로 내보내는 것을 권장합니다.",
    ),
  ],
  [
    t("문제가 생겼거나 제안하고 싶은 기능이 있어요."),
    <>
      {t("브라우저 종류, TubePilot 버전, 문제가 발생한 상황을")}{" "}
      <a href={`${REPO}/issues`} target="_blank" rel="noreferrer">
        GitHub Issues
      </a>
      {t("에 남겨주세요. 기능 제안과 코드 기여도 환영합니다.")}
    </>,
  ],
];

function App({ locale, onLocaleChange }) {
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("revealed");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.08 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <>
      <a className="skip-link" href="#main">
        {t("본문으로 바로 가기")}
      </a>
      <header className="site-header">
        <div className="container nav-inner">
          <a
            href="#"
            className="brand-link"
            aria-label={t("TubePilot 처음으로")}
          >
            <Logo />
          </a>
          <nav
            aria-label={t("주 메뉴")}
            className={menu ? "nav-links open" : "nav-links"}
            id="main-nav"
          >
            <a href="#features" onClick={() => setMenu(false)}>
              {t("기능")}
            </a>
            <a href="#experience" onClick={() => setMenu(false)}>
              {t("직접 체험하기")}
            </a>
            <a href="#install" onClick={() => setMenu(false)}>
              {t("설치 가이드")}
            </a>
            <a href="#faq" onClick={() => setMenu(false)}>
              FAQ
            </a>
          </nav>
          <div className="nav-actions">
            <LanguageSelect locale={locale} onChange={onLocaleChange} />
            <a
              className="github-link"
              href={REPO}
              target="_blank"
              rel="noreferrer"
              aria-label={t("GitHub 저장소")}
            >
              <Github size={19} />
            </a>
            <a className="nav-cta" href="#install">
              {t("무료로 시작하기")} <ArrowUpRight size={15} />
            </a>
            <button
              className="menu-button icon-button"
              aria-label={menu ? t("메뉴 닫기") : t("메뉴 열기")}
              aria-controls="main-nav"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <div className="hero-area">
          <Ambient />
          <section className="hero container">
            <a
              className="release-pill"
              href={`${REPO}/releases/tag/v1.9.2`}
              target="_blank"
              rel="noreferrer"
            >
              <span>NEW</span> {t("v1.9.2 · 더 깨끗해진 캡처")}{" "}
              <ChevronRight size={14} />
            </a>
            <h1>
              {t("시청의 주도권을,")}
              <br />
              <span>{t("당신에게.")}</span>
              <svg
                className="hero-spark"
                width="39"
                height="39"
                viewBox="0 0 40 40"
                aria-hidden="true"
              >
                <path
                  d="M20 0V40M0 20H40M6 6L34 34M34 6L6 34"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </h1>
            <p className="hero-description">
              {t("덜 방해받고, 더 몰입하세요.")}
              <br />
              {t(
                "스킵부터 확대, 캡처, 다시보기까지. PC YouTube를 내 방식대로.",
              )}
            </p>
            <div className="hero-actions">
              <ButtonLink>
                <Download size={18} /> {t("무료로 시작하기")}{" "}
                <ArrowUpRight size={18} />
              </ButtonLink>
              <ButtonLink secondary href="#experience">
                <Play size={16} /> {t("먼저 체험하기")}
              </ButtonLink>
            </div>
            <div className="hero-proof">
              <span>
                <Check size={13} /> {t("무료 오픈소스")}
              </span>
              <i />
              <span>Chrome · Edge · Brave</span>
              <i />
              <span>{t("계정 없이 시작")}</span>
            </div>
            <div className="hero-side-note left">
              YOUR VIDEO.
              <br />
              YOUR RULES.
            </div>
            <div className="hero-side-note right">
              MADE FOR
              <br />
              DESKTOP YOUTUBE <span>↙</span>
            </div>
          </section>
          <ProductDemo />
        </div>
        <div className="promise-strip container">
          <span>
            {t("작은 확장 하나로,")}
            <br />
            <strong>{t("훨씬 더 나은 YouTube.")}</strong>
          </span>
          <div>
            <FastForward size={23} />
            <span>{t("스마트하게 스킵")}</span>
          </div>
          <div>
            <Maximize size={23} />
            <span>{t("디테일까지 확대")}</span>
          </div>
          <div>
            <Camera size={23} />
            <span>{t("깔끔하게 캡처")}</span>
          </div>
          <div>
            <Bookmark size={23} />
            <span>{t("태그로 다시보기")}</span>
          </div>
        </div>
        <Features />
        <section className="privacy-section light-section">
          <div className="container privacy-inner reveal">
            <div className="privacy-art" aria-hidden="true">
              <div className="orbit o1" />
              <div className="orbit o2" />
              <div className="orbit o3" />
              <div className="shield">
                <ShieldCheck size={43} strokeWidth={1.3} />
              </div>
              <span className="orbit-label">
                <LockKeyhole size={12} /> LOCAL FIRST
              </span>
            </div>
            <div>
              <Eyebrow>{t("YOUR DATA STAYS YOURS")}</Eyebrow>
              <h2>
                {t("취향은 당신의 것.")}
                <br />
                {t("데이터도 마찬가지.")}
              </h2>
              <p>
                {t("설정과 라이브러리는 내 브라우저에만 저장됩니다.")}
                <br />
                {t("계정 없이 사용하고, JSON 파일로 직접 백업하세요.")}
              </p>
              <small>
                {t(
                  "SponsorBlock 구간 조회 시에는 영상 ID가 해당 API로 전송됩니다.",
                )}
              </small>
              <a
                className="text-link"
                href={`/privacy.html?lang=${localeForLink()}`}
              >
                {t("개인정보처리방침 읽기")} <ArrowUpRight size={15} />
              </a>
            </div>
            <div className="privacy-meta">
              <span>OPEN SOURCE</span>
              <strong>100%</strong>
              <span>MIT LICENSE</span>
              <a href={REPO} target="_blank" rel="noreferrer">
                {t("직접 확인할 수 있는 코드")} <ArrowUpRight size={13} />
              </a>
            </div>
          </div>
        </section>
        <Installation />
        <section className="faq-section container" id="faq">
          <div className="faq-intro reveal">
            <Eyebrow light>{t("A FEW THINGS TO KNOW")}</Eyebrow>
            <h2>
              {t("궁금한 점이")}
              <br />
              {t("있으신가요?")}
            </h2>
            <p>{t("시작하기 전에 알아두면 좋은 것들.")}</p>
            <a
              className="text-link"
              href={`${REPO}/issues`}
              target="_blank"
              rel="noreferrer"
            >
              {t("다른 질문이 있어요")} <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="faq-list reveal">
            {getFaqs().map(([q, a], i) => (
              <details key={q}>
                <summary>
                  <span className="faq-number">0{i + 1}</span>
                  {q}
                  <Plus size={18} />
                </summary>
                <div className="faq-answer">{a}</div>
              </details>
            ))}
          </div>
        </section>
        <section className="closing container">
          <div className="closing-inner reveal">
            <div className="closing-grid" aria-hidden="true" />
            <span className="closing-label">{t("TAKE THE CONTROLS.")}</span>
            <h2>
              {t("좋은 영상은 많으니까.")}
              <br />
              {t("보는 경험도 좋아야죠.")}
            </h2>
            <ButtonLink href="#install">
              {t("나만의 YouTube 시작하기")} <ArrowUpRight size={18} />
            </ButtonLink>
            <span className="closing-foot">{t("FREE. OPEN. YOURS.")}</span>
          </div>
        </section>
      </main>
      <footer className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo />
            <p>
              {t("A better way to watch.")}
              <br />
              {t("Built by sapgun, for your everyday YouTube.")}
            </p>
          </div>
          <div className="footer-links">
            <div>
              <span>{t("PRODUCT")}</span>
              <a href="#features">{t("기능 소개")}</a>
              <a href={RELEASES} target="_blank" rel="noreferrer">
                {t("릴리즈 노트")} <ArrowUpRight size={12} />
              </a>
              <a href={`/privacy.html?lang=${localeForLink()}`}>
                {t("개인정보처리방침")}
              </a>
            </div>
            <div>
              <span>{t("CONNECT")}</span>
              <a href={REPO} target="_blank" rel="noreferrer">
                GitHub <ArrowUpRight size={12} />
              </a>
              <a href="https://x.com/0xSAPGUN" target="_blank" rel="noreferrer">
                X / Twitter <ArrowUpRight size={12} />
              </a>
              <a href="mailto:sapgun@trenchclub.dev">
                {t("비즈니스 문의")} <ArrowUpRight size={12} />
              </a>
            </div>
            <div>
              <span>{t("KEEP IT GOING")}</span>
              <a
                className="coffee-link"
                href="https://ko-fi.com/sapgun"
                target="_blank"
                rel="noreferrer"
              >
                <Coffee size={16} /> {t("커피 한 잔 후원하기")}{" "}
                <ArrowUpRight size={12} />
              </a>
              <details className="crypto">
                <summary>
                  {t("암호화폐로 후원")} <ChevronDown size={13} />
                </summary>
                <div className="wallet">
                  <strong>Ethereum</strong>
                  <div>
                    <code>{ETH}</code>
                    <CopyButton
                      value={ETH}
                      label={t("Ethereum 후원 주소 복사")}
                    />
                  </div>
                  <a
                    href={`https://metamask.app.link/send/${ETH}@1`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("MetaMask에서 열기")} <ArrowUpRight size={12} />
                  </a>
                </div>
                <div className="wallet">
                  <strong>Solana</strong>
                  <div>
                    <code>{SOL}</code>
                    <CopyButton
                      value={SOL}
                      label={t("Solana 후원 주소 복사")}
                    />
                  </div>
                  <a
                    href={`https://phantom.app/ul/v1/send?recipient=${SOL}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("Phantom에서 열기")} <ArrowUpRight size={12} />
                  </a>
                </div>
                <small>
                  {t(
                    "지갑 링크는 앱·기기에 따라 다르게 작동할 수 있습니다. 열리지 않으면 주소를 복사해 주세요.",
                  )}
                </small>
              </details>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 TubePilot. MIT License.</span>
          <span>
            {t(
              "YouTube는 Google LLC의 상표이며, TubePilot은 독립 프로젝트입니다.",
            )}
          </span>
          <a href="#">{t("맨 위로 ↑")}</a>
        </div>
      </footer>
    </>
  );
}

function PrivacyPage({ locale, onLocaleChange }) {
  const sections = [
    [
      "1. 외부로 전송되는 정보",
      "스폰서 구간을 조회할 때 시청 중인 YouTube 영상의 ID를 SponsorBlock API(sponsor.ajay.app)로 전송합니다. 구간 정보를 받기 위한 용도로 사용합니다.",
    ],
    [
      "2. 브라우저에 저장되는 정보",
      "확장 설정, 다시보기 라이브러리, 태그, 메모, 구간 북마크는 브라우저의 로컬 저장소에 보관됩니다. TubePilot 개발자의 서버로 전송하지 않습니다.",
    ],
    [
      "3. 이 웹사이트의 데이터",
      "랜딩페이지는 언어 선택을 브라우저에 저장합니다. 데모 상태는 페이지를 새로고침하면 초기화됩니다. 분석·광고 추적 스크립트는 포함하지 않습니다. 외부 링크를 열면 해당 서비스의 정책이 적용됩니다.",
    ],
    [
      "4. 백업과 삭제",
      "확장을 삭제하면 해당 확장의 로컬 데이터도 삭제됩니다. 필요한 데이터는 삭제 전에 JSON으로 백업하세요. 내려받은 백업 파일은 사용자가 직접 관리합니다. 사이트의 언어 설정은 브라우저 사이트 데이터에서 삭제할 수 있습니다.",
    ],
    [
      "5. 문의",
      "개인정보 관련 문의는 GitHub Issues 또는 비즈니스 이메일로 연락해 주세요.",
    ],
  ];
  return (
    <>
      <header className="site-header">
        <div className="container nav-inner">
          <a href={`/?lang=${locale}`} aria-label={t("홈으로 돌아가기")}>
            <Logo />
          </a>
          <LanguageSelect locale={locale} onChange={onLocaleChange} />
        </div>
      </header>
      <main className="privacy-document container">
        <a className="text-link" href={`/?lang=${locale}`}>
          ← {t("홈으로 돌아가기")}
        </a>
        <h1>{t("개인정보처리방침")}</h1>
        <p className="policy-date">{t("시행일: 2026년 9월 27일")}</p>
        {sections.map(([title, body]) => (
          <section key={title}>
            <h2>{t(title)}</h2>
            <p>{t(body)}</p>
          </section>
        ))}
        <div className="policy-contact">
          <a href={`${REPO}/issues`}>
            GitHub Issues <ArrowUpRight size={14} />
          </a>
          <a href="mailto:sapgun@trenchclub.dev">
            sapgun@trenchclub.dev <Mail size={14} />
          </a>
        </div>
      </main>
    </>
  );
}

function Root() {
  const [locale, updateLocale] = useState(getLocale());
  const isPrivacy = location.pathname.endsWith("/privacy.html");
  function changeLocale(next) {
    setLocale(next);
    updateLocale(next);
  }
  useEffect(() => {
    document.documentElement.lang = locale;
    const title = isPrivacy
      ? `TubePilot — ${t("개인정보처리방침")}`
      : `TubePilot — ${t("시청의 주도권을,")} ${t("당신에게.")}`;
    document.title = title;
    const description = t(
      "스킵부터 확대, 캡처, 다시보기까지. PC YouTube를 내 방식대로.",
    );
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", description);
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", title);
    document
      .querySelector('meta[property="og:description"]')
      ?.setAttribute("content", description);
    document
      .querySelector('meta[property="og:locale"]')
      ?.setAttribute(
        "content",
        { ko: "ko_KR", en: "en_US", ja: "ja_JP", pt: "pt_BR", es: "es_ES" }[
          locale
        ],
      );
  }, [locale, isPrivacy]);
  return isPrivacy ? (
    <PrivacyPage key={locale} locale={locale} onLocaleChange={changeLocale} />
  ) : (
    <App key={locale} locale={locale} onLocaleChange={changeLocale} />
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <Root />
    </MotionConfig>
  </React.StrictMode>,
);
