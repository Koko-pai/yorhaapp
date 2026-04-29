// ═══════════════════════════════════════════════════════
// SimulationMode.jsx — Протокол Извлечения SIM-7
// Стелс + коррупция. Интегрируется в App.jsx как модалка.
// ═══════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";

const COLS = 11, ROWS = 11;
const LERP_SPEED = 0.18;
const IMG_URL = "https://i.ibb.co/DgMDtFFk/nr-10h-sentinel-savior-Photoroom.png";

// Конфиг сложности по уровню миссии
function getSimConfig(threat, isEvent) {
  const base = {
    "НИЗКАЯ":  { patrolCount: 2, patrolMax: 4, tickMs: 1500, corruptRate: 0.28, fragCount: 3 },
    "СРЕДНЯЯ": { patrolCount: 3, patrolMax: 3, tickMs: 1300, corruptRate: 0.38, fragCount: 3 },
    "ВЫСОКАЯ": { patrolCount: 4, patrolMax: 2, tickMs: 1100, corruptRate: 0.46, fragCount: 4 },
  };
  const cfg = base[threat] || base["СРЕДНЯЯ"];
  if (isEvent) {
    return {
      ...cfg,
      patrolCount: Math.min(cfg.patrolCount + 1, 5),
      tickMs: cfg.tickMs - 150,
      corruptRate: Math.min(cfg.corruptRate + 0.08, 0.6),
      fragCount: cfg.fragCount + 1,
    };
  }
  return cfg;
}

// Стартовые позиции патрулей (разные для разного числа)
const PATROL_DEFS = [
  { r: 2, c: 4, dr: 0, dc: 1 },
  { r: 6, c: 7, dr: 1, dc: 0 },
  { r: 4, c: 2, dr: 0, dc: 1 },
  { r: 8, c: 5, dr: 0, dc: -1 },
  { r: 1, c: 8, dr: 1, dc: 0 },
];

// Позиции фрагментов
const FRAG_POSITIONS = [
  [1, 9], [4, 5], [8, 1], [2, 6], [9, 8],
];

const WALLS = [
  [1,1],[1,2],[2,1],[3,3],[3,4],[4,3],[5,1],[5,2],[5,5],[5,6],
  [6,5],[7,7],[7,8],[8,7],[9,3],[9,4],[8,3],[2,7],[2,8],[3,8],
  [1,5],[1,6],[6,1],[6,2],[4,8],[4,9],[8,9],[8,8],
];

const bootLines = [
  { t: 0,    cls: "",     txt: "> ИНИЦИАЛИЗАЦИЯ ПРОТОКОЛА SIM-7..." },
  { t: 300,  cls: "ok",   txt: "> КАРТА СЕРВЕРА ЗАГРУЖЕНА [11×11]" },
  { t: 600,  cls: "ok",   txt: "> ПАТРУЛЬНЫЕ СИСТЕМЫ АКТИВИРОВАНЫ" },
  { t: 900,  cls: "warn", txt: "> ОБНАРУЖЕНА КОРРУПЦИЯ ДАННЫХ — УРОВЕНЬ КРИТИЧЕСКИЙ" },
  { t: 1200, cls: "ok",   txt: "> ЮНИТ 10H СИНХРОНИЗИРОВАН" },
  { t: 1500, cls: "ok",   txt: "> ФРАГМЕНТЫ ПАМЯТИ ЛОКАЛИЗОВАНЫ" },
  { t: 1800, cls: "err",  txt: "> ПРЕДУПРЕЖДЕНИЕ: КОРРУПЦИЯ РАСПРОСТРАНЯЕТСЯ" },
  { t: 2100, cls: "hi",   txt: "> ПРОТОКОЛ ИЗВЛЕЧЕНИЯ ГОТОВ К ЗАПУСКУ" },
];

export default function SimulationMode({ mission, onComplete, onClose }) {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const rafRef = useRef(null);
  const tickRef = useRef(null);

  const [screen, setScreen] = useState("boot"); // boot | game | result
  const [bootReady, setBootReady] = useState(false);
  const [bootLog, setBootLog] = useState([]);
  const [hud, setHud] = useState({ frags: 0, total: 3, corruption: 0, status: "СТЕЛС", alert: 0 });
  const [popup, setPopup] = useState(null);
  const [result, setResult] = useState(null);
  const popTimerRef = useRef(null);
  const pendingInitRef = useRef(false);

  const cfg = getSimConfig(mission.threat, mission.isEvent);

  // Загрузочный экран
  useEffect(() => {
    if (screen !== "boot") return;
    setBootLog([]);
    setBootReady(false);
    const timers = bootLines.map(({ t, cls, txt }) =>
      setTimeout(() => setBootLog(prev => [...prev, { cls, txt }]), t)
    );
    const readyTimer = setTimeout(() => setBootReady(true), 2400);
    return () => { timers.forEach(clearTimeout); clearTimeout(readyTimer); };
  }, [screen]);

  // Когда screen переключается на game и канвас появился — запускаем игру
  useEffect(() => {
    if (screen !== "game" || !pendingInitRef.current) return;
    pendingInitRef.current = false;

    const cv = canvasRef.current;
    if (!cv) return;
    const W = cv.parentElement?.clientWidth || 340;
    cv.width = W; cv.height = W;
    const cs = W / COLS;

    const grid = [];
    for (let r = 0; r < ROWS; r++) grid.push(new Array(COLS).fill(0));
    WALLS.forEach(([r, c]) => { if (r < ROWS && c < COLS) grid[r][c] = 1; });

    const fragPos = FRAG_POSITIONS.slice(0, cfg.fragCount);
    fragPos.forEach(([r, c]) => { grid[r][c] = 2; });
    grid[9][9] = 3;

    const patrols = PATROL_DEFS.slice(0, cfg.patrolCount).map(d => ({
      r: d.r, c: d.c,
      vr: d.r, vc: d.c,
      dr: d.dr, dc: d.dc,
      steps: 0, max: cfg.patrolMax,
    }));

    const noiseField = Array.from({ length: ROWS * COLS }, () => Math.random());

    gameRef.current = {
      cs, grid,
      frags: 0, total: cfg.fragCount,
      player: { r: 0, c: 0, vr: 0, vc: 0 },
      patrols,
      corrupt: [], corruption: 0, alert: 0,
      over: false, tick: 0,
      particles: [], fragLabels: [],
      noiseField, scanY: 0, glitchF: 0,
      trail: [],
    };

    setHud({ frags: 0, total: cfg.fragCount, corruption: 0, status: "СТЕЛС", alert: 0 });

    if (tickRef.current) clearInterval(tickRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    tickRef.current = setInterval(() => {
      const G = gameRef.current;
      if (!G || G.over) return;
      G.tick++;
      tickMovePatrols(G);
      tickSpreadCorruption(G, cfg);
      tickCheckSight(G);
      if (Math.random() < 0.05)
        G.noiseField = Array.from({ length: ROWS * COLS }, () => Math.random());
      updateHudFromG(G);
    }, cfg.tickMs);

    rafRef.current = requestAnimationFrame(drawLoop);
  }, [screen]);

  function initGame() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    pendingInitRef.current = true;
    setScreen("game");
  }

  function drawLoop(now) {
    rafRef.current = requestAnimationFrame(drawLoop);
    const G = gameRef.current;
    if (!G) return;
    const sp = LERP_SPEED;
    const p = G.player;
    p.vr += (p.r - p.vr) * sp; if (Math.abs(p.vr - p.r) < 0.002) p.vr = p.r;
    p.vc += (p.c - p.vc) * sp; if (Math.abs(p.vc - p.c) < 0.002) p.vc = p.c;
    G.patrols.forEach(pt => {
      pt.vr += (pt.r - pt.vr) * sp; if (Math.abs(pt.vr - pt.r) < 0.002) pt.vr = pt.r;
      pt.vc += (pt.c - pt.vc) * sp; if (Math.abs(pt.vc - pt.c) < 0.002) pt.vc = pt.c;
    });
    G.particles = G.particles.filter(p => { p.life -= 0.035; p.x += p.vx; p.y += p.vy; return p.life > 0; });
    G.fragLabels = G.fragLabels.filter(l => { l.life -= 0.028; l.y -= 0.3; return l.life > 0; });
    if (G.glitchF > 0) G.glitchF--;
    G.scanY = (G.scanY + 0.4) % 100;
    render(now, G);
  }

  function tickMovePatrols(G) {
    G.patrols.forEach(p => {
      p.steps++;
      if (p.steps >= p.max) {
        if (Math.random() < 0.5) p.dr = -p.dr; else p.dc = -p.dc;
        if (p.dr === 0 && p.dc === 0) p.dc = 1;
        p.steps = 0;
      }
      const nr = p.r + p.dr, nc = p.c + p.dc;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && G.grid[nr][nc] !== 1 && G.grid[nr][nc] !== 6) {
        p.r = nr; p.c = nc;
      } else { p.dr = -p.dr; p.dc = -p.dc; p.steps = 0; }
    });
  }

  // Клетки защищённые от коррупции навсегда
  function isProtected(r, c) {
    if (r >= 8 && c >= 8) return true; // зона EXIT (9,9) и ближайшие соседи
    if (r <= 1 && c <= 1) return true; // зона старта игрока
    return false;
  }

  function tickSpreadCorruption(G, cfg) {
    if (G.tick % 3 !== 0) return;
    const toAdd = [];
    if (G.corrupt.length === 0) {
      // Стартуем только из двух дальних от EXIT и старта углов
      const safeCorners = [[0, COLS-1], [ROWS-1, 0]];
      toAdd.push(safeCorners[Math.floor(Math.random() * safeCorners.length)]);
    } else {
      G.corrupt.forEach(([cr, cc]) => {
        [[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr, dc]) => {
          const nr = cr + dr, nc = cc + dc;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS &&
              G.grid[nr][nc] !== 1 && G.grid[nr][nc] !== 6 &&
              !isProtected(nr, nc) &&
              Math.random() < cfg.corruptRate)
            toAdd.push([nr, nc]);
        });
      });
    }
    toAdd.forEach(([r, c]) => {
      if (G.grid[r][c] === 6 || isProtected(r, c)) return;
      G.grid[r][c] = 6;
      G.corrupt.push([r, c]);
      spawnParticles(G, c, r, "corrupt");
      if (r === G.player.r && c === G.player.c) doEndGame(G, false, "corrupt");
    });
    G.corruption = Math.min(100, Math.round(G.corrupt.length / (COLS * ROWS) * 100 * 3));
  }

  function tickCheckSight(G) {
    const { r: pr, c: pc } = G.player;
    G.patrols.forEach(p => {
      if (Math.abs(p.r - pr) + Math.abs(p.c - pc) <= 1) {
        G.alert = Math.min(100, G.alert + 45);
        G.glitchF = 8;
        if (G.alert >= 100) doEndGame(G, false, "caught");
      } else {
        G.alert = Math.max(0, G.alert - 8);
      }
    });
  }

  function updateHudFromG(G) {
    setHud({
      frags: G.frags,
      total: G.total,
      corruption: G.corruption,
      alert: G.alert,
      status: G.alert > 60 ? "ТРЕВОГА !!!" : G.alert > 25 ? "ОПАСНОСТЬ" : "СТЕЛС",
    });
    const cb = document.getElementById("sim-cbar");
    if (cb) {
      cb.style.width = G.corruption + "%";
      cb.style.background = G.corruption > 55 ? "#c44444" : "#6a5030";
    }
  }

  function spawnParticles(G, c, r, type) {
    const cs = G.cs, cx = c * cs + cs / 2, cy = r * cs + cs / 2;
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2, sp = 0.5 + Math.random();
      G.particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, type });
    }
  }

  function showPopupMsg(txt) {
    setPopup(txt);
    if (popTimerRef.current) clearTimeout(popTimerRef.current);
    popTimerRef.current = setTimeout(() => setPopup(null), 2200);
  }

  function movePlayer(dr, dc) {
    const G = gameRef.current;
    if (!G || G.over) return;
    const nr = G.player.r + dr, nc = G.player.c + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
    const cell = G.grid[nr][nc];
    if (cell === 1 || cell === 6) return;

    G.trail.push({ vr: G.player.vr, vc: G.player.vc, life: 1 });
    if (G.trail.length > 4) G.trail.shift();

    G.player.r = nr; G.player.c = nc;

    if (cell === 2) {
      G.grid[nr][nc] = 0; G.frags++;
      spawnParticles(G, nc, nr, "frag");
      G.fragLabels.push({ x: nc * G.cs + G.cs / 2, y: (nr - 0.3) * G.cs, life: 1, txt: "◈ ФРАГМЕНТ #" + G.frags });
      showPopupMsg("◈ ФРАГМЕНТ ПАМЯТИ " + G.frags + "/" + G.total + " ВОССТАНОВЛЕН");
      updateHudFromG(G);
    }
    if (cell === 3) { doEndGame(G, true, null); return; }

    tickMovePatrols(G);
    tickCheckSight(G);
    updateHudFromG(G);
  }

  function doEndGame(G, won, reason) {
    if (G.over) return;
    G.over = true;
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }

    const fragsCollected = G.frags;
    const total = G.total;
    let outcome;
    if (!won) {
      outcome = "fail";
    } else if (fragsCollected === total) {
      outcome = "full";
    } else if (fragsCollected > 0) {
      outcome = "partial";
    } else {
      outcome = "fail";
    }

    setTimeout(() => {
      setResult({ outcome, fragsCollected, total, won, reason });
      setScreen("result");
    }, 400);
  }

  // Клавиатура
  useEffect(() => {
    if (screen !== "game") return;
    const handler = (e) => {
      const m = { ArrowUp: [-1,0], ArrowDown: [1,0], ArrowLeft: [0,-1], ArrowRight: [0,1] };
      if (m[e.key]) { e.preventDefault(); movePlayer(...m[e.key]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  // ── RENDER CANVAS ────────────────────────────────────
  function render(now, G) {
    const cv = canvasRef.current;
    if (!cv || !G) return;
    const ctx = cv.getContext("2d");
    const cs = G.cs, W = cv.width;
    ctx.clearRect(0, 0, W, W);
    ctx.fillStyle = "#0c0b0a"; ctx.fillRect(0, 0, W, W);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * cs, y = r * cs, cell = G.grid[r][c];
        const ni = G.noiseField[r * COLS + c] || 0;
        if (cell === 1) {
          ctx.fillStyle = "#0f0e0d"; ctx.fillRect(x, y, cs, cs);
          ctx.fillStyle = "#141210"; ctx.fillRect(x+1, y+1, cs-2, cs-2);
          ctx.strokeStyle = "#1a1814"; ctx.lineWidth = 0.5; ctx.strokeRect(x+2, y+2, cs-4, cs-4);
        } else if (cell === 6) {
          ctx.fillStyle = "#110808"; ctx.fillRect(x, y, cs, cs);
          const t = now / 1000, a = 0.28 + Math.sin(t * 2 + ni * 6) * 0.1;
          const gd = ctx.createRadialGradient(x+cs/2, y+cs/2, 0, x+cs/2, y+cs/2, cs * 0.8);
          gd.addColorStop(0, `rgba(140,20,20,${a})`); gd.addColorStop(1, "transparent");
          ctx.fillStyle = gd; ctx.fillRect(x, y, cs, cs);
          if (ni < 0.1) { ctx.fillStyle = `rgba(180,40,40,${0.4 + ni * 2})`; ctx.fillRect(x + ni * cs * 0.8, y + ni * cs * 0.6, 1.5, 1.5); }
        } else {
          ctx.fillStyle = "#0e0d0c"; ctx.fillRect(x, y, cs, cs);
          ctx.strokeStyle = "#151412"; ctx.lineWidth = 0.5; ctx.strokeRect(x, y, cs, cs);
        }
        if (cell === 2) {
          const t = now / 1000, pulse = 0.88 + Math.sin(t * 2.5 + c + r) * 0.12;
          const cx2 = x + cs/2, cy2 = y + cs/2;
          const gd = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, cs * 0.5 * pulse);
          gd.addColorStop(0, "rgba(68,170,136,0.28)"); gd.addColorStop(1, "transparent");
          ctx.fillStyle = gd; ctx.fillRect(x, y, cs, cs);
          ctx.fillStyle = "#1e4a38"; ctx.beginPath(); ctx.arc(cx2, cy2, cs * 0.23 * pulse, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = "#44aa88"; ctx.beginPath(); ctx.arc(cx2, cy2, cs * 0.12 * pulse, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = `rgba(68,170,136,${0.4 + Math.sin(t * 3 + c) * 0.15})`; ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.arc(cx2, cy2, cs * 0.31 * pulse, 0, Math.PI*2); ctx.stroke();
        }
        if (cell === 3) {
          const t = now / 1000, p2 = 0.85 + Math.sin(t * 2) * 0.15;
          ctx.fillStyle = "#0e1c14"; ctx.fillRect(x+1, y+1, cs-2, cs-2);
          ctx.strokeStyle = `rgba(74,144,112,${p2})`; ctx.lineWidth = 1.2; ctx.strokeRect(x+3, y+3, cs-6, cs-6);
          ctx.fillStyle = `rgba(74,144,112,${0.65 + Math.sin(t * 2.5) * 0.2})`;
          ctx.font = `${Math.max(7, cs * 0.26)}px 'Courier New'`; ctx.textAlign = "center";
          ctx.fillText("EXIT", x + cs/2, y + cs * 0.62);
        }
      }
    }

    // Scanline
    const slY = (G.scanY / 100) * W;
    const slG = ctx.createLinearGradient(0, slY-6, 0, slY+6);
    slG.addColorStop(0, "transparent"); slG.addColorStop(0.5, "rgba(176,168,152,0.03)"); slG.addColorStop(1, "transparent");
    ctx.fillStyle = slG; ctx.fillRect(0, slY-6, W, 12);

    // Particles
    G.particles.forEach(p => {
      ctx.fillStyle = p.type === "corrupt" ? `rgba(180,40,40,${p.life})` : `rgba(68,170,136,${p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2 * p.life, 0, Math.PI*2); ctx.fill();
    });

    // Frag labels
    G.fragLabels.forEach(l => {
      ctx.fillStyle = `rgba(176,168,152,${l.life * 0.85})`;
      ctx.font = "7px 'Courier New'"; ctx.textAlign = "center";
      ctx.fillText(l.txt, l.x, l.y);
    });

    // Patrols
    G.patrols.forEach((p, i) => {
      const x = p.vc * cs, y = p.vr * cs, cx2 = x + cs/2, cy2 = y + cs/2;
      const t = now / 1000, af = G.alert / 100;
      const vr2 = cs * (1.3 + af * 0.6);
      const gd = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, vr2);
      gd.addColorStop(0, `rgba(180,60,50,${0.1 + af * 0.1})`); gd.addColorStop(1, "transparent");
      ctx.fillStyle = gd; ctx.beginPath(); ctx.arc(cx2, cy2, vr2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#1e0a08";
      ctx.beginPath(); ctx.roundRect(x+2, y+2, cs-4, cs-4, 3); ctx.fill();
      const bc = `rgba(180,${Math.floor(50 + Math.sin(t * 3 + i) * 18)},50,${0.55 + af * 0.3})`;
      ctx.strokeStyle = bc; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.roundRect(x+2, y+2, cs-4, cs-4, 3); ctx.stroke();
      ctx.fillStyle = bc; ctx.font = `${cs * 0.42}px monospace`; ctx.textAlign = "center";
      ctx.fillText("◆", cx2, cy2 + cs * 0.15);
      if (G.glitchF > 3 && Math.random() < 0.2) {
        ctx.fillStyle = "rgba(180,60,50,0.6)";
        ctx.fillRect(x + Math.random() * cs * 0.5, y + Math.random() * cs, cs * 0.3, 1);
      }
    });

    // Trail
    G.trail.forEach((t, i) => {
      const a = (i / G.trail.length) * 0.18;
      ctx.fillStyle = `rgba(176,168,152,${a})`;
      ctx.beginPath(); ctx.arc(t.vc * cs + cs/2, t.vr * cs + cs/2, cs * 0.12, 0, Math.PI*2); ctx.fill();
    });

    // Player
    const p = G.player;
    const px = p.vc * cs, py = p.vr * cs;
    const af = G.alert / 100;
    if (af > 0.1) {
      const gd = ctx.createRadialGradient(px + cs/2, py + cs/2, 0, px + cs/2, py + cs/2, cs * 1.1);
      gd.addColorStop(0, `rgba(180,40,40,${af * 0.15})`); gd.addColorStop(1, "transparent");
      ctx.fillStyle = gd; ctx.beginPath(); ctx.arc(px + cs/2, py + cs/2, cs * 1.1, 0, Math.PI*2); ctx.fill();
    }
    let ox = 0, oy = 0;
    if (G.glitchF > 4) { ox = (Math.random() - 0.5) * 2; oy = (Math.random() - 0.5) * 1.5; }
    ctx.save();
    ctx.beginPath(); ctx.roundRect(px + ox + 2, py + oy + 2, cs - 4, cs - 4, 4); ctx.clip();
    ctx.fillStyle = "#1a1814";
    ctx.fillRect(px + ox + 2, py + oy + 2, cs - 4, cs - 4);
    // Текст "10H" — две строки: число и буква
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(176,168,152,${0.85 + af * 0.1})`;
    ctx.font = `500 ${Math.max(6, cs * 0.28)}px 'Courier New'`;
    ctx.fillText("10", px + ox + cs / 2, py + oy + cs * 0.48);
    ctx.font = `500 ${Math.max(5, cs * 0.22)}px 'Courier New'`;
    ctx.fillStyle = `rgba(176,168,152,0.5)`;
    ctx.fillText("TYPE H", px + ox + cs / 2, py + oy + cs * 0.72);
    ctx.restore();
    ctx.strokeStyle = `rgba(176,168,152,${0.45 + af * 0.3})`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.roundRect(px + ox + 2, py + oy + 2, cs - 4, cs - 4, 4); ctx.stroke();
  }

  // ── СТИЛИ ────────────────────────────────────────────
  const base = {
    position: "fixed", inset: 0, zIndex: 9995,
    background: "rgba(8,7,6,0.97)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Courier New',monospace",
  };
  const wrap = {
    background: "#0c0b0a",
    border: "1px solid #2a2520",
    borderTop: "2px solid #b0a898",
    width: "100%", maxWidth: 380,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  };
  const A = "#b0a898";

  const hudStatusColor = hud.status === "ТРЕВОГА !!!" ? "#c44444" : hud.status === "ОПАСНОСТЬ" ? "#ca7040" : "#4a9070";

  // Результат для onComplete
  function handleConfirm() {
    if (result) onComplete(result);
  }

  // ── BOOT SCREEN ──────────────────────────────────────
  if (screen === "boot") return (
    <div style={base}>
      <div style={wrap}>
        {/* Scanlines */}
        <div style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)", pointerEvents:"none", zIndex:10 }}/>
        <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #1e1c18" }}>
          <div style={{ fontSize: 8, letterSpacing: 4, color: "#4a4438", marginBottom: 3 }}>YORHA ◈ ПРОТОКОЛ ИЗВЛЕЧЕНИЯ</div>
          <div style={{ fontSize: 13, color: A, letterSpacing: 2, marginBottom: 12 }}>СИМУЛЯЦИЯ — SIM-7</div>
          <div style={{ fontSize: 9, color: "#6a6058", marginBottom: 12 }}>
            ДИРЕКТИВА: <span style={{ color: "#9a9088" }}>{mission.title}</span>
            {" · "}
            <span style={{ color: mission.threat === "ВЫСОКАЯ" ? "#c44" : mission.threat === "СРЕДНЯЯ" ? "#ca7" : "#4a9" }}>
              {mission.threat}
            </span>
            {mission.isEvent && <span style={{ color: "#ff4444" }}> · ЭВЕНТ</span>}
          </div>
        </div>
        <div style={{ padding: "14px 20px", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {bootLog.map((l, i) => (
            <div key={i} style={{
              fontSize: 10, lineHeight: 2,
              color: l.cls === "ok" ? "#4a9070" : l.cls === "warn" ? "#b0a060" : l.cls === "err" ? "#c44444" : l.cls === "hi" ? A : "#6a6058",
            }}>{l.txt}</div>
          ))}
        </div>
        {/* Инфо о наградах */}
        <div style={{ display: "flex", gap: 6, padding: "0 20px 14px" }}>
          {[
            { lbl: "ПОЛНЫЙ УСПЕХ", val: "100% MEM", col: "#4a9070" },
            { lbl: "ЧАСТИЧНЫЙ", val: "~50% MEM", col: A },
            { lbl: "ПРОВАЛ", val: "8% MEM", col: "#c44444" },
          ].map(({ lbl, val, col }) => (
            <div key={lbl} style={{ flex: 1, background: "#141210", border: "0.5px solid #2a2520", borderRadius: 4, padding: "8px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 7, color: "#4a4438", letterSpacing: 1, marginBottom: 4 }}>{lbl}</div>
              <div style={{ fontSize: 11, color: col }}>{val}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, padding: "0 20px 20px" }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: 11, background: "transparent", border: "1px solid #3a3228", color: "#5a5248", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: 2, cursor: "pointer" }}>
            ОТМЕНА
          </button>
          <button onClick={initGame} disabled={!bootReady}
            style={{ flex: 2, padding: 11, background: bootReady ? "#141210" : "#0f0e0d", border: "1px solid " + (bootReady ? "#6a6058" : "#2a2520"), borderTop: "1px solid " + (bootReady ? A : "#2a2520"), color: bootReady ? A : "#3a3228", fontFamily: "'Courier New',monospace", fontSize: 9, letterSpacing: 3, cursor: bootReady ? "pointer" : "not-allowed", transition: "all .3s" }}>
            [ НАЧАТЬ СИМУЛЯЦИЮ ]
          </button>
        </div>
      </div>
    </div>
  );

  // ── GAME SCREEN ──────────────────────────────────────
  if (screen === "game") return (
    <div style={base}>
      <div style={{ ...wrap, maxWidth: 380 }}>
        <div style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)", pointerEvents:"none", zIndex:10 }}/>
        {/* Popup */}
        {popup && (
          <div style={{ position:"absolute", bottom:130, left:"50%", transform:"translateX(-50%)", background:"#141210", border:"1px solid #4a4438", borderLeft:"2px solid "+A, padding:"7px 14px", fontSize:9, color:A, letterSpacing:2, whiteSpace:"nowrap", zIndex:60, pointerEvents:"none" }}>
            {popup}
          </div>
        )}
        {/* HUD */}
        <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background:"#080807", borderBottom:"1px solid #1e1c18" }}>
          <div style={{ fontSize:9, letterSpacing:1 }}>
            <span style={{ color:"#4a4438" }}>ФРАГМ </span>
            <span style={{ color: hud.frags === hud.total ? "#4a9070" : A }}>{hud.frags}/{hud.total}</span>
          </div>
          <div style={{ fontSize:9, letterSpacing:1 }}>
            <span style={{ color:"#4a4438" }}>КОРРУПЦИЯ </span>
            <span style={{ color: hud.corruption > 55 ? "#c44444" : A }}>{hud.corruption}%</span>
          </div>
          <div style={{ fontSize:9, letterSpacing:1 }}>
            <span style={{ color:"#4a4438" }}>СТАТУС </span>
            <span style={{ color: hudStatusColor }}>{hud.status}</span>
          </div>
        </div>
        {/* Corruption bar */}
        <div style={{ height: 2, background: "#111009" }}>
          <div id="sim-cbar" style={{ height: 2, background: "#6a5030", width: hud.corruption + "%", transition: "width .5s" }}/>
        </div>
        {/* Canvas */}
        <canvas ref={canvasRef} style={{ display: "block", width: "100%" }}/>
        {/* D-pad */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:5, padding:"8px 12px", background:"#080807", borderTop:"1px solid #1e1c18" }}>
          {[
            null, { label:"▲", dr:-1, dc:0 }, null,
            { label:"◀", dr:0, dc:-1 },
            { label:"WAIT", dr:0, dc:0, wait:true },
            { label:"▶", dr:0, dc:1 },
            null, { label:"▼", dr:1, dc:0 }, null,
          ].map((btn, i) => btn === null ? (
            <div key={i}/>
          ) : (
            <button key={i}
              onClick={() => btn.wait
                ? (() => { const G = gameRef.current; if(G&&!G.over){tickMovePatrols(G);tickCheckSight(G);updateHudFromG(G);} })()
                : movePlayer(btn.dr, btn.dc)
              }
              style={{ padding:"12px 0", background:"#0f0e0d", border:"1px solid #2a2520", borderRadius:4, color:"#4a4438", fontSize: btn.wait ? 8 : 15, letterSpacing: btn.wait ? 1 : 0, cursor:"pointer", textAlign:"center", fontFamily:"'Courier New',monospace" }}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── RESULT SCREEN ─────────────────────────────────────
  if (screen === "result" && result) {
    const win = result.outcome !== "fail";
    const statusColor = win ? "#4a9070" : "#c44444";
    const titles = {
      full:    "ВСЕ ФРАГМЕНТЫ ИЗВЛЕЧЕНЫ",
      partial: "ЧАСТИЧНОЕ ИЗВЛЕЧЕНИЕ",
      fail:    result.reason === "caught" ? "ЮНИТ ОБНАРУЖЕН" : "ПОГЛОЩЕНА КОРРУПЦИЕЙ",
    };
    const descs = {
      full:    "Данные восстановлены. Командование подтверждает полный успех. 10H возвращается на базу.",
      partial: "Выход достигнут. Часть фрагментов утеряна в коррупции. Командование приняло данные.",
      fail:    result.reason === "caught"
        ? "Система защиты нейтрализовала юнита. Минимальная компенсация начислена."
        : "Данные юнита уничтожены коррупцией. Минимальная компенсация начислена.",
    };
    const fragRatio = result.outcome === "full" ? 1 : result.outcome === "partial" ? result.fragsCollected / result.total : 0;

    return (
      <div style={base}>
        <div style={wrap}>
          <div style={{ position:"absolute", inset:0, background:"repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.06) 3px,rgba(0,0,0,0.06) 4px)", pointerEvents:"none", zIndex:10 }}/>
          <div style={{ padding: "28px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
            <div style={{ fontSize: 8, letterSpacing: 4, color: statusColor }}>
              {result.outcome === "full" ? "ОПЕРАЦИЯ ЗАВЕРШЕНА" : result.outcome === "partial" ? "ВЫХОД ВЫПОЛНЕН" : "ОПЕРАЦИЯ ПРОВАЛЕНА"}
            </div>
            {/* Арт */}
            <div style={{ height: 100, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
              <img src={IMG_URL} style={{ height: 90, objectFit:"contain", filter: win ? "drop-shadow(0 0 8px rgba(74,144,112,0.3))" : "drop-shadow(0 0 8px rgba(180,40,40,0.2)) grayscale(0.5)" }} alt="10H"/>
            </div>
            <div style={{ fontSize: 15, color: "#d8d0c4", letterSpacing: 2, textAlign:"center" }}>
              {titles[result.outcome]}
            </div>
            <div style={{ fontSize: 10, color: "#5a5248", textAlign:"center", lineHeight: 1.9, maxWidth: 280 }}>
              {descs[result.outcome]}
            </div>
            {/* Прогресс фрагментов */}
            <div style={{ width:"100%", maxWidth:280 }}>
              <div style={{ fontSize:8, color:"#4a4438", letterSpacing:2, marginBottom:6 }}>ФРАГМЕНТЫ ПАМЯТИ</div>
              <div style={{ display:"flex", gap:4 }}>
                {Array.from({ length: result.total }).map((_, i) => (
                  <div key={i} style={{ flex:1, height:4, background: i < result.fragsCollected ? "#4a9070" : "#1e1c18", borderRadius:2, transition:"background .3s" }}/>
                ))}
              </div>
              <div style={{ fontSize:9, color:"#5a5248", marginTop:4 }}>{result.fragsCollected}/{result.total} восстановлено</div>
            </div>
            {/* Инфо о наградах */}
            <div style={{ background:"#141210", border:"1px solid #2a2520", borderLeft:"2px solid "+statusColor, padding:"10px 14px", width:"100%", maxWidth:280, fontSize:9, color:"#6a6058", letterSpacing:1, lineHeight:1.8 }}>
              <div style={{ color: "#4a4438", marginBottom:4 }}>РЕЗУЛЬТАТ СИМУЛЯЦИИ</div>
              {result.outcome === "full" && <div style={{ color: "#4a9070" }}>✓ Полная награда за миссию</div>}
              {result.outcome === "partial" && (
                <>
                  <div style={{ color: A }}>~ {Math.round(fragRatio * 100)}% от базовой награды за MEM</div>
                  <div style={{ color: "#4a4438" }}>◈ Только собранные фрагменты</div>
                </>
              )}
              {result.outcome === "fail" && <div style={{ color: "#c44444" }}>✗ Минимальная компенсация (8%)</div>}
            </div>
            <div style={{ display:"flex", gap:8, width:"100%", maxWidth:280 }}>
              <button onClick={onClose}
                style={{ flex:1, padding:11, background:"transparent", border:"1px solid #3a3228", color:"#5a5248", fontFamily:"'Courier New',monospace", fontSize:9, letterSpacing:2, cursor:"pointer" }}>
                ЗАКРЫТЬ
              </button>
              <button onClick={handleConfirm}
                style={{ flex:2, padding:11, background:"#141210", border:"1px solid #4a4438", borderTop:"1px solid "+statusColor, color: statusColor, fontFamily:"'Courier New',monospace", fontSize:9, letterSpacing:2, cursor:"pointer" }}>
                [ ПРИНЯТЬ НАГРАДУ ]
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
