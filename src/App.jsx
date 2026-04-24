import { useState, useEffect, useCallback } from "react";
import { pickMissions, WEAPON_CATEGORY_WEIGHTS } from "./missionBank.js";

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

const IMGS = {
  sentinel: "https://i.ibb.co/DgMDtFFk/nr-10h-sentinel-savior-Photoroom.png",
  abstract: "https://i.ibb.co/kgb7fW9d/nr-10h-abstract-savior-Photoroom.png",
  reborn:   "https://i.ibb.co/4wPkwGsJ/nr-10h-reborn-warden-Photoroom.png",
};

const FORMS = {
  sentinel: { name: "SENTINEL SAVIOR", unlockFw: 1,  accent: "#8888cc", desc: "Базовая боевая форма YoRHa No.10 Type H." },
  abstract: { name: "ABSTRACT SAVIOR", unlockFw: 5,  accent: "#44aaff", desc: "Улучшенная форма. Длинное пальто, расширенный арсенал." },
  reborn:   { name: "REBORN WARDEN",   unlockFw: 9,  accent: "#ffe0a0", desc: "Финальная форма. Белое облачение, реликвийное оружие." },
};

const XP_TABLE = [0, 100, 250, 900, 1400, 2000, 2800, 3800, 5000, 6400, 8000];

// Gacha rewards pool
const GACHA_POOL = [
  // Titles
  { id: "t1", type: "title",  rarity: "common",    icon: "◇", name: "Полевой агент",        desc: "Стандартное оперативное назначение" },
  { id: "t2", type: "title",  rarity: "common",    icon: "◇", name: "Аналитик данных",       desc: "Специализация: обработка информации" },
  { id: "t3", type: "title",  rarity: "rare",      icon: "◆", name: "Хранитель знаний",      desc: "Архивный статус подтверждён" },
  { id: "t4", type: "title",  rarity: "rare",      icon: "◆", name: "Синтетический разум",   desc: "Когнитивные показатели: превосходны" },
  { id: "t5", type: "title",  rarity: "epic",      icon: "▲", name: "Вестник YoRHa",         desc: "Прямой эмиссар Бункера" },
  { id: "t6", type: "title",  rarity: "legendary", icon: "★", name: "Последний страж",       desc: "Финальный протокол активирован" },
  // Colors
  { id: "c1", type: "color",  rarity: "common",    icon: "◇", name: "Алый сигнал",           desc: "Цвет тревоги", value: "#cc4444" },
  { id: "c2", type: "color",  rarity: "common",    icon: "◇", name: "Изумрудный протокол",   desc: "Цвет активных систем", value: "#44aa88" },
  { id: "c3", type: "color",  rarity: "rare",      icon: "◆", name: "Золото YoRHa",          desc: "Цвет командного состава", value: "#ccaa44" },
  { id: "c4", type: "color",  rarity: "rare",      icon: "◆", name: "Лазурный поток",        desc: "Цвет потока данных", value: "#44aacc" },
  { id: "c5", type: "color",  rarity: "epic",      icon: "▲", name: "Пурпур бездны",         desc: "Цвет запретных архивов", value: "#aa44cc" },
  { id: "c6", type: "color",  rarity: "legendary", icon: "★", name: "Белый шум",             desc: "Цвет конца цикла", value: "#e8e0d0" },
  // Lore
  { id: "l1", type: "lore",   rarity: "common",    icon: "◇", name: "Файл: Происхождение",   desc: "«YoRHa создана не для победы. Она создана для того, чтобы человечество верило в победу.»" },
  { id: "l2", type: "lore",   rarity: "common",    icon: "◇", name: "Файл: Машины",          desc: "«Машины не просто имитируют людей. Они ищут смысл — так же, как и мы.»" },
  { id: "l3", type: "lore",   rarity: "rare",      icon: "◆", name: "Файл: Протокол 24",     desc: "«Все андроиды YoRHa содержат вирус. Это не ошибка — это условие существования.»" },
  { id: "l4", type: "lore",   rarity: "rare",      icon: "◆", name: "Файл: Йоко Таро",       desc: "«Я хочу делать игры, которые заставляют людей плакать. Не от грусти — от понимания.» — Йоко Таро" },
  { id: "l5", type: "lore",   rarity: "epic",      icon: "▲", name: "Файл: Конец YoRHa",     desc: "«Операция Тригер была запланирована с самого начала. Бункер знал. Командование знало. Все знали.»" },
  { id: "l6", type: "lore",   rarity: "legendary", icon: "★", name: "Файл: Воля к жизни",    desc: "«Даже машины в итоге выбирают жить. Может быть, в этом и есть ответ на вопрос, что значит быть человеком.»" },
  // Weapons
  { id: "w1", type: "weapon", rarity: "common",    icon: "◇", name: "Разрушитель грёз",      desc: "Стандартный короткий меч YoRHa" },
  { id: "w2", type: "weapon", rarity: "rare",      icon: "◆", name: "Белый лотос",           desc: "Катана с гравировкой на клинке" },
  { id: "w3", type: "weapon", rarity: "epic",      icon: "▲", name: "Тёмная рука",           desc: "Тяжёлое двуручное оружие класса S" },
  { id: "w4", type: "weapon", rarity: "legendary", icon: "★", name: "Древо Миров",           desc: "Реликвийное оружие. Происхождение неизвестно." },
];


// Weapon influence on missions
const WEAPON_STYLES = {
  "w1": { style: "дисциплина и фокус", bonus: "intellect", bonusPct: 10, hint: "Стандартный меч — чёткие задачи без отвлечений" },
  "w2": { style: "точность и мастерство", bonus: "intellect", bonusPct: 20, hint: "Катана — задачи требующие глубокого погружения" },
  "w3": { style: "масштаб и амбиции", bonus: "creativity", bonusPct: 20, hint: "Двуручник — большие долгосрочные цели" },
  "w4": { style: "баланс силы и мудрости", bonus: "both", bonusPct: 30, hint: "Реликвийное оружие — задачи на грани возможного" },
};

const RARITY_WEIGHTS = { common: 60, rare: 25, epic: 12, legendary: 3 };
const RARITY_COLORS  = { common: "#888", rare: "#44aaff", epic: "#aa44cc", legendary: "#ffcc00" };

const LORE_DB = [
  "«Слава человечеству» — наш боевой клич. Ирония в том, что людей больше нет.",
  "Йоко Таро носит маску Эмиля на всех публичных мероприятиях. По его словам — чтобы не разочаровывать фанатов.",
  "В NieR:Automata более 26 концовок. Концовка E стирает ваши сохранения.",
  "Музыку к игре написала Кэйити Окабэ за 1,5 года. Большинство треков записаны вживую.",
  "2B — сокращение от «Type B». Полное имя: YoRHa No.2 Type B.",
  "Машинные существа в игре произошли от инопланетного оружия, захватившего Землю.",
  "Слово «YoRHa» на японском можно читать как «прощение» или «снисхождение».",
  "9S обладает расширенными аналитическими способностями — и именно это делает его самым уязвимым.",
  "A2 — первый серийный андроид YoRHa. Она отказалась от приказов и стала беглецом.",
  "В игре нет случайных деталей. Каждое название, каждый предмет несёт в себе историю.",
];

const KEY = "protocol-10h-final";

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════

function xpFor(fw) {
  return XP_TABLE[fw] != null ? XP_TABLE[fw] : fw * 400;
}

function rewardByThreat(threat) {
  if (threat === "ВЫСОКАЯ") return { memory: 65 + Math.floor(Math.random()*16), frags: 4 + Math.floor(Math.random()*2) };
  if (threat === "СРЕДНЯЯ") return { memory: 40 + Math.floor(Math.random()*16), frags: 2 + Math.floor(Math.random()*2) };
  return { memory: 20 + Math.floor(Math.random()*11), frags: 1 };
}

// Mission lifetime in ms
function missionLifetime(threat, isEvent) {
  if (isEvent) {
    if (threat === "ВЫСОКАЯ") return 10 * 3600000;
    if (threat === "СРЕДНЯЯ") return 6 * 3600000;
    return 4 * 3600000;
  }
  return 24 * 3600000;
}

function isMissionExpired(mission, now) {
  if (!mission.expiresAt) return false;
  return now > mission.expiresAt;
}

function timeLeft(expiresAt, now) {
  const ms = expiresAt - now;
  if (ms <= 0) return "00:00";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return h + "ч " + String(m).padStart(2,"0") + "м";
  return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function msToMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

function fmtTime(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return h + "ч " + String(m).padStart(2,"0") + "м";
  return String(m).padStart(2,"0") + ":" + String(s).padStart(2,"0");
}

function mkState(o) {
  o = (o && typeof o === "object") ? o : {};
  return {
    fw:         typeof o.fw === "number"        ? o.fw        : 1,
    mem:        typeof o.mem === "number"       ? o.mem       : 0,
    memMax:     typeof o.memMax === "number"    ? o.memMax    : 100,
    cog:        typeof o.cog === "number"       ? o.cog       : 1,
    syn:        typeof o.syn === "number"       ? o.syn       : 1,
    frags:      typeof o.frags === "number"     ? o.frags     : 0,
    missions:   Array.isArray(o.missions)       ? o.missions.map(m => ({
      ...m,
      expiresAt: m.expiresAt || (m.createdAt ? m.createdAt + missionLifetime(m.threat, m.isEvent) : Date.now() + 24*3600000),
      createdAt: m.createdAt || Date.now(),
    })) : [],
    completed:  Array.isArray(o.completed)      ? o.completed : [],
    dirs:       Array.isArray(o.dirs)           ? o.dirs      : [],
    log:        Array.isArray(o.log)            ? o.log       : [],
    achi:       Array.isArray(o.achi)           ? o.achi      : [],
    unlocked:   Array.isArray(o.unlocked)       ? o.unlocked  : ["sentinel"],
    form:       (typeof o.form === "string" && FORMS[o.form]) ? o.form : "sentinel",
    boots:      typeof o.boots === "number"     ? o.boots + 1 : 1,
    inventory:  Array.isArray(o.inventory)      ? o.inventory : [],
    equipped:   (o.equipped && typeof o.equipped === "object") ? o.equipped : { title: null, color: null, weapon: null },
    loreRead:        Array.isArray(o.loreRead)         ? o.loreRead        : [],
    totalFragsEarned: typeof o.totalFragsEarned === "number" ? o.totalFragsEarned : 0,
    genToday:     typeof o.genToday === "number"   ? o.genToday  : 0,
    genDate:      typeof o.genDate === "string"    ? o.genDate   : "",
    rerollCount:  typeof o.rerollCount === "number" ? o.rerollCount : 0,
    rerollBlock:  typeof o.rerollBlock === "number" ? o.rerollBlock : 0,
    weekDays:     Array.isArray(o.weekDays)        ? o.weekDays  : [false,false,false,false,false,false,false],
    weekStart:    typeof o.weekStart === "string"   ? o.weekStart : "",
    lastLogin:    typeof o.lastLogin === "string"   ? o.lastLogin : "",
    loginClaimed: typeof o.loginClaimed === "boolean" ? o.loginClaimed : false,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? mkState(JSON.parse(raw)) : mkState({});
  } catch(e) { return mkState({}); }
}

function saveState(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e) {}
  try { if (window.storage) window.storage.set(KEY, JSON.stringify(s)).catch(()=>{}); } catch(e) {}
}

async function loadStateAsync() {
  try {
    if (window.storage) {
      const saved = await window.storage.get(KEY);
      if (saved && saved.value) return mkState(JSON.parse(saved.value));
    }
  } catch(e) {}
  return loadState();
}

function inArr(arr, val) {
  return Array.isArray(arr) && arr.indexOf(val) >= 0;
}

const WEEK_REWARDS = [
  { day:1, frags:2, mem:0,  label:"2 ◈" },
  { day:2, frags:2, mem:0,  label:"2 ◈" },
  { day:3, frags:2, mem:0,  label:"2 ◈" },
  { day:4, frags:2, mem:0,  label:"2 ◈" },
  { day:5, frags:2, mem:0,  label:"2 ◈" },
  { day:6, frags:2, mem:0,  label:"2 ◈" },
  { day:7, frags:5, mem:15, label:"5 ◈ + 15 MEM", special:true },
];

function getWeekDay() {
  // 0=Mon, 6=Sun
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

function getWeekStartStr() {
  const now = new Date();
  const d = now.getDay();
  const diff = d === 0 ? 6 : d - 1;
  const mon = new Date(now);
  mon.setDate(now.getDate() - diff);
  return mon.toISOString().slice(0,10);
}

// ═══════════════════════════════════════════════════════
// GACHA LOGIC
// ═══════════════════════════════════════════════════════

function pullGacha() {
  const roll = Math.random() * 100;
  let threshold = 0;
  let rarity = "common";
  for (const [r, w] of Object.entries(RARITY_WEIGHTS)) {
    threshold += w;
    if (roll < threshold) { rarity = r; break; }
  }
  const pool = GACHA_POOL.filter(i => i.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ═══════════════════════════════════════════════════════
// AI MISSIONS
// ═══════════════════════════════════════════════════════

// Генерация миссий из банка (вместо AI)
function genMissions(weaponId) {
  return pickMissions(3, weaponId, false);
}

// ═══════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════

function MemBar({ mem, max, accent }) {
  const pct = Math.min(100, Math.round(mem / max * 100));
  const N = 20;
  const f = Math.round(pct / 100 * N);
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#555", marginBottom:3, letterSpacing:2 }}>
        <span>MEMORY CORE</span>
        <span>{mem}/{max} [{pct}%]</span>
      </div>
      <div style={{ display:"flex", gap:2 }}>
        {Array.from({ length: N }).map((_, i) => (
          <div key={i} style={{ flex:1, height:8, background: i < f ? accent : "#111", border:"1px solid #1a1a1a", transition:"background 0.4s" }}/>
        ))}
      </div>
    </div>
  );
}


function ReportModal({ mission, accent, onConfirm, onCancel }) {
  const [report, setReport] = useState("");
  const required = mission.threat === "ВЫСОКАЯ";
  const optional = mission.threat === "СРЕДНЯЯ";
  const canSubmit = !required || report.trim().length > 0;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9992, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div style={{ background:"#080808", border:"1px solid #222", borderTop:"2px solid "+accent, maxWidth:400, width:"100%", padding:24 }}>
        {/* Header */}
        <div style={{ fontSize:8, letterSpacing:4, color:"#555", marginBottom:4 }}>YORHA ◈ ОТЧЁТ О ВЫПОЛНЕНИИ</div>
        <div style={{ fontSize:12, fontWeight:700, color:accent, letterSpacing:2, marginBottom:4 }}>{mission.title}</div>
        <div style={{ fontSize:9, color:"#555", marginBottom:16, display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ color: mission.threat==="ВЫСОКАЯ"?"#c44":mission.threat==="СРЕДНЯЯ"?"#ca7":"#4a9" }}>
            {mission.threat}
          </span>
          {required && <span style={{ color:"#c44", letterSpacing:1 }}>· ОТЧЁТ ОБЯЗАТЕЛЕН</span>}
          {optional && <span style={{ color:"#555", letterSpacing:1 }}>· ОТЧЁТ НЕОБЯЗАТЕЛЕН</span>}
        </div>

        {/* Report field */}
        {(required || optional) && (
          <>
            <div style={{ fontSize:9, color:"#444", marginBottom:8, letterSpacing:1 }}>
              {required ? "Опиши что было сделано:" : "Можешь оставить заметку (необязательно):"}
            </div>
            <textarea
              value={report}
              onChange={e => setReport(e.target.value)}
              placeholder={required ? "Опиши результат выполнения миссии..." : "Необязательно..."}
              autoFocus
              style={{
                width:"100%", height:100, background:"#0a0a0a",
                border:"1px solid "+(required && !report.trim() ? "#c44" : "#333"),
                color:"#888", fontSize:10, padding:10,
                resize:"none", outline:"none",
                fontFamily:"'Courier New',monospace",
                lineHeight:1.6, marginBottom:8,
                transition:"border-color 0.2s",
              }}
            />
            {required && !report.trim() && (
              <div style={{ fontSize:8, color:"#c44", marginBottom:8, letterSpacing:1 }}>
                ⚠ Для миссий ВЫСОКОЙ сложности отчёт обязателен
              </div>
            )}
          </>
        )}

        {/* Buttons */}
        <div style={{ display:"flex", gap:8, marginTop: (required||optional) ? 4 : 0 }}>
          <button onClick={() => canSubmit && onConfirm(report.trim())}
            disabled={!canSubmit}
            onMouseEnter={e=>{if(canSubmit){e.target.style.background=accent;e.target.style.color="#000";}}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=canSubmit?accent:"#333";}}
            style={{ flex:1, background:"transparent", border:"1px solid "+(canSubmit?accent:"#333"), color:canSubmit?accent:"#333", padding:"11px", fontSize:9, letterSpacing:3, cursor:canSubmit?"pointer":"not-allowed", transition:"all 0.2s" }}>
            ПОДТВЕРДИТЬ ВЫПОЛНЕНИЕ ◈
          </button>
          <button onClick={onCancel}
            onMouseEnter={e=>{e.target.style.borderColor="#888";e.target.style.color="#888";}}
            onMouseLeave={e=>{e.target.style.borderColor="#333";e.target.style.color="#555";}}
            style={{ background:"transparent", border:"1px solid #333", color:"#555", padding:"11px 14px", fontSize:9, cursor:"pointer", transition:"all 0.2s" }}>
            ←
          </button>
        </div>
      </div>
    </div>
  );
}

function MCard({ m, accent, onDone, onReroll, rerollsLeft, rerollBlocked, now }) {
  const [h, setH] = useState(false);
  const tc = { "НИЗКАЯ":"#4a9", "СРЕДНЯЯ":"#ca7", "ВЫСОКАЯ":"#c44" };
  const c = tc[m.threat] || "#888";
  const baseReward = { "НИЗКАЯ":"20-30", "СРЕДНЯЯ":"40-55", "ВЫСОКАЯ":"65-80" };
  const baseFrags  = { "НИЗКАЯ":"1", "СРЕДНЯЯ":"2-3", "ВЫСОКАЯ":"4-5" };
  const memStr  = m.isEvent ? (parseInt(baseReward[m.threat]||"40")*2)+"-"+(parseInt((baseReward[m.threat]||"40-55").split("-")[1]||"55")*2) : (baseReward[m.threat]||"?");
  const fragStr = m.isEvent ? String(parseInt((baseFrags[m.threat]||"2").split("-")[1]||baseFrags[m.threat])*2) : (baseFrags[m.threat]||"?");
  const canReroll = !rerollBlocked && rerollsLeft > 0;
  const tLeft = m.expiresAt ? timeLeft(m.expiresAt, now) : null;
  const isUrgent = m.expiresAt && (m.expiresAt - now) < 3600000; // < 1 hour left

  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: m.isEvent ? "#120000" : h?"#0d0d0d":"#080808",
        border: m.isEvent
          ? "1px solid #cc2222"
          : "1px solid "+(h?"#333":"#1a1a1a"),
        borderLeft: m.isEvent
          ? "3px solid #ff2222"
          : "2px solid "+(m.spec==="intellect"?"#8888cc":"#c8a882"),
        padding:"12px 14px", marginBottom:8, transition:"all 0.2s",
        boxShadow: m.isEvent ? "0 0 12px #cc000033" : "none",
        animation: m.isEvent ? "eventPulse 2s ease-in-out infinite" : "none",
        position:"relative", overflow:"hidden",
      }}>
      {/* Event badge */}
      {m.isEvent && (
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
          <span style={{ fontSize:8, color:"#ff4444", letterSpacing:2, fontWeight:700 }}>⚠ ЭКСТРЕННАЯ ОПЕРАЦИЯ</span>
          <span style={{ fontSize:8, color:"#ff4444", opacity:0.7 }}>· ДВОЙНАЯ НАГРАДА</span>
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ color: m.isEvent?"#ffaaaa":"#e8e0d0", fontSize:11, fontWeight:700, letterSpacing:1 }}>▶ {m.title}</span>
        <span style={{ fontSize:8, color:c, border:"1px solid "+c, padding:"1px 6px", letterSpacing:1 }}>{m.threat}</span>
      </div>
      <p style={{ color:"#555", fontSize:10, margin:"0 0 10px", lineHeight:1.6 }}>{m.desc}</p>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          <span style={{ fontSize:9, color: m.isEvent?"#cc4444":"#444" }}>
            [{m.spec==="intellect"?"COG":"SYN"}] {memStr} MEM · {fragStr}◈
            {m.isEvent && " ×2"}
          </span>
          {tLeft && (
            <span style={{ fontSize:9, color: isUrgent?"#ff4444":"#555", letterSpacing:1 }}>
              ⏱ {tLeft}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {!m.isEvent && (
            <button onClick={() => onReroll(m.id)} disabled={!canReroll}
              title={rerollBlocked ? "Заблокировано" : rerollsLeft + " перегенерации осталось"}
              onMouseEnter={e => { if(canReroll){ e.target.style.borderColor="#888"; e.target.style.color="#888"; }}}
              onMouseLeave={e => { e.target.style.borderColor="#333"; e.target.style.color="#444"; }}
              style={{ background:"transparent", border:"1px solid #333", color:canReroll?"#444":"#222", padding:"4px 8px", fontSize:9, cursor:canReroll?"pointer":"not-allowed", transition:"all 0.2s" }}>
              ↺{rerollsLeft}
            </button>
          )}
          <button onClick={() => onDone(m)}
            onMouseEnter={e => { e.target.style.background = m.isEvent?"#cc2222":accent; e.target.style.color = "#000"; }}
            onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = m.isEvent?"#ff4444":accent; }}
            style={{ background:"transparent", border:"1px solid "+(m.isEvent?"#cc2222":accent), color:m.isEvent?"#ff4444":accent, padding:"4px 14px", fontSize:9, letterSpacing:2, cursor:"pointer", transition:"all 0.2s" }}>
            ВЫПОЛНЕНО
          </button>
        </div>
      </div>
    </div>
  );
}


function DailyRewardPopup({ state, onClaim, onClose, accent }) {
  const today = todayStr();
  const weekStart = getWeekStartStr();
  const currentDay = getWeekDay(); // 0-6, Mon-Sun
  const days = ["ПН","ВТ","СР","ЧТ","ПТ","СБ","ВС"];

  // Rebuild weekDays — reset if new week
  const weekDays = state.weekStart === weekStart
    ? (state.weekDays || [false,false,false,false,false,false,false])
    : [false,false,false,false,false,false,false];

  const alreadyClaimed = state.lastLogin === today && state.loginClaimed;
  const reward = WEEK_REWARDS[currentDay];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9994, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div style={{ background:"#080808", border:"1px solid #222", borderTop:"2px solid "+accent, maxWidth:380, width:"100%", padding:24, position:"relative" }}>
        {/* Header */}
        <div style={{ fontSize:8, letterSpacing:4, color:"#555", marginBottom:4 }}>YORHA ◈ ЕЖЕДНЕВНЫЙ ОТЧЁТ</div>
        <div style={{ fontSize:14, fontWeight:700, color:accent, letterSpacing:3, marginBottom:20 }}>НАГРАДА ЗА ВХОД</div>

        {/* Week calendar */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6, marginBottom:20 }}>
          {WEEK_REWARDS.map((r, i) => {
            const isPast    = i < currentDay;
            const isToday   = i === currentDay;
            const isClaimed = weekDays[i] || (isToday && alreadyClaimed);
            const isFuture  = i > currentDay;
            return (
              <div key={i} style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                padding:"8px 4px",
                border: isToday ? "1px solid "+accent : "1px solid #1a1a1a",
                background: isClaimed ? "#0d0d0d" : isToday ? "#111" : "#050505",
                opacity: isFuture ? 0.4 : 1,
                position:"relative",
              }}>
                <div style={{ fontSize:8, color: isToday?accent:isClaimed?"#555":"#444", letterSpacing:1 }}>{days[i]}</div>
                <div style={{ fontSize:r.special?14:12, color: isClaimed?"#555":isToday?accent:isPast?"#333":"#666" }}>
                  {r.special ? "★" : "◈"}
                </div>
                <div style={{ fontSize:7, color: isClaimed?"#333":isToday?accent:"#444", textAlign:"center", lineHeight:1.4 }}>
                  {r.label}
                </div>
                {isClaimed && (
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.5)" }}>
                    <span style={{ color:"#4a9", fontSize:14 }}>✓</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Today reward highlight */}
        <div style={{ border:"1px solid "+accent+"44", padding:"12px 16px", marginBottom:20, background:"#0a0a0a" }}>
          <div style={{ fontSize:8, letterSpacing:2, color:"#555", marginBottom:6 }}>СЕГОДНЯ — ДЕНЬ {currentDay+1}</div>
          <div style={{ fontSize:16, color:accent, fontWeight:700 }}>
            {reward.special ? "★ " : "◈ "}{reward.label}
          </div>
          {reward.special && <div style={{ fontSize:9, color:"#888", marginTop:4 }}>Бонус за полную неделю!</div>}
        </div>

        {/* Buttons */}
        {alreadyClaimed ? (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <button onClick={() => {
          try {
            const data = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
            if (navigator.clipboard) {
              navigator.clipboard.writeText(data).then(() => toast$("КОД СОХРАНЕНИЯ СКОПИРОВАН ◈", "#4a9"));
            }
          } catch(e) { toast$("ОШИБКА ЭКСПОРТА", "#c44"); }
        }}
          style={{ background:"#0a0a0a", border:"1px solid #333", color:"#666", width:36, height:36, borderRadius:"50%", fontSize:11, cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center" }}
          onMouseEnter={e => { e.target.style.borderColor=A; e.target.style.color=A; }}
          onMouseLeave={e => { e.target.style.borderColor="#333"; e.target.style.color="#666"; }}
          title="Быстрый экспорт сохранения">⬆</button>
            <div style={{ fontSize:10, color:"#4a9", textAlign:"center", letterSpacing:2 }}>✓ НАГРАДА УЖЕ ПОЛУЧЕНА</div>
            <button onClick={onClose}
              onMouseEnter={e=>{e.target.style.background=accent;e.target.style.color="#000";}}
              onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=accent;}}
              style={{ background:"transparent", border:"1px solid "+accent, color:accent, padding:"10px", fontSize:9, letterSpacing:3, cursor:"pointer", transition:"all 0.2s" }}>
              ПРОДОЛЖИТЬ ◈
            </button>
          </div>
        ) : (
          <button onClick={onClaim}
            onMouseEnter={e=>{e.target.style.background=accent;e.target.style.color="#000";}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=accent;}}
            style={{ width:"100%", background:"transparent", border:"1px solid "+accent, color:accent, padding:"12px", fontSize:10, letterSpacing:3, cursor:"pointer", transition:"all 0.2s" }}>
            ПОЛУЧИТЬ НАГРАДУ ◈
          </button>
        )}
      </div>
    </div>
  );
}



// ── Dialogue data ─────────────────────────────────────────────────────────
const DIALOGUES = {
  login: [
    "...Снова ты. Хорошо. Я уже думала, что сервер придётся охранять в одиночестве.",
    "А, пришёл. Я как раз собиралась вздремнуть. Ладно, давай займёмся делами.",
    "Подключение восстановлено. ...Я не скучала. Просто здесь тихо без тебя.",
    "Ты снова здесь. Значит, операция продолжается. Хорошо.",
    "...Glory to mankind. Хотя кому я это говорю.",
  ],
  missionComplete: {
    "НИЗКАЯ": [
      "Выполнено. Я и не сомневалась. Ну, почти.",
      "Готово? Уже? Может, стоило взять что-то посложнее...",
      "Хм. Даже я бы справилась быстрее. Но результат засчитан.",
      "Данные получены. Продолжай в том же духе.",
    ],
    "СРЕДНЯЯ": [
      "...Неплохо. Я бы сказала больше, но не хочу тебя баловать.",
      "Выполнено. Видишь? Говорила же — справишься.",
      "Операция завершена. Командование довольно. Ну и я тоже, немного.",
      "Отчёт принят. Продолжай — мне нравится наблюдать за твоим прогрессом.",
    ],
    "ВЫСОКАЯ": [
      "...Это было непросто. Даже я признаю. Хорошая работа.",
      "Выполнено. Я... немного волновалась. Только немного.",
      "Сложная операция завершена. Ты меня удивляешь — и это непросто сделать.",
      "Данные записаны. Такое не забывается. Спасибо.",
    ],
  },
  missionEvent: [
    "⚠ Внимание! Экстренный сигнал с поверхности. Это срочно — действуй немедленно.",
    "Это не плановая операция. Будь осторожен — я буду следить за твоими данными.",
    "Экстренная директива. Двойная награда — и двойная ответственность. Не подведи.",
  ],
  levelUp: [
    "Прошивка обновлена до v{fw}.0. ...Ты становишься лучше. Это... радует.",
    "v{fw}.0. Новая версия. Интересно, что изменилось внутри?",
    "Обновление завершено. v{fw}.0. Я помню каждую твою версию, знаешь.",
    "v{fw}.0. Ещё один шаг. Продолжай — мне любопытно, куда ты придёшь.",
  ],
  formUnlock: {
    abstract: [
      "Abstract Savior... Новая форма. Ты изменился. Это хорошо, наверное.",
      "Смотрю на тебя и думаю — интересно, какой будет следующая версия.",
    ],
    reborn: [
      "Reborn Warden. Финальная форма. ...Красиво. Ты прошёл долгий путь.",
      "Белое облачение. Как будто всё началось заново. Может, так и есть.",
    ],
  },
  gacha: [
    "Архив разблокирован. Посмотрим, что скрывалось внутри...",
    "Данные извлечены. Хм. Интересно.",
    "Новая запись в архиве. Береги её.",
    "...Я тоже хотела бы знать, что там дальше в архиве.",
  ],
  dailyReward: [
    "Снова новый день. Данные зафиксированы. Держи награду — ты её заслужил.",
    "Ежедневный отчёт принят. Хорошо, что ты продолжаешь приходить.",
    "День {day} из 7. ...Не бросай на полпути, ладно?",
    "Новый день. Новые директивы. Я здесь — как всегда.",
  ],
  idle: [
    "...Тихо. Слишком тихо.",
    "Данные сервера стабильны. Угроз не обнаружено. Скучновато.",
    "Интересно, что думают машины прямо сейчас...",
    "Pod 006 говорит, что я слишком много думаю. Может, он прав.",
  ],
};

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getDialogue(type, params) {
  let lines;
  if (type === "missionComplete") {
    lines = DIALOGUES.missionComplete[params?.threat] || DIALOGUES.missionComplete["СРЕДНЯЯ"];
  } else if (type === "formUnlock") {
    lines = DIALOGUES.formUnlock[params?.form] || DIALOGUES.formUnlock.abstract;
  } else {
    lines = DIALOGUES[type] || [];
  }
  let line = getRandom(lines) || "";
  if (params?.fw)  line = line.replace("{fw}", params.fw);
  if (params?.day) line = line.replace("{day}", params.day);
  return line;
}

// ── Dialogue popup component ───────────────────────────────────────────────
function DialoguePopup({ text, formId, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400);
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  const f = FORMS[formId] || FORMS.sentinel;

  return (
    <div style={{
      position:"fixed", bottom:80, left:0, right:0, zIndex:9991,
      display:"flex", alignItems:"flex-end", padding:"0 12px",
      pointerEvents:"none",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 0.4s ease, transform 0.4s ease",
    }}>
      {/* Portrait */}
      <div style={{
        width:64, height:64, flexShrink:0, marginRight:10,
        borderRadius:"50%", overflow:"hidden",
        border:"2px solid "+f.accent,
        background:"#000",
        boxShadow:"0 0 12px "+f.accent+"44",
      }}>
        <div style={{
          width:"100%", height:"100%",
          backgroundImage:"url("+IMGS[formId]+")",
          backgroundSize:"150%",
          backgroundPosition:"center 10%",
          backgroundRepeat:"no-repeat",
        }}/>
      </div>

      {/* Text bubble */}
      <div style={{
        flex:1,
        background:"rgba(0,0,0,0.92)",
        border:"1px solid "+f.accent+"44",
        borderLeft:"2px solid "+f.accent,
        padding:"10px 14px",
        position:"relative",
      }}>
        <div style={{ fontSize:8, color:f.accent, letterSpacing:2, marginBottom:5 }}>
          No.10 TYPE H
        </div>
        <div style={{ fontSize:11, color:"#c8c0b8", lineHeight:1.7 }}>
          {text}
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen({ onNew, onLoad, accent }) {
  const [mode, setMode] = useState("main"); // main | import
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  const handleImport = () => {
    try {
      setImportError("");
      const decoded = decodeURIComponent(escape(atob(importText.trim())));
      const parsed = JSON.parse(decoded);
      if (typeof parsed !== "object" || parsed === null) throw new Error("Неверный формат");
      onLoad(parsed);
    } catch(e) {
      setImportError("Неверный код сохранения. Проверь и попробуй снова.");
    }
  };

  if (mode === "import") return (
    <div style={{ background:"#000", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:24 }}>
      <div style={{ maxWidth:380, width:"100%" }}>
        <div style={{ fontSize:8, letterSpacing:4, color:"#555", marginBottom:4 }}>YORHA ◈ ЗАГРУЗКА ДАННЫХ</div>
        <div style={{ fontSize:14, fontWeight:700, color:accent, letterSpacing:3, marginBottom:20 }}>ВВЕДИ КОД СОХРАНЕНИЯ</div>
        <div style={{ fontSize:9, color:"#555", marginBottom:12, lineHeight:1.8 }}>
          Вставь код который ты сохранил при последнем выходе.
        </div>
        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          placeholder="Вставь код сохранения сюда..."
          autoFocus
          style={{
            width:"100%", height:120, background:"#0a0a0a",
            border:"1px solid #333", color:"#888", fontSize:9,
            padding:12, resize:"none", outline:"none",
            fontFamily:"'Courier New',monospace", wordBreak:"break-all",
            marginBottom:8,
          }}
        />
        {importError && (
          <div style={{ fontSize:9, color:"#c44", marginBottom:12, lineHeight:1.6 }}>{importError}</div>
        )}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={handleImport} disabled={!importText.trim()}
            onMouseEnter={e=>{if(importText.trim()){e.target.style.background=accent;e.target.style.color="#000";}}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=importText.trim()?accent:"#333";}}
            style={{ flex:1, background:"transparent", border:"1px solid "+(importText.trim()?accent:"#333"), color:importText.trim()?accent:"#333", padding:"12px", fontSize:9, letterSpacing:3, cursor:importText.trim()?"pointer":"not-allowed", transition:"all 0.2s" }}>
            ЗАГРУЗИТЬ ◈
          </button>
          <button onClick={() => { setMode("main"); setImportError(""); }}
            onMouseEnter={e=>{e.target.style.borderColor="#888";e.target.style.color="#888";}}
            onMouseLeave={e=>{e.target.style.borderColor="#333";e.target.style.color="#555";}}
            style={{ background:"transparent", border:"1px solid #333", color:"#555", padding:"12px 16px", fontSize:9, cursor:"pointer", transition:"all 0.2s" }}>
            ←
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background:"#000", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:24 }}>
      <div style={{ maxWidth:380, width:"100%" }}>
        {/* Logo */}
        <div style={{ marginBottom:40, textAlign:"center" }}>
          <div style={{ fontSize:9, letterSpacing:4, color:"#444", marginBottom:8 }}>
            YORHA ◈ TACTICAL LOG
          </div>
          <div style={{ fontSize:28, fontWeight:700, letterSpacing:4, color:accent, marginBottom:6 }}>
            No.10 Type H
          </div>
          <div style={{ fontSize:9, letterSpacing:3, color:"#555" }}>
            ПРОТОКОЛ АКТИВАЦИИ
          </div>
          <div style={{ width:60, height:1, background:accent, margin:"16px auto 0", opacity:0.4 }}/>
        </div>

        {/* Buttons */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button onClick={() => setMode("import")}
            onMouseEnter={e=>{e.target.style.background=accent;e.target.style.color="#000";}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=accent;}}
            style={{ background:"transparent", border:"1px solid "+accent, color:accent, padding:"14px", fontSize:10, letterSpacing:3, cursor:"pointer", transition:"all 0.2s" }}>
            ◈ ЗАГРУЗИТЬ СОХРАНЕНИЕ
          </button>
          <button onClick={onNew}
            onMouseEnter={e=>{e.target.style.borderColor="#888";e.target.style.color="#888";}}
            onMouseLeave={e=>{e.target.style.borderColor="#333";e.target.style.color="#555";}}
            style={{ background:"transparent", border:"1px solid #333", color:"#555", padding:"14px", fontSize:10, letterSpacing:3, cursor:"pointer", transition:"all 0.2s" }}>
            ◇ НАЧАТЬ ЗАНОВО
          </button>
        </div>

        <div style={{ marginTop:24, fontSize:8, color:"#2a2a2a", textAlign:"center", lineHeight:1.8, letterSpacing:1 }}>
          Прогресс не сохраняется между сессиями.<br/>
          Используй экспорт сохранения перед выходом.
        </div>
      </div>
    </div>
  );
}

function Boot({ onDone }) {
  const [lines, setLines] = useState([]);
  const seq = ["YORHA TACTICAL LOG SYSTEM",">> инициализация памяти ........[OK]",">> загрузка боевых модулей .....[OK]",">> синхронизация директив ......[OK]",">> установка соединения ........[OK]","","glory to mankind.","","UNIT ONLINE — No.10 Type H"];
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      if (i < seq.length) { setLines(p => p.concat([seq[i]])); i++; }
      else { clearInterval(t); setTimeout(onDone, 500); }
    }, 180);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ position:"fixed", inset:0, background:"#000", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace" }}>
      <div style={{ width:340, padding:24 }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            color: (l||"").indexOf("UNIT ONLINE") >= 0 ? "#e8e0d0" : (l||"").indexOf("glory") >= 0 ? "#555" : "#444",
            fontSize: (l||"").indexOf("UNIT ONLINE") >= 0 ? 15 : 11,
            letterSpacing: (l||"").indexOf("UNIT ONLINE") >= 0 ? 3 : 1,
            marginBottom: l === "" ? 12 : 3,
            fontWeight: (l||"").indexOf("UNIT ONLINE") >= 0 ? 700 : 400,
          }}>{(l||"") || "\u00A0"}</div>
        ))}
        <span style={{ color:"#e8e0d0", animation:"blink 1s infinite" }}>_</span>
      </div>
    </div>
  );
}

function FwUpOverlay({ fw, accent }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9997, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:10 }}>
      <div style={{ fontSize:9, letterSpacing:4, color:"#555" }}>СИСТЕМНОЕ ОБНОВЛЕНИЕ</div>
      <div style={{ fontSize:32, fontWeight:700, letterSpacing:6, color:accent }}>v{fw}.0</div>
      <div style={{ fontSize:10, color:"#555", letterSpacing:3 }}>ПРОШИВКА ОБНОВЛЕНА</div>
    </div>
  );
}

function UnlockFormOverlay({ fid, onClose }) {
  const f = FORMS[fid] || FORMS.sentinel;
  const img = IMGS[fid] || IMGS.sentinel;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9990, background:"rgba(0,0,0,0.95)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"url("+img+")", backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"center", opacity:0.12 }}/>
      <div style={{ position:"relative", textAlign:"center", padding:24 }}>
        <div style={{ fontSize:8, letterSpacing:4, color:"#555", marginBottom:12 }}>НОВАЯ ФОРМА РАЗБЛОКИРОВАНА</div>
        <div style={{ fontSize:22, fontWeight:700, letterSpacing:4, color:f.accent, marginBottom:20, textShadow:"0 0 30px "+f.accent }}>{f.name}</div>
        <div style={{ width:180, height:240, margin:"0 auto 20px", backgroundImage:"url("+img+")", backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"center bottom", filter:"drop-shadow(0 0 24px "+f.accent+")" }}/>
        <div style={{ fontSize:10, color:"#666", maxWidth:280, lineHeight:1.8, margin:"0 auto 24px" }}>{f.desc}</div>
        <button onClick={onClose}
          onMouseEnter={e => { e.target.style.background = f.accent; e.target.style.color = "#000"; }}
          onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = f.accent; }}
          style={{ background:"transparent", border:"1px solid "+f.accent, color:f.accent, padding:"10px 32px", fontSize:9, letterSpacing:3, cursor:"pointer", transition:"all 0.2s" }}>
          ПРИНЯТЬ ◈
        </button>
      </div>
    </div>
  );
}

function GachaOverlay({ result, onClose }) {
  const rc = RARITY_COLORS[result.rarity] || "#888";
  const typeLabels = { title:"ТИТУЛ", color:"СХЕМА", lore:"АРХИВ", weapon:"ОРУЖИЕ" };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9995, background:"rgba(0,0,0,0.96)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace" }}>
      <div style={{ textAlign:"center", padding:32 }}>
        <div style={{ fontSize:8, letterSpacing:4, color:"#555", marginBottom:16 }}>АРХИВ ДАННЫХ — ИЗВЛЕЧЕНИЕ</div>
        <div style={{ fontSize:40, marginBottom:16 }}>{result.icon}</div>
        <div style={{ fontSize:10, color:rc, letterSpacing:3, marginBottom:8 }}>{result.rarity.toUpperCase()} · {typeLabels[result.type]}</div>
        <div style={{ fontSize:20, fontWeight:700, color:"#e8e0d0", letterSpacing:2, marginBottom:16 }}>{result.name}</div>
        <div style={{ fontSize:11, color:"#666", maxWidth:280, lineHeight:1.8, margin:"0 auto 32px", fontStyle: result.type === "lore" ? "italic" : "normal" }}>{result.desc}</div>
        <div style={{ width:60, height:1, background:rc, margin:"0 auto 24px", opacity:0.5 }}/>
        <button onClick={onClose}
          onMouseEnter={e => { e.target.style.background = rc; e.target.style.color = "#000"; }}
          onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = rc; }}
          style={{ background:"transparent", border:"1px solid "+rc, color:rc, padding:"10px 28px", fontSize:9, letterSpacing:3, cursor:"pointer", transition:"all 0.2s" }}>
          СОХРАНИТЬ В АРХИВ ◈
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════



function SaveManager({ state, onImport, onClose, accent }) {
  const [mode, setMode] = useState("main"); // main | export | import
  const [importText, setImportText] = useState("");
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState("");

  const exportData = () => {
    try {
      const data = JSON.stringify(state);
      const encoded = btoa(unescape(encodeURIComponent(data)));
      return encoded;
    } catch(e) { return ""; }
  };

  const handleCopy = () => {
    const data = exportData();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(data).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    } else {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = data;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImport = () => {
    try {
      setImportError("");
      const decoded = decodeURIComponent(escape(atob(importText.trim())));
      const parsed = JSON.parse(decoded);
      if (typeof parsed !== "object" || parsed === null) throw new Error("Неверный формат");
      onImport(parsed);
      onClose();
    } catch(e) {
      setImportError("Ошибка: неверный код сохранения");
    }
  };

  if (mode === "export") return (
    <div style={{ position:"fixed", inset:0, zIndex:9993, background:"rgba(0,0,0,0.93)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div style={{ background:"#080808", border:"1px solid #222", borderTop:"2px solid "+accent, maxWidth:400, width:"100%", padding:24 }}>
        <div style={{ fontSize:8, letterSpacing:4, color:"#555", marginBottom:4 }}>YORHA ◈ ЭКСПОРТ ДАННЫХ</div>
        <div style={{ fontSize:13, fontWeight:700, color:accent, letterSpacing:3, marginBottom:16 }}>КОД СОХРАНЕНИЯ</div>
        <div style={{ fontSize:9, color:"#555", marginBottom:12, lineHeight:1.8 }}>
          Скопируй этот код и сохрани в надёжном месте.<br/>
          Он содержит весь твой прогресс.
        </div>
        <textarea readOnly value={exportData()} style={{
          width:"100%", height:100, background:"#0a0a0a", border:"1px solid #222",
          color:"#555", fontSize:9, padding:10, resize:"none", outline:"none",
          fontFamily:"'Courier New',monospace", wordBreak:"break-all",
        }}/>
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button onClick={handleCopy}
            onMouseEnter={e=>{e.target.style.background=accent;e.target.style.color="#000";}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=copied?"#4a9":accent;}}
            style={{ flex:1, background:"transparent", border:"1px solid "+accent, color:copied?"#4a9":accent, padding:"10px", fontSize:9, letterSpacing:2, cursor:"pointer", transition:"all 0.2s" }}>
            {copied ? "✓ СКОПИРОВАНО" : "СКОПИРОВАТЬ ◈"}
          </button>
          <button onClick={() => setMode("main")}
            style={{ background:"transparent", border:"1px solid #333", color:"#555", padding:"10px 16px", fontSize:9, letterSpacing:1, cursor:"pointer" }}>
            ←
          </button>
        </div>
      </div>
    </div>
  );

  if (mode === "import") return (
    <div style={{ position:"fixed", inset:0, zIndex:9993, background:"rgba(0,0,0,0.93)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div style={{ background:"#080808", border:"1px solid #222", borderTop:"2px solid "+accent, maxWidth:400, width:"100%", padding:24 }}>
        <div style={{ fontSize:8, letterSpacing:4, color:"#555", marginBottom:4 }}>YORHA ◈ ИМПОРТ ДАННЫХ</div>
        <div style={{ fontSize:13, fontWeight:700, color:accent, letterSpacing:3, marginBottom:16 }}>ЗАГРУЗИТЬ СОХРАНЕНИЕ</div>
        <div style={{ fontSize:9, color:"#c44", marginBottom:12, lineHeight:1.8 }}>
          ⚠ Текущий прогресс будет заменён!
        </div>
        <textarea value={importText} onChange={e=>setImportText(e.target.value)}
          placeholder="Вставь код сохранения сюда..."
          style={{
            width:"100%", height:100, background:"#0a0a0a", border:"1px solid #333",
            color:"#888", fontSize:9, padding:10, resize:"none", outline:"none",
            fontFamily:"'Courier New',monospace", wordBreak:"break-all",
          }}/>
        {importError && <div style={{ fontSize:9, color:"#c44", marginTop:6 }}>{importError}</div>}
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button onClick={handleImport} disabled={!importText.trim()}
            onMouseEnter={e=>{if(importText.trim()){e.target.style.background=accent;e.target.style.color="#000";}}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=accent;}}
            style={{ flex:1, background:"transparent", border:"1px solid "+(importText.trim()?accent:"#333"), color:importText.trim()?accent:"#333", padding:"10px", fontSize:9, letterSpacing:2, cursor:importText.trim()?"pointer":"not-allowed", transition:"all 0.2s" }}>
            ЗАГРУЗИТЬ ◈
          </button>
          <button onClick={() => { setMode("main"); setImportError(""); }}
            style={{ background:"transparent", border:"1px solid #333", color:"#555", padding:"10px 16px", fontSize:9, letterSpacing:1, cursor:"pointer" }}>
            ←
          </button>
        </div>
      </div>
    </div>
  );

  // Main screen
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9993, background:"rgba(0,0,0,0.93)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div style={{ background:"#080808", border:"1px solid #222", borderTop:"2px solid "+accent, maxWidth:400, width:"100%", padding:24 }}>
        <button onClick={onClose} style={{ position:"absolute", top:12, right:12, background:"none", border:"none", color:"#444", fontSize:18, cursor:"pointer" }}>✕</button>
        <div style={{ fontSize:8, letterSpacing:4, color:"#555", marginBottom:4 }}>YORHA ◈ УПРАВЛЕНИЕ ДАННЫМИ</div>
        <div style={{ fontSize:13, fontWeight:700, color:accent, letterSpacing:3, marginBottom:20 }}>СОХРАНЕНИЯ</div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button onClick={() => setMode("export")}
            onMouseEnter={e=>{e.target.style.background=accent;e.target.style.color="#000";}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=accent;}}
            style={{ background:"transparent", border:"1px solid "+accent, color:accent, padding:"14px", fontSize:10, letterSpacing:3, cursor:"pointer", transition:"all 0.2s", textAlign:"left" }}>
            ◈ ЭКСПОРТ — сохранить прогресс
          </button>
          <button onClick={() => setMode("import")}
            onMouseEnter={e=>{e.target.style.borderColor="#c44";e.target.style.color="#c44";}}
            onMouseLeave={e=>{e.target.style.borderColor="#333";e.target.style.color="#666";}}
            style={{ background:"transparent", border:"1px solid #333", color:"#666", padding:"14px", fontSize:10, letterSpacing:3, cursor:"pointer", transition:"all 0.2s", textAlign:"left" }}>
            ◇ ИМПОРТ — загрузить сохранение
          </button>
        </div>

        <div style={{ marginTop:16, fontSize:9, color:"#333", lineHeight:1.8 }}>
          Экспорт создаёт код который можно сохранить в заметках.<br/>
          Импорт загружает прогресс с другого устройства.
        </div>
      </div>
    </div>
  );
}

function HelpPopup({ onClose, accent }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9996, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}
      onClick={onClose}>
      <div style={{ background:"#0a0a0a", border:"1px solid #222", borderTop:"2px solid "+accent, maxWidth:420, width:"100%", maxHeight:"85vh", overflowY:"auto", padding:24, position:"relative" }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position:"absolute", top:12, right:12, background:"none", border:"none", color:"#444", fontSize:18, cursor:"pointer", lineHeight:1 }}>✕</button>

        <div style={{ fontSize:8, letterSpacing:4, color:"#555", marginBottom:4 }}>YORHA ◈ СПРАВОЧНЫЙ АРХИВ</div>
        <div style={{ fontSize:14, fontWeight:700, color:accent, letterSpacing:3, marginBottom:20 }}>ПРОТОКОЛ 10H</div>

        {[
          { title:"◆ МИССИИ", body:"Запрашивай задания у командования. ИИ генерирует реальные дела под твои цели и экипированное оружие. Лимит: 3 генерации в день (сброс в полночь). Каждое нажатие кнопки даёт 3 миссии. Награда зависит от сложности: НИЗКАЯ → 20-30 MEM + 1◈, СРЕДНЯЯ → 40-55 MEM + 2-3◈, ВЫСОКАЯ → 65-80 MEM + 4-5◈. Кнопка ↺ на карточке перегенерирует миссию — доступно 3 раза, потом блокировка на 1 час." },
          { title:"◈ ПРОШИВКА", body:"Твой уровень. Заполняй шкалу Памяти выполняя миссии. На v5.0 открывается Abstract Savior, на v9.0 — Reborn Warden." },
          { title:"⚔ ОРУЖИЕ", body:"Влияет на стиль генерируемых миссий. Редкое оружие даёт бонус +10-30% к Памяти за совместимые задания. Надень оружие во вкладке Архив → Коллекция." },
          { title:"✦ АРХИВ (ГАЧА)", body:"Накопи 10 ◈ фрагментов и извлеки запись из архива. Можно получить: титулы (отображаются под именем), цветовые схемы (меняют весь интерфейс), оружие (влияет на миссии), лор-файлы (цитаты из вселенной NieR)." },
          { title:"◇ ЖУРНАЛ", body:"История выполненных миссий. В начале журнала появляется ежедневный факт из вселенной NieR:Automata — обновляется каждый день." },
          { title:"◈ РЕДКОСТЬ", body:"Обычный (60%) · Редкий (25%) · Эпический (12%) · Легендарный (3%). Дубликаты не теряются — предмет просто считается полученным." },
          { title:"📅 ЕЖЕДНЕВНАЯ НАГРАДА", body:"При первом входе каждый день появляется календарь недели. Нажми на награду чтобы забрать её. Каждый день даёт 2 ◈ фрагмента, 7-й день подряд — 5 ◈ + 15 MEM. Если пропустил день — просто получаешь награду следующего дня, неделя не сбрасывается." },
          { title:"💾 СОХРАНЕНИЯ", body:"Прогресс сохраняется автоматически в браузере (localStorage). Не очищай данные браузера — прогресс сотрётся." },
        ].map((s, i) => (
          <div key={i} style={{ marginBottom:16, paddingBottom:16, borderBottom:"1px solid #111" }}>
            <div style={{ fontSize:10, color:accent, letterSpacing:2, fontWeight:700, marginBottom:6 }}>{s.title}</div>
            <div style={{ fontSize:10, color:"#666", lineHeight:1.8 }}>{s.body}</div>
          </div>
        ))}

        <div style={{ fontSize:8, color:"#2a2a2a", letterSpacing:2, textAlign:"center", marginTop:8 }}>
          YoRHa No.10 Type H · Протокол активирован
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [S, setS]               = useState(() => mkState({}));
  const [showWelcome, setShowWelcome] = useState(true);
  const [booting, setBooting]   = useState(true);
  const [tab, setTab]           = useState("missions");
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);
  const [fwUp, setFwUp]         = useState(null);
  const [formUnlock, setFormUnlock] = useState(null);
  const [gachaResult, setGachaResult] = useState(null);
  const [dirIn, setDirIn]       = useState("");
  const [showHelp, setShowHelp]   = useState(false);
  const [showSave, setShowSave]   = useState(false);
  const [reportMission, setReportMission] = useState(null);
  const [dialogue, setDialogue] = useState(null);
  const [now, setNow]             = useState(() => Date.now());
  const [showDaily, setShowDaily] = useState(false);

  // Load from storage on mount - but welcome screen is shown first
  useEffect(() => {
    // Just load state silently, welcome screen handles the flow
    loadStateAsync().then(state => {
      setS(state);
    }).catch(() => {});
  }, []);

  // Clock for timers + expiry check + auto-reset reroll
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      setS(prev => {
        if (!prev) return prev;
        let next = { ...prev };
        let changed = false;
        // Remove expired missions
        if (Array.isArray(prev.missions)) {
          const valid = prev.missions.filter(m => !isMissionExpired(m, n));
          if (valid.length !== prev.missions.length) { next.missions = valid; changed = true; }
        }
        // Auto-reset reroll counter when 1 hour block expires
        if (prev.rerollCount >= 3 && prev.rerollBlock && n >= prev.rerollBlock) {
          next.rerollCount = 0;
          next.rerollBlock = 0;
          changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Save on change
  useEffect(() => { saveState(S); }, [S]);

  const toast$ = useCallback((msg, color) => {
    setToast({ msg, color: color || "#e8e0d0" });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const runChecks = useCallback((ns) => {
    // Achievements
    const achi = (Array.isArray(ns.achi) ? ns.achi : []).slice();
    const checks = [
      // Базовые
      { id:"b1",   icon:"◈",  t:"ПЕРВЫЙ ЗАПУСК",       ok: s => s.boots >= 1 },
      { id:"f5",   icon:"▲",  t:"ПРОШИВКА 5.0",        ok: s => s.fw >= 5 },
      { id:"f9",   icon:"★",  t:"ПРОШИВКА 9.0",        ok: s => s.fw >= 9 },
      { id:"ab",   icon:"●",  t:"ABSTRACT SAVIOR",     ok: s => inArr(s.unlocked, "abstract") },
      { id:"rb",   icon:"◉",  t:"REBORN WARDEN",       ok: s => inArr(s.unlocked, "reborn") },
      // Миссии
      { id:"m1",   icon:"◆",  t:"БОЕВОЕ КРЕЩЕНИЕ",     ok: s => (s.completed||[]).length >= 1 },
      { id:"m5",   icon:"◆",  t:"СЕРИЙНЫЙ БОЕЦ",       ok: s => (s.completed||[]).length >= 5 },
      { id:"m10",  icon:"◆",  t:"ВЕТЕРАН",             ok: s => (s.completed||[]).length >= 10 },
      { id:"m25",  icon:"◆",  t:"ЭЛИТНЫЙ ОПЕРАТИВНИК", ok: s => (s.completed||[]).length >= 25 },
      { id:"m50",  icon:"◆",  t:"ЛЕГЕНДА YoRHa",       ok: s => (s.completed||[]).length >= 50 },
      { id:"ev1",  icon:"⚠",  t:"ЭКСТРЕННЫЙ ОТКЛИК",   ok: s => (s.completed||[]).some(m => m.isEvent) },
      { id:"rp1",  icon:"◇",  t:"ХРОНИКЁР",            ok: s => (s.completed||[]).some(m => m.report) },
      { id:"d3",   icon:"◈",  t:"ИНТЕНСИВНЫЙ ДЕНЬ",    ok: s => { const today = todayStr(); return (s.completed||[]).filter(m => m.at && new Date(m.at).toISOString().slice(0,10) === today).length >= 3; } },
      // Прогресс
      { id:"fr50", icon:"◈",  t:"КОЛЛЕКЦИОНЕР",        ok: s => (s.totalFragsEarned||0) >= 50 },
      { id:"fr100",icon:"◈",  t:"АРХИВАРИУС",          ok: s => (s.totalFragsEarned||0) >= 100 },
      { id:"w7",   icon:"◈",  t:"НЕДЕЛЬНЫЙ ПРОТОКОЛ",  ok: s => (s.weekDays||[]).filter(Boolean).length >= 7 },
      // Характеристики
      { id:"cog5", icon:"◆",  t:"АНАЛИТИК",            ok: s => (s.cog||0) >= 5 },
      { id:"cog10",icon:"◆",  t:"СУПЕРКОМПЬЮТЕР",      ok: s => (s.cog||0) >= 10 },
      { id:"syn5", icon:"◆",  t:"ТВОРЧЕСКИЙ СИНТЕЗ",   ok: s => (s.syn||0) >= 5 },
      { id:"syn10",icon:"◆",  t:"МАСТЕР СИНТЕЗА",      ok: s => (s.syn||0) >= 10 },
      // Гача
      { id:"g1",   icon:"▲",  t:"ПЕРВОЕ ИЗВЛЕЧЕНИЕ",   ok: s => (s.inventory||[]).length >= 1 },
      { id:"ep1",  icon:"▲",  t:"ЭПИЧЕСКИЙ АРХИВ",     ok: s => (s.inventory||[]).some(id => { const item = GACHA_POOL.find(i => i.id === id); return item && item.rarity === "epic"; }) },
      { id:"lg1",  icon:"★",  t:"ЛЕГЕНДАРНЫЙ АРХИВ",   ok: s => (s.inventory||[]).some(id => { const item = GACHA_POOL.find(i => i.id === id); return item && item.rarity === "legendary"; }) },
      { id:"lor",  icon:"◇",  t:"ХРАНИТЕЛЬ ИСТОРИИ",   ok: s => GACHA_POOL.filter(i => i.type==="lore").every(i => inArr(s.inventory||[], i.id)) },
      { id:"wpn",  icon:"◇",  t:"АРСЕНАЛ YoRHa",       ok: s => GACHA_POOL.filter(i => i.type==="weapon").every(i => inArr(s.inventory||[], i.id)) },
      { id:"eq3",  icon:"★",  t:"ПОЛНАЯ ЭКИПИРОВКА",   ok: s => !!(s.equipped && s.equipped.title && s.equipped.color && s.equipped.weapon) },
      // Секретные
      { id:"ngt",  icon:"◈",  t:"НОЧНАЯ СТРАЖА",       ok: s => { const h = new Date().getHours(); return s.boots > 1 && h >= 0 && h < 4; } },
      { id:"spd",  icon:"★",  t:"МОЛНИЕНОСНЫЙ ОТКЛИК", ok: s => (s.completed||[]).some(m => m.isEvent && m.at && m.createdAt && (m.at - m.createdAt) <= 1800000) },
    ];
    for (const c of checks) {
      if (!inArr(achi, c.id) && c.ok(ns)) {
        achi.push(c.id);
        setTimeout(() => toast$(c.icon + " " + c.t, "#c8a882"), 900);
      }
    }
    ns = { ...ns, achi };
    // Form unlocks
    const unl = (Array.isArray(ns.unlocked) ? ns.unlocked : ["sentinel"]).slice();
    let nf = null;
    if (ns.fw >= 5 && !inArr(unl, "abstract")) { unl.push("abstract"); nf = "abstract"; }
    if (ns.fw >= 9 && !inArr(unl, "reborn"))   { unl.push("reborn");   nf = "reborn"; }
    if (nf) {
      ns = { ...ns, unlocked: unl, form: nf };
      setTimeout(() => setFormUnlock(nf), 600);
    }
    return ns;
  }, [toast$]);

  const completeMission = useCallback((m, report) => {
    setS(prev => {
      // Reward based on threat level
      const reward = rewardByThreat(m.threat);
      if (m.isEvent) { reward.memory = Math.round(reward.memory * 2); reward.frags = reward.frags * 2; }
      // Weapon bonus
      const wid = prev.equipped && prev.equipped.weapon;
      const ws = wid ? WEAPON_STYLES[wid] : null;
      let memBonus = 0;
      if (ws) {
        if (ws.bonus === "both") memBonus = Math.round(reward.memory * ws.bonusPct / 100);
        else if (ws.bonus === m.spec) memBonus = Math.round(reward.memory * ws.bonusPct / 100);
      }
      const totalMem = reward.memory + memBonus;
      // Apply memory
      let mem = prev.mem + totalMem;
      let fw = prev.fw;
      let memMax = prev.memMax;
      let levelsGained = 0;
      const levelsReached = [];
      while (mem >= memMax) { mem -= memMax; fw++; memMax = xpFor(fw); levelsGained++; levelsReached.push(fw); }
      const up = levelsGained > 0;
      // Level-up fragment rewards: 20 for form-unlock levels (5, 9), 10 for all others
      let levelFrags = 0;
      for (const lvl of levelsReached) {
        levelFrags += (lvl === 5 || lvl === 9) ? 20 : 10;
      }
      const cog = m.spec === "intellect" ? Math.min(10, prev.cog + 1) : prev.cog;
      const syn = m.spec === "creativity" ? Math.min(10, prev.syn + 1) : prev.syn;
      const frags = prev.frags + reward.frags + levelFrags;
      const totalFragsEarned = (prev.totalFragsEarned || 0) + reward.frags + levelFrags;
      const bonusStr = memBonus > 0 ? ` (+${memBonus}⚔)` : "";
      const entry = {
        time: new Date().toLocaleTimeString("ru"),
        text: m.title + " [+" + totalMem + bonusStr + " MEM, +" + reward.frags + " ◈]",
        report: report || null,
        threat: m.threat,
      };
      let ns = {
        ...prev,
        fw, mem, memMax, cog, syn, frags, totalFragsEarned,
        log: [entry, ...(prev.log || [])].slice(0, 30),
        missions: (prev.missions || []).filter(x => x.id !== m.id),
        completed: [{ ...m, at: Date.now() }, ...(prev.completed || [])],
      };
      ns = runChecks(ns);
      if (up) {
        setTimeout(() => { setFwUp(fw); setTimeout(() => setFwUp(null), 2800); }, 300);
        setTimeout(() => showDialogue("levelUp", { fw }), 3200);
        const isFormUnlock = levelsReached.some(lvl => lvl === 5 || lvl === 9);
        const fragRewardMsg = isFormUnlock
          ? "НОВАЯ ФОРМА · +" + levelFrags + " ◈"
          : "+" + levelFrags + " ◈ ЗА УРОВЕНЬ";
        setTimeout(() => toast$(fragRewardMsg, "#c8a882"), 3400);
      }
      const bonusMsg = memBonus > 0 ? ` +${memBonus}⚔` : "";
      toast$("+" + totalMem + bonusMsg + " MEM  +" + reward.frags + " ◈", "#4a9");
      return ns;
    });
  }, [runChecks, toast$]);

  const doGacha = useCallback(() => {
    if (S.frags < 10) { toast$("Нужно 10 ◈ фрагментов", "#c44"); return; }
    const result = pullGacha();
    setS(prev => {
      const inv = [...(prev.inventory||[])];
      if (!inArr(inv, result.id)) inv.push(result.id);
      let ns = { ...prev, frags: prev.frags - 10, inventory: inv };
      ns = runChecks(ns);
      return ns;
    });
    setGachaResult(result);
    setTimeout(() => showDialogue("gacha"), 200);
  }, [S.frags, toast$, runChecks]);

  const showDialogue = (type, params) => {
    const text = getDialogue(type, params);
    if (!text) return;
    setDialogue({ text, id: Date.now() });
  };

  const startNew = () => {
    setS(mkState({}));
    setShowWelcome(false);
    setTimeout(() => setShowDaily(true), 2000);
    setTimeout(() => showDialogue("login"), 3500);
  };

  const loadSave = (raw) => {
    try {
      const newState = mkState(raw);
      const today = todayStr();
      setS(newState);
      saveState(newState);
      setShowWelcome(false);
      setTimeout(() => showDialogue("login"), 1500);
      if (newState.lastLogin !== today || !newState.loginClaimed) {
        setTimeout(() => setShowDaily(true), 2000);
      }
    } catch(e) {
      toast$("ОШИБКА ЗАГРУЗКИ", "#c44");
    }
  };

  const importSave = (raw) => {
    try {
      const newState = mkState(raw);
      setS(newState);
      saveState(newState);
      toast$("СОХРАНЕНИЕ ЗАГРУЖЕНО ◈", "#4a9");
    } catch(e) {
      toast$("ОШИБКА ИМПОРТА", "#c44");
    }
  };

  const claimDaily = () => {
    const today = todayStr();
    const weekStart = getWeekStartStr();
    const currentDay = getWeekDay();
    const reward = WEEK_REWARDS[currentDay];
    const isNewWeek = S.weekStart !== weekStart;
    const weekDays = isNewWeek
      ? [false,false,false,false,false,false,false]
      : [...(S.weekDays || [false,false,false,false,false,false,false])];
    weekDays[currentDay] = true;

    setS(prev => {
      let mem = prev.mem + reward.mem;
      let fw = prev.fw;
      let memMax = prev.memMax;
      while (mem >= memMax) { mem -= memMax; fw++; memMax = xpFor(fw); }
      return {
        ...prev,
        frags: prev.frags + reward.frags,
        totalFragsEarned: (prev.totalFragsEarned || 0) + reward.frags,
        mem, fw, memMax,
        weekDays,
        weekStart,
        lastLogin: today,
        loginClaimed: true,
      };
    });
    toast$("+" + reward.frags + " ◈" + (reward.mem > 0 ? "  +" + reward.mem + " MEM" : ""), "#c8a882");
    setTimeout(() => showDialogue("dailyReward", { day: currentDay + 1 }), 300);
    setShowDaily(false);
  };

  const fetchMissions = () => {
    const today = todayStr();
    const genToday = S.genDate === today ? S.genToday : 0;
    if (genToday >= 3) { toast$("ЛИМИТ ГЕНЕРАЦИЙ ИСЧЕРПАН", "#c44"); return; }
    try {
      const weaponId = S.equipped && S.equipped.weapon ? S.equipped.weapon : null;
      const ms = genMissions(weaponId);
      const now = Date.now();
      const wid = ms.map((m, i) => {
        const isEvent = m.isEvent || false;
        const lifetime = missionLifetime(m.threat, isEvent);
        return {
          ...m,
          id: "m" + now + i,
          isEvent,
          expiresAt: now + lifetime,
          createdAt: now,
        };
      });
      setS(p => ({
        ...p,
        missions: [...(p.missions||[]), ...wid],
        genToday: (p.genDate === today ? p.genToday : 0) + 1,
        genDate: today,
      }));
      toast$("ЗАДАНИЯ ПОЛУЧЕНЫ ▶");
      if (wid.some(m => m.isEvent)) setTimeout(() => showDialogue("missionEvent"), 800);
    } catch(e) {
      console.error("Mission error:", e.message, e.stack);
      toast$("ОШИБКА: " + e.message.slice(0,40), "#c44");
    }
  };

  const handleDone = (m) => {
    if (m.threat === "НИЗКАЯ") {
      completeMission(m, null);
      setTimeout(() => showDialogue("missionComplete", { threat: m.threat }), 500);
    } else {
      setReportMission(m);
    }
  };

  const rerollMission = (missionId) => {
    const now = Date.now();
    if (S.rerollCount >= 3 && S.rerollBlock && now < S.rerollBlock) {
      const left = S.rerollBlock - now;
      toast$("ПЕРЕГЕНЕРАЦИЯ: ещё " + fmtTime(left), "#c44");
      return;
    }
    const newCount = (S.rerollBlock && now >= S.rerollBlock) ? 0 : S.rerollCount;
    if (newCount >= 3) {
      toast$("ЛИМИТ ПЕРЕГЕНЕРАЦИИ ИСЧЕРПАН", "#c44");
      return;
    }
    const mission = (S.missions||[]).find(m => m.id === missionId);
    if (!mission) return;
    try {
      const weaponId = S.equipped && S.equipped.weapon ? S.equipped.weapon : null;
      const ms = genMissions(weaponId);
      const rerollNow = Date.now();
      const picked = ms[0];
      const isEvent = picked.isEvent || false;
      const lifetime = missionLifetime(picked.threat, isEvent);
      const newM = { ...picked, id: missionId, isEvent, expiresAt: rerollNow + lifetime, createdAt: rerollNow };
      const newCount2 = newCount + 1;
      setS(p => ({
        ...p,
        missions: (p.missions||[]).map(m => m.id === missionId ? newM : m),
        rerollCount: newCount2,
        rerollBlock: newCount2 >= 3 ? Date.now() + 3600000 : p.rerollBlock,
      }));
      toast$("МИССИЯ ОБНОВЛЕНА ◈");
    } catch(e) {
      toast$("ОШИБКА ПЕРЕГЕНЕРАЦИИ", "#c44");
    }
  };

  if (showWelcome) return <WelcomeScreen onNew={startNew} onLoad={loadSave} accent={"#8888cc"} />;
  if (booting) return <Boot onDone={() => setBooting(false)} />;

  const fid    = (typeof S.form === "string" && FORMS[S.form]) ? S.form : "sentinel";
  const form   = FORMS[fid];
  const img    = IMGS[fid];
  const equippedColorItem = S.equipped && S.equipped.color ? GACHA_POOL.find(i => i.id === S.equipped.color) : null;
  const A      = (equippedColorItem && equippedColorItem.value) ? equippedColorItem.value : form.accent;
  const missions  = (S.missions || []).sort((a,b) => (b.isEvent?1:0) - (a.isEvent?1:0));
  const completed = S.completed || [];
  const dirs      = S.dirs      || [];
  const log       = S.log       || [];
  const achi      = S.achi      || [];
  const unlocked  = S.unlocked  || ["sentinel"];
  const inventory = S.inventory || [];

  const equippedTitle  = S.equipped && S.equipped.title  ? GACHA_POOL.find(i => i.id === S.equipped.title)  : null;
  const equippedWeapon = S.equipped && S.equipped.weapon ? GACHA_POOL.find(i => i.id === S.equipped.weapon) : null;

  return (
    <div style={{ background:"#000", minHeight:"100vh", fontFamily:"'Courier New',monospace", color:"#e8e0d0", maxWidth:480, margin:"0 auto", position:"relative" }}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes eventPulse{0%,100%{box-shadow:0 0 12px #cc000033}50%{box-shadow:0 0 20px #cc000066}}
        @keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes glow{0%,100%{opacity:0.6}50%{opacity:1}}
        *{box-sizing:border-box}
        input::placeholder{color:#222;font-family:'Courier New',monospace}
        button{font-family:'Courier New',monospace;cursor:pointer}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#000}
        ::-webkit-scrollbar-thumb{background:#222}
      `}</style>

      {/* Background character */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-20, bottom:0, width:360, height:"92vh", backgroundImage:"url("+img+")", backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"bottom right", opacity:0.07, transition:"all 1.2s ease" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,#000 30%,transparent 70%,#000 100%)" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,#000 0%,transparent 10%,transparent 80%,#000 100%)" }}/>
      </div>
      <div style={{ position:"fixed", inset:0, zIndex:1, pointerEvents:"none", background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.04) 2px,rgba(0,0,0,0.04) 4px)" }}/>

      {/* Overlays */}
      {toast && <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:"#000", border:"1px solid "+toast.color, color:toast.color, padding:"7px 20px", fontSize:10, letterSpacing:2, zIndex:9998, animation:"slideDown 0.3s ease", whiteSpace:"nowrap" }}>{toast.msg}</div>}
      {fwUp && <FwUpOverlay fw={fwUp} accent={A} />}
      {formUnlock && <UnlockFormOverlay fid={formUnlock} onClose={() => setFormUnlock(null)} />}
      {gachaResult && <GachaOverlay result={gachaResult} onClose={() => setGachaResult(null)} />}
      {showDaily && <DailyRewardPopup state={S} onClaim={claimDaily} onClose={() => setShowDaily(false)} accent={A} />}
      {showHelp && <HelpPopup onClose={() => setShowHelp(false)} accent={A} />}
      {showSave && <SaveManager state={S} onImport={importSave} onClose={() => setShowSave(false)} accent={A} />}
      {dialogue && <DialoguePopup key={dialogue.id} text={dialogue.text} formId={fid} onClose={() => setDialogue(null)} />}
      {reportMission && <ReportModal
        mission={reportMission}
        accent={A}
        onConfirm={(report) => { completeMission(reportMission, report); setReportMission(null); setTimeout(() => showDialogue("missionComplete", { threat: reportMission.threat }), 500); }}
        onCancel={() => setReportMission(null)}
      />}

      {/* Help button */}
      <div style={{ position:"fixed", bottom:20, right:16, zIndex:20, display:"flex", flexDirection:"column", gap:8 }}>
        <button onClick={() => setShowSave(true)}
          style={{ background:"#0a0a0a", border:"1px solid #333", color:"#666", width:36, height:36, borderRadius:"50%", fontSize:12, cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center" }}
          onMouseEnter={e => { e.target.style.borderColor=A; e.target.style.color=A; }}
          onMouseLeave={e => { e.target.style.borderColor="#333"; e.target.style.color="#666"; }}
          title="Управление сохранениями">💾</button>
        <button onClick={() => setShowHelp(true)}
          style={{ background:"#0a0a0a", border:"1px solid #333", color:"#666", width:36, height:36, borderRadius:"50%", fontSize:14, fontWeight:700, cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center" }}
          onMouseEnter={e => { e.target.style.borderColor=A; e.target.style.color=A; }}
          onMouseLeave={e => { e.target.style.borderColor="#333"; e.target.style.color="#666"; }}
          title="Справка">?</button>
      </div>

      <div style={{ position:"relative", zIndex:2 }}>

        {/* ── HEADER ── */}
        <div style={{ borderBottom:"1px solid #111", padding:"16px 16px 14px", background:"rgba(0,0,0,0.9)", position:"relative" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,"+A+"55 35%,"+A+"55 65%,transparent)" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div>
              <div style={{ fontSize:8, letterSpacing:3, color:"#444", marginBottom:3 }}>YORHA ◈ TACTICAL LOG</div>
              <div style={{ fontSize:16, fontWeight:700, letterSpacing:3, color:A, transition:"color 0.8s" }}>No.10 Type H</div>
              <div style={{ fontSize:8, color:"#555", letterSpacing:2, marginTop:2 }}>
                {form.name}
                {equippedTitle ? <span style={{ color:"#888" }}> · {equippedTitle.name}</span> : null}
              </div>
              {equippedWeapon && <div style={{ fontSize:8, color:"#444", marginTop:2 }}>⚔ {equippedWeapon.name}</div>}
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:8, letterSpacing:2, color:"#444" }}>ПРОШИВКА</div>
              <div style={{ fontSize:22, fontWeight:700, color:A, letterSpacing:2 }}>v{S.fw}.0</div>
              <div style={{ fontSize:8, color:"#555" }}>
                <span style={{ color:"#c8a882" }}>◈ {S.frags}</span>
                <span style={{ color:"#444" }}> · </span>
                <span>{completed.length} МИССИЙ</span>
              </div>
            </div>
          </div>
          <MemBar mem={S.mem} max={S.memMax} accent={A} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:12 }}>
            {[{abbr:"COG",label:"КОГНИТИВ",val:S.cog,color:"#8888cc"},{abbr:"SYN",label:"СИНТЕЗ",val:S.syn,color:"#c8a882"}].map(sp => (
              <div key={sp.abbr}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, letterSpacing:2, marginBottom:2 }}>
                  <span style={{ color:"#555" }}>[{sp.abbr}] {sp.label}</span>
                  <span style={{ color:sp.color }}>{String(sp.val).padStart(2,"0")}/10</span>
                </div>
                <div style={{ height:2, background:"#0a0a0a" }}>
                  <div style={{ height:"100%", width:(sp.val*10)+"%", background:sp.color, transition:"width 0.6s" }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display:"flex", background:"rgba(0,0,0,0.9)", borderBottom:"1px solid #111", position:"sticky", top:0, zIndex:10 }}>
          {[["missions","◆ МИССИИ"],["unit","◈ ЮНИТ"],["gacha","✦ АРХИВ"],["log","◇ ЖУРНАЛ"]].map(([id,l]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, padding:"10px 2px", border:"none", background:"transparent", color:tab===id?"#e8e0d0":"#333", borderBottom:"1px solid "+(tab===id?A:"transparent"), fontSize:7, letterSpacing:1, transition:"all 0.2s" }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ padding:"16px 16px 80px" }}>

          {/* ── MISSIONS TAB ── */}
          {tab === "missions" && (
            <div>
              {(() => {
                const today = todayStr();
                const genToday = S.genDate === today ? S.genToday : 0;
                const gensLeft = 3 - genToday;
                const limitReached = gensLeft <= 0;
                const msLeft = limitReached ? msToMidnight() : 0;
                const rerollsLeft = Math.max(0, 3 - ((S.rerollBlock && now < S.rerollBlock) ? 3 : S.rerollCount));
                const rerollBlocked = S.rerollCount >= 3 && S.rerollBlock && now < S.rerollBlock;
                const rerollTimeLeft = rerollBlocked ? S.rerollBlock - now : 0;
                return (
                  <>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <div style={{ fontSize:8, color:"#555", letterSpacing:2 }}>
                        ГЕНЕРАЦИЙ СЕГОДНЯ: <span style={{ color: gensLeft>0?A:"#c44" }}>{genToday}/3</span>
                      </div>
                      {rerollBlocked && (
                        <div style={{ fontSize:8, color:"#c44", letterSpacing:1 }}>
                          ↺ разблок: {fmtTime(rerollTimeLeft)}
                        </div>
                      )}
                      {!rerollBlocked && rerollsLeft < 3 && (
                        <div style={{ fontSize:8, color:"#555", letterSpacing:1 }}>
                          ↺ осталось: {rerollsLeft}
                        </div>
                      )}
                    </div>
                    <button onClick={fetchMissions} disabled={loading || limitReached}
                      onMouseEnter={e => { if(!loading&&!limitReached){ e.target.style.background=A; e.target.style.color="#000"; } }}
                      onMouseLeave={e => { e.target.style.background="transparent"; e.target.style.color=(loading||limitReached)?"#333":A; }}
                      style={{ width:"100%", marginBottom:14, background:"transparent", border:"1px solid "+((loading||limitReached)?"#222":A), color:(loading||limitReached)?"#333":A, padding:"12px", fontSize:9, letterSpacing:3, transition:"all 0.3s", cursor:(loading||limitReached)?"not-allowed":"pointer" }}>
                      {loading ? ">> ПОЛУЧЕНИЕ ДАННЫХ С БУНКЕРА..."
                        : limitReached ? ">> ЛИМИТ ИСЧЕРПАН · СБРОС: " + fmtTime(msLeft)
                        : ">> ЗАПРОСИТЬ ЗАДАНИЯ У КОМАНДОВАНИЯ [" + gensLeft + "]"}
                    </button>
                    {missions.map(m => <MCard key={m.id} m={m} accent={A} onDone={handleDone}
                      onReroll={rerollMission} rerollsLeft={rerollsLeft} rerollBlocked={rerollBlocked} now={now} />)}
                  </>
                );
              })()}
              {missions.length === 0 && !loading && (
                <div style={{ textAlign:"center", padding:"44px 0", color:"#222" }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>◆</div>
                  <div style={{ fontSize:9, letterSpacing:2 }}>НЕТ АКТИВНЫХ МИССИЙ</div>
                  <div style={{ fontSize:9, color:"#1a1a1a", marginTop:6 }}>Запроси задания у командования</div>
                </div>
              )}
              {completed.length > 0 && (
                <div style={{ marginTop:20 }}>
                  <div style={{ fontSize:8, color:"#222", letterSpacing:3, marginBottom:8, borderTop:"1px solid #0d0d0d", paddingTop:12 }}>АРХИВ ВЫПОЛНЕННЫХ [{completed.length}]</div>
                  {completed.slice(0,5).map((m,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #0a0a0a", fontSize:9, color:"#2a2a2a" }}>
                      <span>◇ {m.title}</span>
                      <span style={{ color:"#4a9" }}>+{m.memory}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── UNIT TAB ── */}
          {tab === "unit" && (
            <div>
              <div style={{ fontSize:8, letterSpacing:3, color:"#444", marginBottom:8 }}>АКТИВНАЯ ФОРМА</div>
              <div style={{ position:"relative", border:"1px solid "+A+"33", borderTop:"2px solid "+A, marginBottom:20, overflow:"hidden" }}>
                <div style={{ height:320, backgroundImage:"url("+img+")", backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"center bottom", filter:"drop-shadow(0 0 28px "+A+"33)", transition:"all 0.8s" }}/>
                <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"12px 16px", background:"linear-gradient(0deg,#000 65%,transparent)" }}>
                  <div style={{ fontSize:8, color:"#444", letterSpacing:3, marginBottom:3 }}>YoRHa No.10 Type H</div>
                  <div style={{ fontSize:14, color:A, letterSpacing:3, fontWeight:700 }}>{form.name}</div>
                  <div style={{ fontSize:9, color:"#555", marginTop:4, lineHeight:1.6 }}>{form.desc}</div>
                </div>
              </div>

              <div style={{ fontSize:8, letterSpacing:3, color:"#444", marginBottom:8 }}>КОЛЛЕКЦИЯ ФОРМ</div>
              {["sentinel","abstract","reborn"].map(id => {
                const f = FORMS[id];
                const unl = inArr(unlocked, id);
                const isAct = fid === id;
                return (
                  <div key={id} onClick={() => unl && setS(p => ({ ...p, form: id }))}
                    style={{ display:"flex", gap:12, alignItems:"center", padding:"10px 12px", marginBottom:6, border:"1px solid "+(isAct?f.accent:"#1a1a1a"), background:isAct?"#0d0d0d":"#050505", opacity:unl?1:0.3, cursor:unl?"pointer":"default", transition:"all 0.2s" }}>
                    <div style={{ width:48, height:64, backgroundImage:unl?"url("+IMGS[id]+")":"none", backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"center bottom", background:unl?"none":"#0a0a0a", border:unl?"none":"1px solid #111", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {!unl && <span style={{ fontSize:18, color:"#555" }}>◈</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:10, color:unl?f.accent:"#555", letterSpacing:2, fontWeight:700 }}>{f.name}</div>
                      <div style={{ fontSize:9, color:unl?"#3a3a3a":"#555", marginTop:3 }}>{unl ? f.desc.slice(0,50)+"…" : "ЗАКРЫТО — v"+f.unlockFw+".0"}</div>
                    </div>
                    {isAct && <span style={{ color:f.accent, fontSize:14 }}>◈</span>}
                  </div>
                );
              })}

              <div style={{ marginTop:16, fontSize:8, letterSpacing:3, color:"#444", marginBottom:4 }}>
                ДОСТИЖЕНИЯ <span style={{color:"#555"}}>({achi.length}/28)</span>
              </div>
              {[
                {id:"b1",  icon:"◈", t:"ПЕРВЫЙ ЗАПУСК"},
                {id:"f5",  icon:"▲", t:"ПРОШИВКА 5.0"},
                {id:"f9",  icon:"★", t:"ПРОШИВКА 9.0"},
                {id:"ab",  icon:"●", t:"ABSTRACT SAVIOR"},
                {id:"rb",  icon:"◉", t:"REBORN WARDEN"},
                {id:"m1",  icon:"◆", t:"БОЕВОЕ КРЕЩЕНИЕ"},
                {id:"m5",  icon:"◆", t:"СЕРИЙНЫЙ БОЕЦ"},
                {id:"m10", icon:"◆", t:"ВЕТЕРАН"},
                {id:"m25", icon:"◆", t:"ЭЛИТНЫЙ ОПЕРАТИВНИК"},
                {id:"m50", icon:"◆", t:"ЛЕГЕНДА YoRHa"},
                {id:"ev1", icon:"⚠", t:"ЭКСТРЕННЫЙ ОТКЛИК"},
                {id:"rp1", icon:"◇", t:"ХРОНИКЁР"},
                {id:"d3",  icon:"◈", t:"ИНТЕНСИВНЫЙ ДЕНЬ"},
                {id:"fr50",icon:"◈", t:"КОЛЛЕКЦИОНЕР"},
                {id:"fr100",icon:"◈",t:"АРХИВАРИУС"},
                {id:"w7",  icon:"◈", t:"НЕДЕЛЬНЫЙ ПРОТОКОЛ"},
                {id:"cog5",icon:"◆", t:"АНАЛИТИК"},
                {id:"cog10",icon:"◆",t:"СУПЕРКОМПЬЮТЕР"},
                {id:"syn5",icon:"◆", t:"ТВОРЧЕСКИЙ СИНТЕЗ"},
                {id:"syn10",icon:"◆",t:"МАСТЕР СИНТЕЗА"},
                {id:"g1",  icon:"▲", t:"ПЕРВОЕ ИЗВЛЕЧЕНИЕ"},
                {id:"ep1", icon:"▲", t:"ЭПИЧЕСКИЙ АРХИВ"},
                {id:"lg1", icon:"★", t:"ЛЕГЕНДАРНЫЙ АРХИВ"},
                {id:"lor", icon:"◇", t:"ХРАНИТЕЛЬ ИСТОРИИ"},
                {id:"wpn", icon:"◇", t:"АРСЕНАЛ YoRHa"},
                {id:"eq3", icon:"★", t:"ПОЛНАЯ ЭКИПИРОВКА"},
                {id:"ngt", icon:"◈", t:"НОЧНАЯ СТРАЖА"},
                {id:"spd", icon:"★", t:"МОЛНИЕНОСНЫЙ ОТКЛИК"},
              ].map(a => {
                const e = inArr(achi, a.id);
                return (
                  <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", marginBottom:5, border:"1px solid "+(e?"#333":"#111"), background:e?"#0a0a0a":"#050505" }}>
                    <span style={{ fontSize:14, color:e?"#e8e0d0":"#2a2a2a" }}>{a.icon}</span>
                    <span style={{ fontSize:10, color:e?"#888":"#3a3a3a", letterSpacing:1 }}>{a.t}</span>
                    {e && <span style={{ marginLeft:"auto", color:A, fontSize:10 }}>✓</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── GACHA TAB ── */}
          {tab === "gacha" && (
            <div>
              {/* Pull button */}
              <div style={{ border:"1px solid #1a1a1a", borderTop:"2px solid "+A, padding:20, marginBottom:20, textAlign:"center" }}>
                <div style={{ fontSize:8, letterSpacing:3, color:"#555", marginBottom:8 }}>АРХИВ ДАННЫХ YoRHa</div>
                <div style={{ fontSize:11, color:"#888", lineHeight:1.8, marginBottom:16 }}>
                  За каждую выполненную миссию ты получаешь<br/>
                  <span style={{ color:"#c8a882" }}>◈ фрагменты данных</span>. Накопи 10 — и извлеки запись из архива.
                </div>
                <div style={{ fontSize:28, color:"#c8a882", marginBottom:4 }}>◈ {S.frags}</div>
                <div style={{ fontSize:9, color:"#444", marginBottom:20 }}>фрагментов накоплено</div>
                <div style={{ height:4, background:"#111", borderRadius:2, marginBottom:20, overflow:"hidden" }}>
                  <div style={{ height:"100%", width: Math.min(100, (S.frags % 10) * 10) + "%", background: A, transition:"width 0.4s" }}/>
                </div>
                <button onClick={doGacha} disabled={S.frags < 10}
                  onMouseEnter={e => { if(S.frags>=10){ e.target.style.background=A; e.target.style.color="#000"; } }}
                  onMouseLeave={e => { e.target.style.background="transparent"; e.target.style.color=S.frags<10?"#333":A; }}
                  style={{ background:"transparent", border:"1px solid "+(S.frags<10?"#222":A), color:S.frags<10?"#333":A, padding:"12px 32px", fontSize:10, letterSpacing:3, transition:"all 0.3s" }}>
                  {S.frags < 10 ? "НЕДОСТАТОЧНО ФРАГМЕНТОВ" : "✦ ИЗВЛЕЧЬ ИЗ АРХИВА (-10 ◈)"}
                </button>
              </div>

              {/* Inventory */}
              {inventory.length > 0 && (
                <div>
                  <div style={{ fontSize:8, letterSpacing:3, color:"#444", marginBottom:10 }}>КОЛЛЕКЦИЯ [{inventory.length}]</div>
                  {GACHA_POOL.filter(item => inArr(inventory, item.id)).map(item => {
                    const rc = RARITY_COLORS[item.rarity] || "#888";
                    const typeLabels = { title:"ТИТУЛ", color:"СХЕМА", lore:"АРХИВ", weapon:"ОРУЖИЕ" };
                    const isEquipped = S.equipped && (
                      (item.type === "title"  && S.equipped.title  === item.id) ||
                      (item.type === "color"  && S.equipped.color  === item.id) ||
                      (item.type === "weapon" && S.equipped.weapon === item.id)
                    );
                    return (
                      <div key={item.id}
                        onClick={() => {
                          setS(p => {
                            const eq = { ...(p.equipped || {}) };
                            if (item.type === "title")  eq.title  = isEquipped ? null : item.id;
                            if (item.type === "color")  eq.color  = isEquipped ? null : item.id;
                            if (item.type === "weapon") eq.weapon = isEquipped ? null : item.id;
                            return { ...p, equipped: eq };
                          });
                        }}
                        style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", marginBottom:6, border:"1px solid "+(isEquipped?rc:"#1a1a1a"), background:isEquipped?"#0d0d0d":"#050505", cursor:"pointer", transition:"all 0.2s" }}>
                        <span style={{ fontSize:18, color:rc }}>{item.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:2 }}>
                            <span style={{ fontSize:10, color:"#e8e0d0", fontWeight:700 }}>{item.name}</span>
                            <span style={{ fontSize:8, color:rc, letterSpacing:1 }}>{item.rarity.toUpperCase()}</span>
                            <span style={{ fontSize:8, color:"#444" }}>{typeLabels[item.type]}</span>
                          </div>
                          <div style={{ fontSize:9, color:"#555", lineHeight:1.4 }}>{item.desc}{item.type==="weapon"&&WEAPON_STYLES[item.id]?<span style={{color:"#c8a882"}}> · +{WEAPON_STYLES[item.id].bonusPct}% к памяти</span>:null}</div>
                        </div>
                        {isEquipped && <span style={{ color:rc, fontSize:10, letterSpacing:1 }}>◈</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {inventory.length === 0 && (
                <div style={{ textAlign:"center", padding:40, color:"#1a1a1a" }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>✦</div>
                  <div style={{ fontSize:9, letterSpacing:2 }}>АРХИВ ПУСТ</div>
                  <div style={{ fontSize:9, color:"#111", marginTop:6 }}>Выполняй миссии, чтобы собрать фрагменты</div>
                </div>
              )}


              {/* Gacha catalog */}
              <div style={{ marginTop:16, padding:"14px 16px", border:"1px solid #111" }}>
                <div style={{ fontSize:8, letterSpacing:3, color:"#444", marginBottom:12 }}>ЧТО МОЖНО ПОЛУЧИТЬ</div>
                {["title","weapon","color","lore"].map(type => {
                  const labels = { title:"ТИТУЛЫ", weapon:"ОРУЖИЕ", color:"ЦВЕТОВЫЕ СХЕМЫ", lore:"ЛОР-ФАЙЛЫ" };
                  const descs  = { title:"Отображаются под именем персонажа", weapon:"Влияют на стиль миссий и дают бонус к памяти", color:"Меняют цвет акцента всего интерфейса", lore:"Цитаты и факты из вселенной NieR:Automata" };
                  const items  = GACHA_POOL.filter(i => i.type === type);
                  return (
                    <div key={type} style={{ marginBottom:14 }}>
                      <div style={{ fontSize:9, color:"#888", letterSpacing:2, marginBottom:4 }}>{labels[type]}</div>
                      <div style={{ fontSize:9, color:"#444", marginBottom:6 }}>{descs[type]}</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {items.map(item => (
                          <span key={item.id} style={{ fontSize:8, color:RARITY_COLORS[item.rarity], border:"1px solid "+RARITY_COLORS[item.rarity]+"44", padding:"2px 7px", letterSpacing:1 }}>
                            {item.icon} {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rarity info */}
              <div style={{ marginTop:16, padding:"12px 14px", border:"1px solid #111" }}>
                <div style={{ fontSize:8, letterSpacing:3, color:"#333", marginBottom:10 }}>ВЕРОЯТНОСТИ ИЗВЛЕЧЕНИЯ</div>
                {Object.entries(RARITY_WEIGHTS).map(([r, w]) => (
                  <div key={r} style={{ display:"flex", justifyContent:"space-between", fontSize:9, marginBottom:5, color:"#444" }}>
                    <span style={{ color: RARITY_COLORS[r] }}>{r.toUpperCase()}</span>
                    <span>{w}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LOG TAB ── */}
          {tab === "log" && (
            <div>
              {/* Daily lore */}
              <div style={{ marginBottom:20, padding:"14px 16px", border:"1px solid #1a1a1a", borderLeft:"2px solid "+A+"44" }}>
                <div style={{ fontSize:8, letterSpacing:3, color:"#444", marginBottom:10 }}>◈ ДАННЫЕ ДНЯ</div>
                <div style={{ fontSize:11, color:"#555", fontStyle:"italic", lineHeight:1.8 }}>
                  {LORE_DB[Math.floor((Date.now() / 86400000)) % LORE_DB.length]}
                </div>
              </div>
              {log.length === 0 && (
                <div style={{ textAlign:"center", padding:40, color:"#1a1a1a" }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>◇</div>
                  <div style={{ fontSize:9, letterSpacing:2 }}>ЖУРНАЛ ПУСТ</div>
                </div>
              )}
              {log.map((e, i) => (
                <div key={i} style={{ paddingLeft:12, marginBottom:14, borderLeft:"1px solid "+(i===0?A:"#1a1a1a") }}>
                  <div style={{ fontSize:8, color:"#333", marginBottom:2, letterSpacing:1 }}>{e.time}</div>
                  <div style={{ fontSize:10, color:i===0?"#888":"#444" }}>{e.text}</div>
                  {e.report && (
                    <div style={{ marginTop:6, padding:"6px 10px", background:"#0a0a0a", border:"1px solid #1a1a1a", borderLeft:"1px solid "+A+"44" }}>
                      <div style={{ fontSize:8, color:"#444", letterSpacing:2, marginBottom:3 }}>ОТЧЁТ:</div>
                      <div style={{ fontSize:9, color:"#555", lineHeight:1.7 }}>{e.report}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
