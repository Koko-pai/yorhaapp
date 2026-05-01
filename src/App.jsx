import { useState, useEffect, useCallback, useRef } from "react";
import { pickMissions } from "./missionBank.js";
import LOGIC_BANK from "./LOGIC_MISSIONS.js";
import { getMissionHint } from "./MISSION_HINTS.js";
import BattleTab, { getDailyBattleMissions, getWaveDrops, MATERIALS, UPGRADE_COSTS, ABILITIES } from "./BattleMode.jsx";
import EquipmentTab, { EQUIP_SLOTS, SLOT_LABELS, SLOT_ICONS, RARITY_STAT_MULT, STAT_RANGES, EQUIPMENT_SETS, EQUIPMENT_POOL, EQUIPMENT_WEAPON_STYLES, getStatScale, calcStats, rollItemStats, getEquippedItems, getSetBonuses, getSetMemMultiplier } from "./EquipmentSystem.jsx";
import { CHARACTER_10H, getCharacterImg, getCharacterForm, getCharacterDialogue } from "./characters.js";
import SimulationMode from "./SimulationMode.jsx";

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

// Алиасы для удобства — данные живут в characters.js
const IMGS  = CHARACTER_10H.imgs;
const FORMS = CHARACTER_10H.forms;

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
  { id: "c6", type: "color",  rarity: "legendary", icon: "★", name: "Белый шум",             desc: "Цвет конца цикла", value: "#d8d0c4" },
  // Lore
  { id: "l1", type: "lore",   rarity: "common",    icon: "◇", name: "Файл: Происхождение",   desc: "«YoRHa создана не для победы. Она создана для того, чтобы человечество верило в победу.»" },
  { id: "l2", type: "lore",   rarity: "common",    icon: "◇", name: "Файл: Машины",          desc: "«Машины не просто имитируют людей. Они ищут смысл — так же, как и мы.»" },
  { id: "l3", type: "lore",   rarity: "rare",      icon: "◆", name: "Файл: Протокол 24",     desc: "«Все андроиды YoRHa содержат вирус. Это не ошибка — это условие существования.»" },
  { id: "l4", type: "lore",   rarity: "rare",      icon: "◆", name: "Файл: Йоко Таро",       desc: "«Я хочу делать игры, которые заставляют людей плакать. Не от грусти — от понимания.» — Йоко Таро" },
  { id: "l5", type: "lore",   rarity: "epic",      icon: "▲", name: "Файл: Конец YoRHa",     desc: "«Операция Тригер была запланирована с самого начала. Бункер знал. Командование знало. Все знали.»" },
  { id: "l6", type: "lore",   rarity: "legendary", icon: "★", name: "Файл: Воля к жизни",    desc: "«Даже машины в итоге выбирают жить. Может быть, в этом и есть ответ на вопрос, что значит быть человеком.»" },
  // Weapons
  { id: "w1", type: "weapon", slot: "weapon", rarity: "common",    icon: "◇", name: "Разрушитель грёз",      desc: "Стандартный короткий меч YoRHa. Надёжное оружие для любой ситуации." },
  { id: "w2", type: "weapon", slot: "weapon", rarity: "rare",      icon: "◆", name: "Белый лотос",           desc: "Катана с гравировкой на клинке. Идеальный баланс между скоростью и точностью." },
  { id: "w3", type: "weapon", slot: "weapon", rarity: "epic",      icon: "▲", name: "Тёмная рука",           desc: "Тяжёлое двуручное оружие класса S. Сокрушительная сила в каждом ударе." },
  { id: "w4", type: "weapon", slot: "weapon", rarity: "legendary", icon: "★", name: "Древо Миров",           desc: "Реликвийное оружие. Происхождение неизвестно. Мощь, накопленная за тысячелетия." },
];


// Weapon influence on missions
const WEAPON_STYLES = {
  "w1": { style: "дисциплина и фокус", bonus: "intellect", bonusPct: 10, hint: "Стандартный меч — чёткие задачи без отвлечений" },
  "w2": { style: "точность и мастерство", bonus: "intellect", bonusPct: 20, hint: "Катана — задачи требующие глубокого погружения" },
  "w3": { style: "масштаб и амбиции", bonus: "creativity", bonusPct: 20, hint: "Двуручник — большие долгосрочные цели" },
  "w4": { style: "баланс силы и мудрости", bonus: "both", bonusPct: 30, hint: "Реликвийное оружие — задачи на грани возможного" },
};

const RARITY_WEIGHTS = { common: 60, rare: 25, epic: 12, legendary: 3 };

// Фрагменты за дубликат по редкости
const DUPE_FRAGS = { common: 5, rare: 10, epic: 15, legendary: 20 };

const RARITY_COLORS  = { common: "#9a9088", rare: "#44aaff", epic: "#aa44cc", legendary: "#ffcc00" };

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
// SAVE CODEC  v3  (prefix "YD:")
// YD:       = deflate-raw + base64  (новый формат)
// plain b64 = старый формат         (только импорт)
// ═══════════════════════════════════════════════════════
const SAVE_PFX = "YD:";

function _u8toB64(u8) {
  let s = ""; for (const b of u8) s += String.fromCharCode(b); return btoa(s);
}
function _b64toU8(s) {
  const bin = atob(s); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8;
}
async function _deflate(str) {
  const cs = new CompressionStream("deflate-raw");
  const w = cs.writable.getWriter(); w.write(new TextEncoder().encode(str)); w.close();
  const chunks = []; for await (const c of cs.readable) chunks.push(c);
  const out = new Uint8Array(chunks.reduce((a,c)=>a+c.length,0));
  let off=0; for (const c of chunks) { out.set(c,off); off+=c.length; }
  return _u8toB64(out);
}
async function _inflate(b64) {
  const ds = new DecompressionStream("deflate-raw");
  const w = ds.writable.getWriter(); w.write(_b64toU8(b64)); w.close();
  const chunks = []; for await (const c of ds.readable) chunks.push(c);
  const out = new Uint8Array(chunks.reduce((a,c)=>a+c.length,0));
  let off=0; for (const c of chunks) { out.set(c,off); off+=c.length; }
  return new TextDecoder().decode(out);
}

async function encodeState(state) {
  try { return SAVE_PFX + await _deflate(JSON.stringify(state)); } catch(e) { return ""; }
}
async function decodeState(raw) {
  const s = raw.trim();
  if (s.startsWith(SAVE_PFX))
    return JSON.parse(await _inflate(s.slice(SAVE_PFX.length)));
  // Старый формат — plain base64 JSON
  return JSON.parse(decodeURIComponent(escape(atob(s))));
}

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
function missionLifetime(threat, isEvent, isLogic) {
  if (isLogic) return 15 * 60 * 1000; // 15 минут
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

  // Миграция: конвертируем строки в инвентаре в объекты { id, iid }
  const rawInv = Array.isArray(o.inventory) ? o.inventory : [];
  const migratedInv = rawInv.map((e, i) => {
    if (typeof e === 'string') return { id: e, iid: e + "_legacy_" + i };
    if (e && typeof e === 'object' && e.id && !e.iid) return { ...e, iid: e.id + "_legacy_" + i };
    return e;
  });

  // Миграция: переносим gearLevels с ключа slot на ключ iid предмета
  // и обновляем gear[slot] чтобы тоже указывал на iid
  const rawGear   = (o.gear && typeof o.gear === 'object') ? o.gear : {};
  const rawLevels = (o.gearLevels && typeof o.gearLevels === 'object') ? o.gearLevels : {};
  const migratedLevels = { ...rawLevels };
  const migratedGear   = { ...rawGear };
  for (const slot of ["head","chest","gloves","boots","weapon"]) {
    const gearKey = rawGear[slot];
    if (!gearKey) continue;
    const invEntry = migratedInv.find(i => typeof i === 'object' && (i.iid === gearKey || i.id === gearKey));
    const targetIid = (invEntry && invEntry.iid) ? invEntry.iid : gearKey;
    migratedGear[slot] = targetIid;
    const slotLvl = rawLevels[slot];
    if (slotLvl && slotLvl > 1 && !rawLevels[targetIid]) {
      migratedLevels[targetIid] = slotLvl;
      delete migratedLevels[slot];
    }
  }

  // Миграция: фиксируем rolledStats для предметов у которых их ещё нет
  const finalInv = migratedInv.map(e => {
    if (!e || typeof e !== 'object') return e;
    if (e.rolledStats) return e;
    try {
      const base = EQUIPMENT_POOL.find(p => p.id === e.id) || GACHA_POOL.find(p => p.id === e.id);
      if (base) {
        // Явно передаём slot для оружий чтобы rollItemStats дал 1 вторичный стат
        const slot = base.slot || (base.type === "weapon" ? "weapon" : undefined);
        const rolled = rollItemStats({ ...base, slot, iid: e.iid });
        return { ...e, rolledStats: rolled };
      }
    } catch(_) {}
    return e;
  });

  return {
    fw:         typeof o.fw === "number"        ? o.fw        : 1,
    mem:        typeof o.mem === "number"       ? o.mem       : 0,
    memMax:     typeof o.memMax === "number"    ? o.memMax    : 100,
    cog:        typeof o.cog === "number"       ? o.cog       : 1,
    syn:        typeof o.syn === "number"       ? o.syn       : 1,
    frags:      typeof o.frags === "number"     ? o.frags     : 0,
    missions:   Array.isArray(o.missions)       ? o.missions.map(m => ({
      ...m,
      expiresAt: m.expiresAt || (m.createdAt ? m.createdAt + missionLifetime(m.threat, m.isEvent, m.isLogic) : Date.now() + 24*3600000),
      createdAt: m.createdAt || Date.now(),
    })) : [],
    completed:  Array.isArray(o.completed)      ? o.completed : [],
    dirs:       Array.isArray(o.dirs)           ? o.dirs      : [],
    log:        Array.isArray(o.log)            ? o.log       : [],
    achi:       Array.isArray(o.achi)           ? o.achi      : [],
    unlocked:   Array.isArray(o.unlocked)       ? o.unlocked  : ["sentinel"],
    form:       (typeof o.form === "string" && FORMS[o.form]) ? o.form : "sentinel",
    boots:      typeof o.boots === "number"     ? o.boots + 1 : 1,
    inventory:  finalInv,
    gear:       migratedGear,
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
    loginClaimed: typeof o.loginClaimed === 'boolean' ? o.loginClaimed : false,
    claimedDate:  typeof o.claimedDate === "string"  ? o.claimedDate : "",
    // Battle mode state
    materials:    (o.materials && typeof o.materials === 'object') ? o.materials : {},
    battleMissionsDate: typeof o.battleMissionsDate === 'string' ? o.battleMissionsDate : "",
    battleMissionsDone: Array.isArray(o.battleMissionsDone) ? o.battleMissionsDone : [],
    battleMemToday: typeof o.battleMemToday === 'number' ? o.battleMemToday : 0,
    battleMemDate:  typeof o.battleMemDate  === 'string' ? o.battleMemDate  : "",
    gearLevels:   migratedLevels,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? mkState(JSON.parse(raw)) : mkState({});
  } catch(e) { return mkState({}); }
}

function saveState(s) {
  const payload = JSON.stringify({ ...s, _savedAt: Date.now() });
  try { localStorage.setItem(KEY, payload); } catch(e) {}
  try { if (window.storage) window.storage.set(KEY, payload).catch(()=>{}); } catch(e) {}
}

async function loadStateAsync() {
  let localRaw = null;
  let cloudRaw = null;
  try { localRaw = localStorage.getItem(KEY); } catch(e) {}
  try {
    if (window.storage) {
      const saved = await window.storage.get(KEY);
      if (saved && saved.value) cloudRaw = saved.value;
    }
  } catch(e) {}
  // Берём более свежее сохранение по _savedAt
  let best = null;
  try {
    const localParsed = localRaw ? JSON.parse(localRaw) : null;
    const cloudParsed = cloudRaw ? JSON.parse(cloudRaw) : null;
    const lt = localParsed?._savedAt || 0;
    const ct = cloudParsed?._savedAt || 0;
    best = ct > lt ? cloudParsed : (localParsed || cloudParsed);
  } catch(e) {}
  return best ? mkState(best) : mkState({});
}

function inArr(arr, val) {
  if (!Array.isArray(arr)) return false;
  return arr.some(e => (typeof e === 'object' ? e.id : e) === val);
}

// Резолвит iid → baseId через инвентарь (для поиска в пулах по базовому id)
function resolveBaseId(keyOrIid, inventory) {
  if (!keyOrIid) return keyOrIid;
  const inv = Array.isArray(inventory) ? inventory : [];
  const entry = inv.find(i => typeof i === 'object' && (i.iid === keyOrIid || i.id === keyOrIid));
  return (entry && typeof entry === 'object') ? entry.id : keyOrIid;
}
// Count how many times an id appears in inventory
function invCount(arr, id) {
  if (!Array.isArray(arr)) return 0;
  return arr.filter(e => (typeof e === 'object' ? e.id : e) === id).length;
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
  // Build pool: gacha items + equipment items of same rarity
  const gachaItems = GACHA_POOL.filter(i => i.rarity === rarity);
  const equipItems = EQUIPMENT_POOL.filter(i => i.rarity === rarity).map(e => ({ ...e, type:"equipment" }));
  const pool = [...gachaItems, ...equipItems];
  if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  const fallback = [...GACHA_POOL, ...EQUIPMENT_POOL.map(e => ({ ...e, type:"equipment" }))];
  return fallback[Math.floor(Math.random() * fallback.length)];
}

// ═══════════════════════════════════════════════════════
// AI MISSIONS
// ═══════════════════════════════════════════════════════

// Генерация миссий из банка (вместо AI)
function genMissions() {
  return pickMissions(3, null, false, LOGIC_BANK);
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
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#6a6058", marginBottom:3, letterSpacing:2 }}>
        <span>MEMORY CORE</span>
        <span>{mem}/{max} [{pct}%]</span>
      </div>
      <div style={{ display:"flex", gap:2 }}>
        {Array.from({ length: N }).map((_, i) => (
          <div key={i} style={{ flex:1, height:8, background: i < f ? accent : "#1e1c18", border:"1px solid #221f1a", transition:"background 0.4s" }}/>
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
    <div style={{ position:"fixed", inset:0, zIndex:9992, background:"rgba(8,7,6,0.94)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div style={{ background:"#141210", border:"1px solid #2a2520", borderTop:"2px solid "+accent, maxWidth:400, width:"100%", padding:24 }}>
        {/* Header */}
        <div style={{ fontSize:8, letterSpacing:4, color:"#6a6058", marginBottom:4 }}>YORHA ◈ ОТЧЁТ О ВЫПОЛНЕНИИ</div>
        <div style={{ fontSize:12, fontWeight:700, color:accent, letterSpacing:2, marginBottom:4 }}>{mission.title}</div>
        <div style={{ fontSize:9, color:"#6a6058", marginBottom:16, display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ color: mission.threat==="ВЫСОКАЯ"?"#c44":mission.threat==="СРЕДНЯЯ"?"#ca7":"#4a9" }}>
            {mission.threat}
          </span>
          {required && <span style={{ color:"#c44", letterSpacing:1 }}>· ОТЧЁТ ОБЯЗАТЕЛЕН</span>}
          {optional && <span style={{ color:"#6a6058", letterSpacing:1 }}>· ОТЧЁТ НЕОБЯЗАТЕЛЕН</span>}
        </div>

        {/* Report field */}
        {(required || optional) && (
          <>
            <div style={{ fontSize:9, color:"#5a5248", marginBottom:8, letterSpacing:1 }}>
              {required ? "Опиши что было сделано:" : "Можешь оставить заметку (необязательно):"}
            </div>
            <textarea
              value={report}
              onChange={e => setReport(e.target.value)}
              placeholder={required ? "Опиши результат выполнения миссии..." : "Необязательно..."}
              autoFocus
              style={{
                width:"100%", height:100, background:"#181614",
                border:"1px solid "+(required && !report.trim() ? "#c44" : "#4a4438"),
                color:"#9a9088", fontSize:10, padding:10,
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
            onMouseEnter={e=>{if(canSubmit){e.target.style.background=accent;e.target.style.color="#0f0e0d";}}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=canSubmit?accent:"#4a4438";}}
            style={{ flex:1, background:"transparent", border:"1px solid "+(canSubmit?accent:"#4a4438"), color:canSubmit?accent:"#4a4438", padding:"11px", fontSize:9, letterSpacing:3, cursor:canSubmit?"pointer":"not-allowed", transition:"all 0.2s" }}>
            ПОДТВЕРДИТЬ ВЫПОЛНЕНИЕ ◈
          </button>
          <button onClick={onCancel}
            onMouseEnter={e=>{e.target.style.borderColor="#9a9088";e.target.style.color="#9a9088";}}
            onMouseLeave={e=>{e.target.style.borderColor="#4a4438";e.target.style.color="#6a6058";}}
            style={{ background:"transparent", border:"1px solid #3a3228", color:"#6a6058", padding:"11px 14px", fontSize:9, cursor:"pointer", transition:"all 0.2s" }}>
            ←
          </button>
        </div>
      </div>
    </div>
  );
}

function MCard({ m, accent, onDone, onReroll, rerollsLeft, rerollBlocked, now, onLogic, onSimulation }) {
  const [h, setH] = useState(false);
  const tc = { "НИЗКАЯ":"#4a9", "СРЕДНЯЯ":"#ca7", "ВЫСОКАЯ":"#c44" };
  const c = tc[m.threat] || "#9a9088";
  const LC = "#b0a898";
  const baseReward = { "НИЗКАЯ":"20-30", "СРЕДНЯЯ":"40-55", "ВЫСОКАЯ":"65-80" };
  const baseFrags  = { "НИЗКАЯ":"1", "СРЕДНЯЯ":"2-3", "ВЫСОКАЯ":"4-5" };
  const memStr  = m.isEvent
    ? (parseInt(baseReward[m.threat]||"40")*2)+"-"+(parseInt((baseReward[m.threat]||"40-55").split("-")[1]||"55")*2)
    : m.isLogic ? "65-88" : (baseReward[m.threat]||"?");
  const fragStr = m.isEvent
    ? String(parseInt((baseFrags[m.threat]||"2").split("-")[1]||baseFrags[m.threat])*2)
    : m.isLogic ? "4-5" : (baseFrags[m.threat]||"?");
  const canReroll = !rerollBlocked && rerollsLeft > 0;
  const tLeft = m.expiresAt ? timeLeft(m.expiresAt, now) : null;
  const isUrgent = m.expiresAt && (m.expiresAt - now) < 3600000;

  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: m.isEvent ? "#120000" : m.isLogic ? "#060612" : h?"#161412":"#141210",
        border: m.isEvent ? "1px solid #cc2222"
          : m.isLogic ? "1px solid #6666aa"
          : "1px solid "+(h?"#4a4438":"#221f1a"),
        borderLeft: m.isEvent ? "3px solid #ff2222"
          : m.isLogic ? "3px solid " + LC
          : "2px solid "+(m.spec==="intellect"?"#a09080":"#c8a882"),
        padding:"12px 14px", marginBottom:8, transition:"all 0.2s",
        boxShadow: m.isEvent ? "0 0 12px #cc000033" : m.isLogic ? "0 0 12px #b0a89822" : "none",
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

      {/* Logic badge */}
      {m.isLogic && (
        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
          <span style={{ fontSize:8, color: LC, letterSpacing:2, fontWeight:700 }}>⬡ ЛОГИЧЕСКАЯ ДИРЕКТИВА</span>
          <span style={{ fontSize:8, color: LC, opacity:0.6 }}>· 3 ПОПЫТКИ</span>
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
        <span style={{ color: m.isEvent?"#ffaaaa": m.isLogic ? "#d0c8bc" :"#d8d0c4", fontSize:11, fontWeight:700, letterSpacing:1 }}>▶ {m.title}</span>
        {!m.isLogic && <span style={{ fontSize:8, color:c, border:"1px solid "+c, padding:"1px 6px", letterSpacing:1 }}>{m.threat}</span>}
        {m.isLogic && <span style={{ fontSize:8, color: LC, border:"1px solid "+LC, padding:"1px 6px", letterSpacing:1 }}>ЛОГИКА</span>}
      </div>
      <p style={{ color:"#6a6058", fontSize:10, margin:"0 0 10px", lineHeight:1.6 }}>{m.desc}</p>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
          <span style={{ fontSize:9, color: m.isEvent?"#cc4444": m.isLogic ? "#a09080" :"#5a5248" }}>
            {m.isLogic ? "[COG]" : "["+((m.spec==="intellect")?"COG":"SYN")+"]"} {memStr} MEM · {fragStr}◈
            {m.isEvent && " ×2"}
          </span>
          {tLeft && (
            <span style={{ fontSize:9, color: isUrgent?"#ff4444":"#6a6058", letterSpacing:1 }}>
              ⏱ {tLeft}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          {!m.isEvent && !m.isLogic && (
            <button onClick={() => onReroll(m.id)} disabled={!canReroll}
              title={rerollBlocked ? "Заблокировано" : rerollsLeft + " перегенерации осталось"}
              onMouseEnter={e => { if(canReroll){ e.target.style.borderColor="#9a9088"; e.target.style.color="#9a9088"; }}}
              onMouseLeave={e => { e.target.style.borderColor="#4a4438"; e.target.style.color="#5a5248"; }}
              style={{ background:"transparent", border:"1px solid #3a3228", color:canReroll?"#5a5248":"#3a342e", padding:"4px 8px", fontSize:9, cursor:canReroll?"pointer":"not-allowed", transition:"all 0.2s" }}>
              ↺{rerollsLeft}
            </button>
          )}
          {m.isLogic ? (
            <button onClick={() => onLogic(m)}
              onMouseEnter={e => { e.currentTarget.style.background = LC; e.currentTarget.style.color = "#0f0e0d"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = LC; }}
              style={{ background:"transparent", border:"1px solid "+LC, color: LC, padding:"4px 14px", fontSize:9, letterSpacing:2, cursor:"pointer", transition:"all 0.2s" }}>
              РЕШИТЬ
            </button>
          ) : (
            <>
              <button onClick={() => onSimulation(m)}
                onMouseEnter={e => { e.target.style.borderColor="#6a6058"; e.target.style.color="#9a9088"; }}
                onMouseLeave={e => { e.target.style.borderColor="#3a3228"; e.target.style.color="#5a5248"; }}
                style={{ background:"transparent", border:"1px solid #3a3228", color:"#5a5248", padding:"4px 10px", fontSize:9, letterSpacing:1, cursor:"pointer", transition:"all 0.2s" }}>
                SIM
              </button>
              <button onClick={() => onDone(m)}
                onMouseEnter={e => { e.target.style.background = m.isEvent?"#cc2222":accent; e.target.style.color = "#0f0e0d"; }}
                onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = m.isEvent?"#ff4444":accent; }}
                style={{ background:"transparent", border:"1px solid "+(m.isEvent?"#cc2222":accent), color:m.isEvent?"#ff4444":accent, padding:"4px 14px", fontSize:9, letterSpacing:2, cursor:"pointer", transition:"all 0.2s" }}>
                ВЫПОЛНЕНО
              </button>
            </>
          )}
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

  const alreadyClaimed = state.claimedDate === today;
  const reward = WEEK_REWARDS[currentDay];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9994, background:"rgba(8,7,6,0.94)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div style={{ background:"#141210", border:"1px solid #2a2520", borderTop:"2px solid "+accent, maxWidth:380, width:"100%", padding:24, position:"relative" }}>
        {/* Header */}
        <div style={{ fontSize:8, letterSpacing:4, color:"#6a6058", marginBottom:4 }}>YORHA ◈ ЕЖЕДНЕВНЫЙ ОТЧЁТ</div>
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
                background: isClaimed ? "#161412" : isToday ? "#1e1c18" : "#111009",
                opacity: isFuture ? 0.4 : 1,
                position:"relative",
              }}>
                <div style={{ fontSize:8, color: isToday?accent:isClaimed?"#6a6058":"#5a5248", letterSpacing:1 }}>{days[i]}</div>
                <div style={{ fontSize:r.special?14:12, color: isClaimed?"#6a6058":isToday?accent:isPast?"#4a4438":"#7a7068" }}>
                  {r.special ? "★" : "◈"}
                </div>
                <div style={{ fontSize:7, color: isClaimed?"#4a4438":isToday?accent:"#5a5248", textAlign:"center", lineHeight:1.4 }}>
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
        <div style={{ border:"1px solid "+accent+"44", padding:"12px 16px", marginBottom:20, background:"#181614" }}>
          <div style={{ fontSize:8, letterSpacing:2, color:"#6a6058", marginBottom:6 }}>СЕГОДНЯ — ДЕНЬ {currentDay+1}</div>
          <div style={{ fontSize:16, color:accent, fontWeight:700 }}>
            {reward.special ? "★ " : "◈ "}{reward.label}
          </div>
          {reward.special && <div style={{ fontSize:9, color:"#9a9088", marginTop:4 }}>Бонус за полную неделю!</div>}
        </div>

        {/* Buttons */}
        {alreadyClaimed ? (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        <button onClick={() => {
          encodeState(S).then(data => {
            if (navigator.clipboard) {
              navigator.clipboard.writeText(data).then(() => toast$("КОД СОХРАНЕНИЯ СКОПИРОВАН ◈", "#4a9"));
            }
          }).catch(() => toast$("ОШИБКА ЭКСПОРТА", "#c44"));
        }}
          style={{ background:"#181614", border:"1px solid #3a3228", color:"#7a7068", width:36, height:36, borderRadius:"50%", fontSize:11, cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center" }}
          onMouseEnter={e => { e.target.style.borderColor=A; e.target.style.color=A; }}
          onMouseLeave={e => { e.target.style.borderColor="#4a4438"; e.target.style.color="#7a7068"; }}
          title="Быстрый экспорт сохранения">⬆</button>
            <div style={{ fontSize:10, color:"#4a9", textAlign:"center", letterSpacing:2 }}>✓ НАГРАДА УЖЕ ПОЛУЧЕНА</div>
            <button onClick={onClose}
              onMouseEnter={e=>{e.target.style.background=accent;e.target.style.color="#0f0e0d";}}
              onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=accent;}}
              style={{ background:"transparent", border:"1px solid "+accent, color:accent, padding:"10px", fontSize:9, letterSpacing:3, cursor:"pointer", transition:"all 0.2s" }}>
              ПРОДОЛЖИТЬ ◈
            </button>
          </div>
        ) : (
          <button onClick={onClaim}
            onMouseEnter={e=>{e.target.style.background=accent;e.target.style.color="#0f0e0d";}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=accent;}}
            style={{ width:"100%", background:"transparent", border:"1px solid "+accent, color:accent, padding:"12px", fontSize:10, letterSpacing:3, cursor:"pointer", transition:"all 0.2s" }}>
            ПОЛУЧИТЬ НАГРАДУ ◈
          </button>
        )}
      </div>
    </div>
  );
}



// Диалоги и getRandom — делегируем в characters.js
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getDialogue(type, params) {
  return getCharacterDialogue(CHARACTER_10H.id, type, params);
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
        background:"#0f0e0d",
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
        background:"rgba(8,7,6,0.94)",
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
    setImportError("");
    decodeState(importText)
      .then(parsed => {
        if (typeof parsed !== "object" || parsed === null) throw new Error("Неверный формат");
        onLoad(parsed);
      })
      .catch(() => setImportError("Неверный код сохранения. Проверь и попробуй снова."));
  };

  if (mode === "import") return (
    <div style={{ background:"#0f0e0d", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:24 }}>
      <div style={{ maxWidth:380, width:"100%" }}>
        <div style={{ fontSize:8, letterSpacing:4, color:"#6a6058", marginBottom:4 }}>YORHA ◈ ЗАГРУЗКА ДАННЫХ</div>
        <div style={{ fontSize:14, fontWeight:700, color:accent, letterSpacing:3, marginBottom:20 }}>ВВЕДИ КОД СОХРАНЕНИЯ</div>
        <div style={{ fontSize:9, color:"#6a6058", marginBottom:12, lineHeight:1.8 }}>
          Вставь код который ты сохранил при последнем выходе.
        </div>
        <textarea
          value={importText}
          onChange={e => setImportText(e.target.value)}
          placeholder="Вставь код сохранения сюда..."
          autoFocus
          style={{
            width:"100%", height:120, background:"#181614",
            border:"1px solid #3a3228", color:"#9a9088", fontSize:9,
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
            onMouseEnter={e=>{if(importText.trim()){e.target.style.background=accent;e.target.style.color="#0f0e0d";}}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=importText.trim()?accent:"#4a4438";}}
            style={{ flex:1, background:"transparent", border:"1px solid "+(importText.trim()?accent:"#4a4438"), color:importText.trim()?accent:"#4a4438", padding:"12px", fontSize:9, letterSpacing:3, cursor:importText.trim()?"pointer":"not-allowed", transition:"all 0.2s" }}>
            ЗАГРУЗИТЬ ◈
          </button>
          <button onClick={() => { setMode("main"); setImportError(""); }}
            onMouseEnter={e=>{e.target.style.borderColor="#9a9088";e.target.style.color="#9a9088";}}
            onMouseLeave={e=>{e.target.style.borderColor="#4a4438";e.target.style.color="#6a6058";}}
            style={{ background:"transparent", border:"1px solid #3a3228", color:"#6a6058", padding:"12px 16px", fontSize:9, cursor:"pointer", transition:"all 0.2s" }}>
            ←
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background:"#0f0e0d", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:24 }}>
      <div style={{ maxWidth:380, width:"100%" }}>
        {/* Logo */}
        <div style={{ marginBottom:40, textAlign:"center" }}>
          <div style={{ fontSize:9, letterSpacing:4, color:"#5a5248", marginBottom:8 }}>
            YORHA ◈ TACTICAL LOG
          </div>
          <div style={{ fontSize:28, fontWeight:700, letterSpacing:4, color:accent, marginBottom:6 }}>
            No.10 Type H
          </div>
          <div style={{ fontSize:9, letterSpacing:3, color:"#6a6058" }}>
            ПРОТОКОЛ АКТИВАЦИИ
          </div>
          <div style={{ width:60, height:1, background:accent, margin:"16px auto 0", opacity:0.4 }}/>
        </div>

        {/* Buttons */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button onClick={() => setMode("import")}
            onMouseEnter={e=>{e.target.style.background=accent;e.target.style.color="#0f0e0d";}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=accent;}}
            style={{ background:"transparent", border:"1px solid "+accent, color:accent, padding:"14px", fontSize:10, letterSpacing:3, cursor:"pointer", transition:"all 0.2s" }}>
            ◈ ЗАГРУЗИТЬ СОХРАНЕНИЕ
          </button>
          <button onClick={onNew}
            onMouseEnter={e=>{e.target.style.borderColor="#9a9088";e.target.style.color="#9a9088";}}
            onMouseLeave={e=>{e.target.style.borderColor="#4a4438";e.target.style.color="#6a6058";}}
            style={{ background:"transparent", border:"1px solid #3a3228", color:"#6a6058", padding:"14px", fontSize:10, letterSpacing:3, cursor:"pointer", transition:"all 0.2s" }}>
            ◇ НАЧАТЬ ЗАНОВО
          </button>
        </div>

        <div style={{ marginTop:24, fontSize:8, color:"#302b24", textAlign:"center", lineHeight:1.8, letterSpacing:1 }}>
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
    <div style={{ position:"fixed", inset:0, background:"#0f0e0d", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace" }}>
      <div style={{ width:340, padding:24 }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            color: (l||"").indexOf("UNIT ONLINE") >= 0 ? "#d8d0c4" : (l||"").indexOf("glory") >= 0 ? "#6a6058" : "#5a5248",
            fontSize: (l||"").indexOf("UNIT ONLINE") >= 0 ? 15 : 11,
            letterSpacing: (l||"").indexOf("UNIT ONLINE") >= 0 ? 3 : 1,
            marginBottom: l === "" ? 12 : 3,
            fontWeight: (l||"").indexOf("UNIT ONLINE") >= 0 ? 700 : 400,
          }}>{(l||"") || "\u00A0"}</div>
        ))}
        <span style={{ color:"#d8d0c4", animation:"blink 1s infinite" }}>_</span>
      </div>
    </div>
  );
}

function FwUpOverlay({ fw, accent }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9997, background:"rgba(8,7,6,0.94)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:10 }}>
      <div style={{ fontSize:9, letterSpacing:4, color:"#6a6058" }}>СИСТЕМНОЕ ОБНОВЛЕНИЕ</div>
      <div style={{ fontSize:32, fontWeight:700, letterSpacing:6, color:accent }}>v{fw}.0</div>
      <div style={{ fontSize:10, color:"#6a6058", letterSpacing:3 }}>ПРОШИВКА ОБНОВЛЕНА</div>
    </div>
  );
}

function UnlockFormOverlay({ fid, onClose }) {
  const f = FORMS[fid] || FORMS.sentinel;
  const img = IMGS[fid] || IMGS.sentinel;
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9990, background:"rgba(8,7,6,0.97)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"url("+img+")", backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"center", opacity:0.12 }}/>
      <div style={{ position:"relative", textAlign:"center", padding:24 }}>
        <div style={{ fontSize:8, letterSpacing:4, color:"#6a6058", marginBottom:12 }}>НОВАЯ ФОРМА РАЗБЛОКИРОВАНА</div>
        <div style={{ fontSize:22, fontWeight:700, letterSpacing:4, color:f.accent, marginBottom:20, textShadow:"0 0 30px "+f.accent }}>{f.name}</div>
        <div style={{ width:180, height:240, margin:"0 auto 20px", backgroundImage:"url("+img+")", backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"center bottom", filter:"drop-shadow(0 0 24px "+f.accent+")" }}/>
        <div style={{ fontSize:10, color:"#7a7068", maxWidth:280, lineHeight:1.8, margin:"0 auto 24px" }}>{f.desc}</div>
        <button onClick={onClose}
          onMouseEnter={e => { e.target.style.background = f.accent; e.target.style.color = "#0f0e0d"; }}
          onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = f.accent; }}
          style={{ background:"transparent", border:"1px solid "+f.accent, color:f.accent, padding:"10px 32px", fontSize:9, letterSpacing:3, cursor:"pointer", transition:"all 0.2s" }}>
          ПРИНЯТЬ ◈
        </button>
      </div>
    </div>
  );
}

function GachaOverlay({ result, onClose }) {
  const rc = RARITY_COLORS[result.rarity] || "#9a9088";
  const typeLabels = { title:"ТИТУЛ", color:"СХЕМА", lore:"АРХИВ", weapon:"ОРУЖИЕ", equipment:"СНАРЯЖЕНИЕ" };
  const isEquip  = result.type === "equipment";
  const isWeapon = result.type === "weapon";
  const isDupe   = result.isDupe;
  const df       = result.dupeFrags || 0;

  // Show stats for equipment using rollItemStats (iid for unique roll)
  let statLines = [];
  if (isEquip) {
    const rolled = rollItemStats({ ...result, iid: result.iid || result.id });
    const STAT_LABEL = { atk:"АТК", hp:"HP", crit:"КРИТ.ШНС", critdmg:"КРИТ.УРОН" };
    const STAT_SUFFIX = { atk:"", hp:"", crit:"%", critdmg:"%" };
    const prim = rolled.primary;
    statLines = Object.entries(rolled.stats)
      .filter(([,v]) => v > 0)
      .map(([k,v]) => ({ key:k, val:v, label:STAT_LABEL[k], suffix:STAT_SUFFIX[k], isPrimary: k===prim }))
      .sort((a,b) => (b.isPrimary?1:0)-(a.isPrimary?1:0));
  }
  // Show ATK + random secondary for weapon
  let weaponStatLines = [];
  if (isWeapon) {
    const rolled = rollItemStats({ ...result, slot:"weapon", iid: result.iid || result.id });
    const cs = calcStats({ ...result, slot:"weapon", level:1, iid: result.iid || result.id });
    const STAT_LABEL  = { atk:"АТК", hp:"HP", crit:"КРИТ.ШНС", critdmg:"КРИТ.УРОН" };
    const STAT_SUFFIX = { atk:"", hp:"", crit:"%", critdmg:"%" };
    weaponStatLines = Object.entries(cs)
      .filter(([k, v]) => v > 0 && STAT_LABEL[k])
      .map(([k, v]) => ({ key:k, val:v, label:STAT_LABEL[k], suffix:STAT_SUFFIX[k], isPrimary: k === rolled.primary }))
      .sort((a,b) => (b.isPrimary?1:0) - (a.isPrimary?1:0));
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9995, background:"rgba(0,0,0,0.96)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace" }}>
      <div style={{ textAlign:"center", padding:32, maxWidth:320, width:"100%" }}>
        <div style={{ fontSize:8, letterSpacing:4, color:"#6a6058", marginBottom:16 }}>
          {isDupe && !isEquip && !isWeapon ? "АРХИВ ДАННЫХ — ДУБЛИКАТ" : "АРХИВ ДАННЫХ — ИЗВЛЕЧЕНИЕ"}
        </div>
        <div style={{ fontSize:40, marginBottom:12, opacity: isDupe && !isEquip && !isWeapon ? 0.4 : 1 }}>{result.icon}</div>
        <div style={{ fontSize:10, color:rc, letterSpacing:3, marginBottom:8 }}>
          {result.rarity.toUpperCase()} · {typeLabels[result.type] || "ПРЕДМЕТ"}
          {(isEquip || isWeapon) && isDupe && <span style={{ color:"#9a9088" }}> · НОВЫЙ ЭКЗЕМПЛЯР</span>}
        </div>
        {isEquip && result.slot && (
          <div style={{ fontSize:9, color:"#7a7068", letterSpacing:2, marginBottom:8 }}>
            {SLOT_LABELS[result.slot]}{result.set ? " · " + (EQUIPMENT_SETS[result.set]?.name || "") : ""}
          </div>
        )}
        <div style={{ fontSize:20, fontWeight:700, color:"#d8d0c4", letterSpacing:2, marginBottom:12 }}>{result.name}</div>

        {/* Weapon stats preview */}
        {isWeapon && weaponStatLines.length > 0 && (
          <div style={{ background:"#181614", border:"1px solid #221f1a", padding:"10px 16px", marginBottom:16, textAlign:"left" }}>
            <div style={{ fontSize:7, color:"#5a5248", letterSpacing:2, marginBottom:8 }}>ХАРАКТЕРИСТИКИ</div>
            {weaponStatLines.map(({ key, val, label, suffix, isPrimary }) => (
              <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontSize:8, color: isPrimary ? rc : "#302b24" }}>{isPrimary ? "◆" : "·"}</span>
                  <span style={{ fontSize:8, color: isPrimary ? "#9a9088" : "#6a6058", letterSpacing:1 }}>{label}</span>
                </div>
                <span style={{ fontSize: isPrimary ? 10 : 8, fontWeight: isPrimary ? 700 : 400, color: isPrimary ? rc : "#7a7068" }}>
                  {val}{suffix}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Equipment stats preview */}
        {isEquip && statLines.length > 0 && (
          <div style={{ background:"#181614", border:"1px solid #221f1a", padding:"10px 16px", marginBottom:16, textAlign:"left" }}>
            <div style={{ fontSize:7, color:"#5a5248", letterSpacing:2, marginBottom:8 }}>ХАРАКТЕРИСТИКИ</div>
            {statLines.map(({ key, val, label, suffix, isPrimary }) => (
              <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontSize:8, color: isPrimary ? rc : "#302b24" }}>{isPrimary ? "◆" : "·"}</span>
                  <span style={{ fontSize:8, color: isPrimary ? "#9a9088" : "#6a6058", letterSpacing:1 }}>{label}</span>
                </div>
                <span style={{ fontSize: isPrimary ? 10 : 8, fontWeight: isPrimary ? 700 : 400, color: isPrimary ? rc : "#7a7068" }}>
                  {val}{suffix}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Equipment dupe: added to inventory + frags */}
        {isDupe && isEquip && df > 0 && (
          <div style={{ background:"#0d0900", border:"1px solid #c8a88244", padding:"12px 16px", marginBottom:16 }}>
            <div style={{ fontSize:8, color:"#9a9088", letterSpacing:1, marginBottom:4 }}>НОВЫЙ ЭКЗЕМПЛЯР</div>
            <div style={{ fontSize:12, color:"#c8a882", fontWeight:700 }}>+{df} ◈ ФРАГМЕНТОВ</div>
            <div style={{ fontSize:7, color:"#6a6058", marginTop:4 }}>Уникальные характеристики добавлены в архив</div>
          </div>
        )}

        {/* Non-equipment dupe: show frag conversion */}
        {isDupe && !isEquip && !isWeapon && (
          <div style={{ background:"#0d0900", border:"1px solid #c8a88244", padding:"12px 16px", marginBottom:16 }}>
            <div style={{ fontSize:8, color:"#9a9088", letterSpacing:1, marginBottom:4 }}>ДУБЛИКАТ ОБНАРУЖЕН</div>
            <div style={{ fontSize:12, color:"#c8a882", fontWeight:700 }}>→ +{df} ◈ ФРАГМЕНТОВ</div>
            <div style={{ fontSize:7, color:"#6a6058", marginTop:4 }}>Предмет уже есть в архиве</div>
          </div>
        )}
        {/* Weapon dupe: added to inventory + frags */}
        {isDupe && isWeapon && df > 0 && (
          <div style={{ background:"#0d0900", border:"1px solid #c8a88244", padding:"12px 16px", marginBottom:16 }}>
            <div style={{ fontSize:8, color:"#9a9088", letterSpacing:1, marginBottom:4 }}>НОВЫЙ ЭКЗЕМПЛЯР</div>
            <div style={{ fontSize:12, color:"#c8a882", fontWeight:700 }}>+{df} ◈ ФРАГМЕНТОВ</div>
            <div style={{ fontSize:7, color:"#6a6058", marginTop:4 }}>Уникальные характеристики добавлены в архив</div>
          </div>
        )}
        {!isDupe && !isEquip && !isWeapon && (
          <div style={{ fontSize:11, color:"#7a7068", maxWidth:280, lineHeight:1.8, margin:"0 auto 24px", fontStyle: result.type === "lore" ? "italic" : "normal" }}>
            {result.lore || result.desc}
          </div>
        )}

        <div style={{ width:60, height:1, background:rc, margin:"0 auto 24px", opacity:0.5 }}/>
        <button onClick={onClose}
          onMouseEnter={e => { e.target.style.background = rc; e.target.style.color = "#0f0e0d"; }}
          onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = rc; }}
          style={{ background:"transparent", border:"1px solid "+rc, color:rc, padding:"10px 28px", fontSize:9, letterSpacing:3, cursor:"pointer", transition:"all 0.2s" }}>
          {isDupe && !isEquip && !isWeapon ? "КОНВЕРТИРОВАНО ◈" : "СОХРАНИТЬ В АРХИВ ◈"}
        </button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════
// BATTLE TAB COMPONENT
// ═══════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════



function SaveManager({ state, onImport, onClose, onFixStats, accent }) {
  const [mode, setMode] = useState("main"); // main | export | import | fixing
  const [importText, setImportText] = useState("");
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState("");
  const [fixLog, setFixLog] = useState([]);
  const [fixDone, setFixDone] = useState(false);

  const [exportCode, setExportCode] = useState("");
  useEffect(() => {
    if (mode === "export" && !exportCode)
      encodeState(state).then(setExportCode);
  }, [mode]);

  const handleFixStats = () => {
    setMode("fixing");
    setFixLog([]);
    setFixDone(false);
    const { fixed, log } = onFixStats();
    setFixLog(log);
    setFixDone(true);
  };

  const handleCopy = () => {
    if (!exportCode) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(exportCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    } else {
      const ta = document.createElement("textarea");
      ta.value = exportCode; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleImport = () => {
    setImportError("");
    decodeState(importText)
      .then(parsed => {
        if (typeof parsed !== "object" || parsed === null) throw new Error("Неверный формат");
        onImport(parsed); onClose();
      })
      .catch(() => setImportError("Ошибка: неверный код сохранения"));
  };

  if (mode === "export") return (
    <div style={{ position:"fixed", inset:0, zIndex:9993, background:"rgba(8,7,6,0.94)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div style={{ background:"#141210", border:"1px solid #2a2520", borderTop:"2px solid "+accent, maxWidth:400, width:"100%", padding:24 }}>
        <div style={{ fontSize:8, letterSpacing:4, color:"#6a6058", marginBottom:4 }}>YORHA ◈ ЭКСПОРТ ДАННЫХ</div>
        <div style={{ fontSize:13, fontWeight:700, color:accent, letterSpacing:3, marginBottom:16 }}>КОД СОХРАНЕНИЯ</div>
        <div style={{ fontSize:9, color:"#6a6058", marginBottom:12, lineHeight:1.8 }}>
          Скопируй этот код и сохрани в надёжном месте.<br/>
          Он содержит весь твой прогресс.
        </div>
        <textarea readOnly value={exportCode || "Генерация..."} style={{
          width:"100%", height:100, background:"#181614", border:"1px solid #2a2520",
          color:"#6a6058", fontSize:9, padding:10, resize:"none", outline:"none",
          fontFamily:"'Courier New',monospace", wordBreak:"break-all",
        }}/>
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button onClick={handleCopy}
            onMouseEnter={e=>{e.target.style.background=accent;e.target.style.color="#0f0e0d";}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=copied?"#4a9":accent;}}
            style={{ flex:1, background:"transparent", border:"1px solid "+accent, color:copied?"#4a9":accent, padding:"10px", fontSize:9, letterSpacing:2, cursor:"pointer", transition:"all 0.2s" }}>
            {copied ? "✓ СКОПИРОВАНО" : "СКОПИРОВАТЬ ◈"}
          </button>
          <button onClick={() => setMode("main")}
            style={{ background:"transparent", border:"1px solid #3a3228", color:"#6a6058", padding:"10px 16px", fontSize:9, letterSpacing:1, cursor:"pointer" }}>
            ←
          </button>
        </div>
      </div>
    </div>
  );

  if (mode === "import") return (
    <div style={{ position:"fixed", inset:0, zIndex:9993, background:"rgba(8,7,6,0.94)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div style={{ background:"#141210", border:"1px solid #2a2520", borderTop:"2px solid "+accent, maxWidth:400, width:"100%", padding:24 }}>
        <div style={{ fontSize:8, letterSpacing:4, color:"#6a6058", marginBottom:4 }}>YORHA ◈ ИМПОРТ ДАННЫХ</div>
        <div style={{ fontSize:13, fontWeight:700, color:accent, letterSpacing:3, marginBottom:16 }}>ЗАГРУЗИТЬ СОХРАНЕНИЕ</div>
        <div style={{ fontSize:9, color:"#c44", marginBottom:12, lineHeight:1.8 }}>
          ⚠ Текущий прогресс будет заменён!
        </div>
        <textarea value={importText} onChange={e=>setImportText(e.target.value)}
          placeholder="Вставь код сохранения сюда..."
          style={{
            width:"100%", height:100, background:"#181614", border:"1px solid #3a3228",
            color:"#9a9088", fontSize:9, padding:10, resize:"none", outline:"none",
            fontFamily:"'Courier New',monospace", wordBreak:"break-all",
          }}/>
        {importError && <div style={{ fontSize:9, color:"#c44", marginTop:6 }}>{importError}</div>}
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button onClick={handleImport} disabled={!importText.trim()}
            onMouseEnter={e=>{if(importText.trim()){e.target.style.background=accent;e.target.style.color="#0f0e0d";}}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=accent;}}
            style={{ flex:1, background:"transparent", border:"1px solid "+(importText.trim()?accent:"#4a4438"), color:importText.trim()?accent:"#4a4438", padding:"10px", fontSize:9, letterSpacing:2, cursor:importText.trim()?"pointer":"not-allowed", transition:"all 0.2s" }}>
            ЗАГРУЗИТЬ ◈
          </button>
          <button onClick={() => { setMode("main"); setImportError(""); }}
            style={{ background:"transparent", border:"1px solid #3a3228", color:"#6a6058", padding:"10px 16px", fontSize:9, letterSpacing:1, cursor:"pointer" }}>
            ←
          </button>
        </div>
      </div>
    </div>
  );

  if (mode === "fixing") return (
    <div style={{ position:"fixed", inset:0, zIndex:9993, background:"rgba(8,7,6,0.94)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div style={{ background:"#141210", border:"1px solid #2a2520", borderTop:"2px solid "+accent, maxWidth:400, width:"100%", padding:24 }}>
        <div style={{ fontSize:8, letterSpacing:4, color:"#6a6058", marginBottom:4 }}>YORHA ◈ ДИАГНОСТИКА</div>
        <div style={{ fontSize:13, fontWeight:700, color:accent, letterSpacing:3, marginBottom:16 }}>ПОЧИНИТЬ СТАТЫ</div>
        <div style={{ background:"#0a0908", border:"1px solid #1a1814", padding:10, maxHeight:200, overflowY:"auto", marginBottom:12 }}>
          {fixLog.length === 0 && <div style={{ fontSize:8, color:"#4a4438" }}>Сканирование...</div>}
          {fixLog.map((line, i) => (
            <div key={i} style={{ fontSize:8, color: line.startsWith("✓") ? "#44bb88" : "#5a5248", marginBottom:2 }}>{line}</div>
          ))}
        </div>
        {fixDone && <div style={{ fontSize:9, color:"#44bb88", marginBottom:12, letterSpacing:1 }}>✓ ГОТОВО — статы исправлены</div>}
        <button onClick={() => { setMode("main"); setFixLog([]); setFixDone(false); }}
          style={{ width:"100%", background:"transparent", border:"1px solid #3a3228", color:"#6a6058", padding:"10px", fontSize:9, letterSpacing:2, cursor:"pointer" }}>
          ← НАЗАД
        </button>
      </div>
    </div>
  );

  // Main screen
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9993, background:"rgba(8,7,6,0.94)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div style={{ background:"#141210", border:"1px solid #2a2520", borderTop:"2px solid "+accent, maxWidth:400, width:"100%", padding:24 }}>
        <button onClick={onClose} style={{ position:"absolute", top:12, right:12, background:"none", border:"none", color:"#5a5248", fontSize:18, cursor:"pointer" }}>✕</button>
        <div style={{ fontSize:8, letterSpacing:4, color:"#6a6058", marginBottom:4 }}>YORHA ◈ УПРАВЛЕНИЕ ДАННЫМИ</div>
        <div style={{ fontSize:13, fontWeight:700, color:accent, letterSpacing:3, marginBottom:20 }}>СОХРАНЕНИЯ</div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <button onClick={() => setMode("export")}
            onMouseEnter={e=>{e.target.style.background=accent;e.target.style.color="#0f0e0d";}}
            onMouseLeave={e=>{e.target.style.background="transparent";e.target.style.color=accent;}}
            style={{ background:"transparent", border:"1px solid "+accent, color:accent, padding:"14px", fontSize:10, letterSpacing:3, cursor:"pointer", transition:"all 0.2s", textAlign:"left" }}>
            ◈ ЭКСПОРТ — сохранить прогресс
          </button>
          <button onClick={() => setMode("import")}
            onMouseEnter={e=>{e.target.style.borderColor="#c44";e.target.style.color="#c44";}}
            onMouseLeave={e=>{e.target.style.borderColor="#4a4438";e.target.style.color="#7a7068";}}
            style={{ background:"transparent", border:"1px solid #3a3228", color:"#7a7068", padding:"14px", fontSize:10, letterSpacing:3, cursor:"pointer", transition:"all 0.2s", textAlign:"left" }}>
            ◇ ИМПОРТ — загрузить сохранение
          </button>
          <button onClick={handleFixStats}
            onMouseEnter={e=>{e.target.style.borderColor="#9a7048";e.target.style.color="#9a7048";}}
            onMouseLeave={e=>{e.target.style.borderColor="#2a2520";e.target.style.color="#4a4438";}}
            style={{ background:"transparent", border:"1px solid #2a2520", color:"#4a4438", padding:"14px", fontSize:10, letterSpacing:3, cursor:"pointer", transition:"all 0.2s", textAlign:"left" }}>
            ⬡ ПОЧИНИТЬ СТАТЫ — исправить характеристики
          </button>
        </div>

        <div style={{ marginTop:16, fontSize:9, color:"#4a4438", lineHeight:1.8 }}>
          Экспорт создаёт код который можно сохранить в заметках.<br/>
          Импорт загружает прогресс с другого устройства.
        </div>
      </div>
    </div>
  );
}

function HelpPopup({ onClose, accent }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:9996, background:"rgba(8,7,6,0.94)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}
      onClick={onClose}>
      <div style={{ background:"#181614", border:"1px solid #2a2520", borderTop:"2px solid "+accent, maxWidth:420, width:"100%", maxHeight:"85vh", overflowY:"auto", padding:24, position:"relative" }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position:"absolute", top:12, right:12, background:"none", border:"none", color:"#5a5248", fontSize:18, cursor:"pointer", lineHeight:1 }}>✕</button>

        <div style={{ fontSize:8, letterSpacing:4, color:"#6a6058", marginBottom:4 }}>YORHA ◈ СПРАВОЧНЫЙ АРХИВ</div>
        <div style={{ fontSize:14, fontWeight:700, color:accent, letterSpacing:3, marginBottom:20 }}>ПРОТОКОЛ 10H</div>

        {[
          { title:"◆ МИССИИ", body:"Нажми кнопку получения заданий — система выдаст три директивы из командования. В день можно запросить миссии не более трёх раз, счётчик сбрасывается в полночь.\n\nМиссии бывают трёх видов. Обычные — составляют большинство заданий, делятся по уровню угрозы: низкая, средняя, высокая. Чем выше угроза — тем больше Памяти и фрагментов в награде. Эвенты (⚠) — срочные директивы с двойной наградой, но строгим таймером. Логические директивы (⬡) — интеллектуальные задачи: тебе задают вопрос или головоломку, нужно ввести правильный ответ. Даётся три попытки — не угадаешь, задание аннулируется.\n\nКнопка ↺ на карточке позволяет заменить неподходящую миссию на другую. Доступно три замены, после чего функция блокируется на час." },
          { title:"◈ ПРОШИВКА", body:"Это твой уровень развития. Выполняй миссии — шкала Памяти будет заполняться. Когда шкала переполнится, прошивка обновится до следующей версии.\n\nПо мере роста открываются новые формы персонажа и улучшаются его характеристики — ключевые пороги на v5.0 и v9.0." },
          { title:"◈ ЮНИТ", body:"Здесь отображается твой статус, активная форма и коллекция разблокированных форм. Кликни на любую из открытых форм, чтобы переключиться на неё — каждая меняет внешний вид и цветовую палитру интерфейса.\n\nТакже во вкладке ЮНИТ находятся достижения. Их больше двадцати — открываются за выполнение миссий, победы в бою и сбор предметов." },
          { title:"⚔ ОРУЖИЕ", body:"Экипированное оружие влияет на то, какие миссии тебе предлагает командование — у каждого оружия свой стиль директив. Более редкое оружие дополнительно даёт бонус к получаемой Памяти за подходящие задания.\n\nОружие выпадает из архива (гача) и надевается во вкладке БРОНЯ." },
          { title:"✦ АРХИВ (ГАЧА)", body:"Накопи фрагменты ◈ и извлеки запись из архива — стоимостью 10 фрагментов за одно извлечение.\n\nИз архива можно получить: титулы (отображаются под именем персонажа), цветовые схемы (меняют акцентный цвет всего интерфейса), оружие (влияет на стиль миссий), лор-файлы (цитаты и факты из вселенной NieR:Automata), а также снаряжение для боевого режима.\n\nЕсли выпал дубликат снаряжения — это нормально, каждый экземпляр уникален и имеет свои характеристики. Дубликаты всего остального автоматически конвертируются во фрагменты." },
          { title:"🛡 БРОНЯ (СНАРЯЖЕНИЕ)", body:"Во вкладке БРОНЯ ты экипируешь и улучшаешь своё снаряжение: шлем, нагрудник, перчатки, поножи и оружие. Каждый предмет имеет набор характеристик — атаку, здоровье, шанс крита и урон от крита.\n\nЕсли собрать несколько предметов одного сета, активируются бонусы комплекта. Для улучшения снаряжения нужны материалы, которые добываются в боевом режиме." },
          { title:"⚡ БОЕВОЙ РЕЖИМ", body:"Во вкладке БОЙ ты сражаешься с машинами волна за волной. Враги становятся сильнее с каждым раундом, каждые десять волн появляется босс.\n\nЗа победы выпадают материалы для улучшения брони. Каждый день обновляются три боевые миссии с дополнительными наградами в виде Памяти и фрагментов — не забывай их выполнять." },
          { title:"◇ ЖУРНАЛ", body:"История всех выполненных миссий. Каждый день в начале журнала появляется новый факт или цитата из вселенной NieR:Automata." },
          { title:"◈ РЕДКОСТЬ", body:"Предметы из архива делятся на четыре градации редкости — обычный, редкий, эпический и легендарный. Легендарные выпадают крайне редко.\n\nДубликаты снаряжения уникальны — их можно хранить несколько. Дубликаты всего остального конвертируются во фрагменты: чем редкостнее предмет, тем больше фрагментов ты получишь." },
          { title:"📅 ЕЖЕДНЕВНАЯ НАГРАДА", body:"При первом входе в день появляется экран с календарём недели. Забирай награду — каждый день приносит фрагменты, а в конце полной недели тебя ждёт бонус побольше.\n\nПропустить день не страшно — неделя не сбрасывается, ты просто продолжаешь с того дня, на котором остановился." },
          { title:"💾 СОХРАНЕНИЯ", body:"Прогресс не сохраняется автоматически. При каждом входе в игру тебе предлагают загрузить сохранение — используй кнопку 💾 внизу экрана, чтобы экспортировать код перед выходом и импортировать его при следующем запуске." },
        ].map((s, i) => (
          <div key={i} style={{ marginBottom:16, paddingBottom:16, borderBottom:"1px solid #1e1c18" }}>
            <div style={{ fontSize:10, color:accent, letterSpacing:2, fontWeight:700, marginBottom:6 }}>{s.title}</div>
            <div style={{ fontSize:10, color:"#7a7068", lineHeight:1.8 }}>{s.body}</div>
          </div>
        ))}

        <div style={{ fontSize:8, color:"#302b24", letterSpacing:2, textAlign:"center", marginTop:8 }}>
          YoRHa No.10 Type H · Протокол активирован
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// EQUIPMENT TAB
// ═══════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
// INBOX MODAL — Входящие директивы
// ═══════════════════════════════════════════════════════

function InboxModal({ inbox, onClose, onRead, onReadAll, onClear, accent }) {
  const [selected, setSelected] = useState(null);
  const unreadCount = inbox.filter(l => !l.read).length;
  const tc = { "НИЗКАЯ":"#4a9", "СРЕДНЯЯ":"#ca7", "ВЫСОКАЯ":"#c44" };

  return (
    <div
      onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:9993, background:"rgba(8,7,6,0.94)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{ background:"#141210", border:"1px solid #2a2520", borderTop:"2px solid "+accent, maxWidth:440, width:"100%", maxHeight:"82vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"16px 20px 12px", borderBottom:"1px solid #1e1c18", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
          <div>
            <div style={{ fontSize:8, letterSpacing:4, color:"#5a5248", marginBottom:3 }}>YORHA ◈ КОМАНДОВАНИЕ</div>
            <div style={{ fontSize:13, fontWeight:700, color:accent, letterSpacing:2 }}>
              ✉ ВХОДЯЩИЕ ДИРЕКТИВЫ
              {unreadCount > 0 && <span style={{ marginLeft:8, fontSize:9, color:"#c44", border:"1px solid #c44", padding:"1px 5px" }}>+{unreadCount}</span>}
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {unreadCount > 0 && (
              <button onClick={onReadAll}
                style={{ background:"transparent", border:"1px solid #3a3228", color:"#6a6058", padding:"5px 10px", fontSize:8, letterSpacing:1, cursor:"pointer" }}>
                ВСЕ ПРОЧИТАНЫ
              </button>
            )}
            {inbox.length > 0 && (
              <button onClick={onClear}
                onMouseEnter={e => { e.target.style.borderColor="#c44"; e.target.style.color="#c44"; }}
                onMouseLeave={e => { e.target.style.borderColor="#4a4438"; e.target.style.color="#6a6058"; }}
                style={{ background:"transparent", border:"1px solid #3a3228", color:"#6a6058", padding:"5px 10px", fontSize:8, letterSpacing:1, cursor:"pointer", transition:"all 0.2s" }}>
                ОЧИСТИТЬ
              </button>
            )}
            <button onClick={onClose}
              style={{ background:"none", border:"none", color:"#5a5248", fontSize:18, cursor:"pointer", lineHeight:1 }}>✕</button>
          </div>
        </div>

        {/* Content */}
        {inbox.length === 0 ? (
          <div style={{ padding:"44px 20px", textAlign:"center", color:"#3a342e" }}>
            <div style={{ fontSize:28, marginBottom:10 }}>✉</div>
            <div style={{ fontSize:9, letterSpacing:2 }}>ДИРЕКТИВЫ ОТСУТСТВУЮТ</div>
            <div style={{ fontSize:9, color:"#221f1a", marginTop:6 }}>Запроси миссии — получишь инструктаж</div>
          </div>
        ) : selected ? (
          /* Detail view */
          <div style={{ padding:"20px", overflowY:"auto", flex:1 }}>
            <button onClick={() => setSelected(null)}
              style={{ background:"transparent", border:"none", color:"#6a6058", fontSize:9, letterSpacing:2, cursor:"pointer", padding:"0 0 16px 0", display:"flex", alignItems:"center", gap:6 }}>
              ← НАЗАД К СПИСКУ
            </button>
            <div style={{ fontSize:7, letterSpacing:3, color:"#5a5248", marginBottom:4 }}>ДИРЕКТИВА · КОМАНДОВАНИЕ БУНКЕРА</div>
            <div style={{ fontSize:12, fontWeight:700, color: selected.isEvent ? "#ff4444" : "#d8d0c4", letterSpacing:1, marginBottom:6 }}>
              {selected.isEvent && "⚠ "}{selected.missionTitle}
            </div>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              <span style={{ fontSize:8, color: tc[selected.missionThreat] || "#9a9088", border:"1px solid "+(tc[selected.missionThreat]||"#9a9088"), padding:"1px 6px", letterSpacing:1 }}>
                {selected.missionThreat}
              </span>
              <span style={{ fontSize:8, color:"#5a5248", letterSpacing:1 }}>
                {new Date(selected.createdAt).toLocaleString("ru", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
              </span>
            </div>
            <div style={{ width:"100%", height:1, background:"#1a1814", marginBottom:16 }}/>
            <div style={{ fontSize:11, color:"#9a9088", lineHeight:1.9, letterSpacing:0.5 }}>
              {selected.hint}
            </div>
            <div style={{ marginTop:20, fontSize:8, color:"#302b24", letterSpacing:2, textAlign:"right" }}>
              — КОМАНДОВАНИЕ YORHA ◈
            </div>
          </div>
        ) : (
          /* List view */
          <div style={{ overflowY:"auto", flex:1 }}>
            {[...inbox].reverse().map((letter) => (
              <div key={letter.id}
                onClick={() => { setSelected(letter); if (!letter.read) onRead(letter.id); }}
                onMouseEnter={e => e.currentTarget.style.background = "#161412"}
                onMouseLeave={e => e.currentTarget.style.background = letter.read ? "transparent" : "#181614"}
                style={{
                  padding:"12px 20px",
                  borderBottom:"1px solid #0d0d0d",
                  cursor:"pointer",
                  background: letter.read ? "transparent" : "#181614",
                  borderLeft: letter.read ? "2px solid transparent" : "2px solid "+accent,
                  transition:"background 0.15s",
                }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, minWidth:0 }}>
                    <span style={{ fontSize:10, flexShrink:0 }}>{letter.read ? "✉" : "📨"}</span>
                    <span style={{ fontSize:10, fontWeight: letter.read ? 400 : 700, color: letter.read ? "#6a6058" : "#d8d0c4", letterSpacing:0.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {letter.isEvent && <span style={{ color:"#ff4444" }}>⚠ </span>}
                      {letter.missionTitle}
                    </span>
                  </div>
                  {!letter.read && <span style={{ fontSize:7, color:accent, letterSpacing:1, flexShrink:0, marginLeft:8 }}>НОВОЕ</span>}
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                  <span style={{ fontSize:8, color: tc[letter.missionThreat] || "#9a9088" }}>{letter.missionThreat}</span>
                  <span style={{ fontSize:8, color:"#302b24" }}>·</span>
                  <span style={{ fontSize:8, color:"#4a4438" }}>
                    {new Date(letter.createdAt).toLocaleString("ru", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                  </span>
                </div>
                <div style={{ fontSize:9, color:"#4a4438", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {letter.hint.slice(0, 72)}…
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:"10px 20px", borderTop:"1px solid #0d0d0d", flexShrink:0 }}>
          <div style={{ fontSize:8, color:"#221f1a", letterSpacing:2, textAlign:"center" }}>
            ДИРЕКТИВЫ · ПРОТОКОЛ 10H · YORHA
          </div>
        </div>
      </div>
    </div>
  );
}



// ═══════════════════════════════════════════════════════
// LOGIC MISSION MODAL
// ═══════════════════════════════════════════════════════
function LogicModal({ mission, onClose, onSuccess, onFail, accent }) {
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(mission.attemptsLeft ?? 3);
  const [status, setStatus] = useState(null); // "wrong" | "correct" | "failed"
  const [shake, setShake] = useState(false);

  const isChoice = mission.type === "choice";
  const isNumber = mission.type === "number";

  const checkAnswer = (val) => {
    const raw = (val ?? answer).toString().trim().toLowerCase();
    const correct = mission.answers.some(a => a.toString().toLowerCase() === raw);

    if (correct) {
      setStatus("correct");
      setTimeout(() => onSuccess(mission), 1200);
      return;
    }

    const left = attempts - 1;
    setAttempts(left);
    setShake(true);
    setTimeout(() => setShake(false), 500);

    if (left <= 0) {
      setStatus("failed");
      setTimeout(() => onFail(mission), 1800);
    } else {
      setStatus("wrong");
      setTimeout(() => setStatus(null), 1200);
    }
    setAnswer("");
  };

  // Pass remaining attempts to onClose so they aren't lost
  const handleClose = () => onClose(attempts);

  const attColor = attempts === 3 ? "#4a9" : attempts === 2 ? "#ca7" : "#c44";
  const LC = "#b0a898"; // logic accent colour

  return (
    <div onClick={handleClose}
      style={{ position:"fixed", inset:0, zIndex:9993, background:"rgba(8,7,6,0.97)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background:"#141210",
          border:"1px solid #2a2520",
          borderTop:"2px solid " + LC,
          maxWidth:460, width:"100%",
          boxShadow: "0 0 30px #b0a89822",
          animation: shake ? "shake 0.4s ease" : "none",
        }}>

        {/* Header */}
        <div style={{ padding:"16px 20px 12px", borderBottom:"1px solid #1e1c18" }}>
          <div style={{ fontSize:8, letterSpacing:4, color:"#6a6058", marginBottom:4 }}>YORHA ◈ ЛОГИЧЕСКАЯ ДИРЕКТИВА</div>
          <div style={{ fontSize:12, fontWeight:700, color: LC, letterSpacing:1 }}>{mission.title}</div>
          <div style={{ display:"flex", gap:10, marginTop:8, alignItems:"center" }}>
            <span style={{ fontSize:8, color: attColor, border:"1px solid " + attColor, padding:"2px 7px", letterSpacing:1 }}>
              ПОПЫТОК: {attempts}
            </span>
            <span style={{ fontSize:8, color:"#6a6058", letterSpacing:1 }}>ПОВЫШЕННАЯ НАГРАДА</span>
          </div>
        </div>

        {/* Task */}
        <div style={{ padding:"20px" }}>
          <div style={{ fontSize:11, color:"#999", lineHeight:1.8, marginBottom:20 }}>{mission.desc}</div>

          {/* Status feedback */}
          {status === "correct" && (
            <div style={{ padding:"10px", background:"#0a1a0a", border:"1px solid #4a9", color:"#4a9", fontSize:10, letterSpacing:1, textAlign:"center", marginBottom:16 }}>
              ✓ ВЕРНО — ДИРЕКТИВА ВЫПОЛНЕНА
            </div>
          )}
          {status === "wrong" && (
            <div style={{ padding:"10px", background:"#1a0a0a", border:"1px solid #c44", color:"#c44", fontSize:10, letterSpacing:1, textAlign:"center", marginBottom:16 }}>
              ✗ НЕВЕРНО — ОСТАЛОСЬ ПОПЫТОК: {attempts}
            </div>
          )}
          {status === "failed" && (
            <div style={{ padding:"10px", background:"#1a0a0a", border:"1px solid #c44", color:"#c44", fontSize:10, letterSpacing:1, textAlign:"center", marginBottom:16 }}>
              ✗ ДИРЕКТИВА ПРОВАЛЕНА — ЗАДАНИЕ АННУЛИРОВАНО
            </div>
          )}

          {/* Hint */}
          {attempts < 3 && status !== "correct" && status !== "failed" && (
            <div style={{ fontSize:9, color:"#5a5248", fontStyle:"italic", marginBottom:14, padding:"8px 12px", borderLeft:"2px solid #222" }}>
              ПОДСКАЗКА: {mission.hint}
            </div>
          )}

          {/* Input — choice */}
          {isChoice && status !== "correct" && status !== "failed" && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {mission.options.map((opt, i) => (
                <button key={i} onClick={() => checkAnswer(opt)}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = LC; e.currentTarget.style.color = LC; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#3a342e"; e.currentTarget.style.color = "#7a7068"; }}
                  style={{ background:"transparent", border:"1px solid #2a2520", color:"#7a7068", padding:"10px 14px", fontSize:10, textAlign:"left", cursor:"pointer", letterSpacing:0.5, transition:"all 0.15s" }}>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Input — word/number */}
          {!isChoice && status !== "correct" && status !== "failed" && (
            <div style={{ display:"flex", gap:8 }}>
              <input
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                onKeyDown={e => e.key === "Enter" && answer.trim() && checkAnswer()}
                placeholder={isNumber ? "Введи число..." : "Введи ответ..."}
                style={{
                  flex:1, background:"#181614", border:"1px solid #3a3228", color:"#d8d0c4",
                  padding:"10px 12px", fontSize:11, fontFamily:"'Courier New',monospace",
                  outline:"none", letterSpacing:1,
                }}
              />
              <button onClick={() => answer.trim() && checkAnswer()}
                onMouseEnter={e => { e.currentTarget.style.background = LC; e.currentTarget.style.color = "#0f0e0d"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = LC; }}
                style={{ background:"transparent", border:"1px solid " + LC, color: LC, padding:"10px 16px", fontSize:9, letterSpacing:2, cursor:"pointer", transition:"all 0.15s" }}>
                ВВОД
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:"10px 20px", borderTop:"1px solid #0d0d0d" }}>
          <div style={{ fontSize:8, color:"#221f1a", letterSpacing:2, textAlign:"center" }}>
            КОГНИТИВНЫЙ ПРОТОКОЛ · YORHA ◈
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [S, setS]               = useState(() => mkState({}));
  const [showWelcome, setShowWelcome] = useState(true);
  const [booting, setBooting]   = useState(true);
  const [tab, setTab_]           = useState("missions");
  const setTab = (newTab) => { if (newTab !== 'battle' && pauseBattleRef.current) pauseBattleRef.current(); setTab_(newTab); };
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
  const [showInbox, setShowInbox] = useState(false);
  const [logicMission, setLogicMission] = useState(null); // { mission, attempts }
  const [simulationMission, setSimulationMission] = useState(null);
  const pauseBattleRef = useRef(null); // holds BattleTab's pause function

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
    setToast({ msg, color: color || "#d8d0c4" });
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
      { id:"ep1",  icon:"▲",  t:"ЭПИЧЕСКИЙ АРХИВ",     ok: s => (s.inventory||[]).some(e => { const id = typeof e === 'object' ? e.id : e; const item = GACHA_POOL.find(i => i.id === id); return item && item.rarity === "epic"; }) },
      { id:"lg1",  icon:"★",  t:"ЛЕГЕНДАРНЫЙ АРХИВ",   ok: s => (s.inventory||[]).some(e => { const id = typeof e === 'object' ? e.id : e; const item = GACHA_POOL.find(i => i.id === id); return item && item.rarity === "legendary"; }) },
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
      if (m.isLogic) { reward.memory = Math.round(reward.memory * 1.6); reward.frags = reward.frags + 2; }
      // Weapon bonus — check gear.weapon first, fallback to equipped.weapon
      const gear = prev.gear || {};
      const wid = resolveBaseId(gear.weapon || (prev.equipped && prev.equipped.weapon), prev.inventory);
      const ws = wid ? (WEAPON_STYLES[wid] || EQUIPMENT_WEAPON_STYLES[wid]) : null;
      let memBonus = 0;
      if (ws) {
        if (ws.bonus === "both") memBonus = Math.round(reward.memory * ws.bonusPct / 100);
        else if (ws.bonus === m.spec) memBonus = Math.round(reward.memory * ws.bonusPct / 100);
      }
      // Set bonus
      const { mult, extraFrags } = getSetMemMultiplier(gear, prev.inventory || [], GACHA_POOL);
      const totalMem = Math.round((reward.memory + memBonus) * mult);
      const totalFrags = reward.frags + extraFrags;
      // Apply memory
      let mem = prev.mem + totalMem;
      let fw = prev.fw;
      let memMax = prev.memMax;
      let levelsGained = 0;
      const levelsReached = [];
      while (mem >= memMax) { mem -= memMax; fw++; memMax = xpFor(fw); levelsGained++; levelsReached.push(fw); }
      const up = levelsGained > 0;
      let levelFrags = 0;
      for (const lvl of levelsReached) { levelFrags += (lvl === 5 || lvl === 9) ? 20 : 10; }
      const cog = m.spec === "intellect" ? Math.min(10, prev.cog + 1) : prev.cog;
      const syn = m.spec === "creativity" ? Math.min(10, prev.syn + 1) : prev.syn;
      const frags = prev.frags + totalFrags + levelFrags;
      const totalFragsEarned = (prev.totalFragsEarned || 0) + totalFrags + levelFrags;
      const setNote = mult > 1 ? ` [×${mult.toFixed(2)} сет]` : "";
      const bonusStr = memBonus > 0 ? ` (+${memBonus}⚔)` : "";
      const entry = {
        time: new Date().toLocaleTimeString("ru"),
        text: m.title + " [+" + totalMem + bonusStr + setNote + " MEM, +" + totalFrags + " ◈]",
        report: report || null,
        threat: m.threat,
      };
      let ns = {
        ...prev,
        fw, mem, memMax, cog, syn, frags, totalFragsEarned,
        log: [entry, ...(prev.log || [])].slice(0, 30),
        missions: (prev.missions || []).filter(x => x.id !== m.id),
        completed: [{ ...m, at: Date.now() }, ...(prev.completed || [])],
        inbox: (prev.inbox || []).filter(l => l.missionId !== m.id),
      };
      ns = runChecks(ns);
      if (up) {
        setTimeout(() => { setFwUp(fw); setTimeout(() => setFwUp(null), 2800); }, 300);
        setTimeout(() => showDialogue("levelUp", { fw }), 3200);
        const isFormUnlock = levelsReached.some(lvl => lvl === 5 || lvl === 9);
        const fragRewardMsg = isFormUnlock ? "НОВАЯ ФОРМА · +" + levelFrags + " ◈" : "+" + levelFrags + " ◈ ЗА УРОВЕНЬ";
        setTimeout(() => toast$(fragRewardMsg, "#c8a882"), 3400);
      }
      const bonusMsg = memBonus > 0 ? ` +${memBonus}⚔` : "";
      toast$("+" + totalMem + bonusMsg + (mult>1?` ×${mult.toFixed(2)}`:"") + " MEM  +" + totalFrags + " ◈", "#4a9");
      return ns;
    });
  }, [runChecks, toast$]);

  const completeSimulation = useCallback((m, simResult) => {
    // simResult: { outcome: 'full'|'partial'|'fail', fragsCollected, total }
    setS(prev => {
      const base = rewardByThreat(m.threat);
      if (m.isEvent) { base.memory = Math.round(base.memory * 2); base.frags = base.frags * 2; }

      // Множитель по outcome
      // full    = 1.0 (полная награда)
      // partial = пропорционально собранным фрагментам, минимум 25%
      // fail    = 8% от базы MEM, 0 фрагментов
      let memMult, fragReward;
      if (simResult.outcome === "full") {
        memMult = 1.0;
        fragReward = base.frags;
      } else if (simResult.outcome === "partial") {
        const ratio = simResult.total > 0 ? simResult.fragsCollected / simResult.total : 0;
        memMult = Math.max(0.25, ratio);
        fragReward = simResult.fragsCollected;
      } else {
        // fail
        memMult = 0.08;
        fragReward = 0;
      }

      // Бонус оружия и сета — применяем только на full/partial
      const gear = prev.gear || {};
      const wid = resolveBaseId(gear.weapon || (prev.equipped && prev.equipped.weapon), prev.inventory);
      const ws = wid ? (WEAPON_STYLES[wid] || EQUIPMENT_WEAPON_STYLES[wid]) : null;
      let memBonus = 0;
      if (ws && simResult.outcome !== "fail") {
        if (ws.bonus === "both") memBonus = Math.round(base.memory * ws.bonusPct / 100);
        else if (ws.bonus === m.spec) memBonus = Math.round(base.memory * ws.bonusPct / 100);
      }
      const { mult, extraFrags } = getSetMemMultiplier(gear, prev.inventory || [], GACHA_POOL);
      const setMult = simResult.outcome === "fail" ? 1 : mult;
      const setFrags = simResult.outcome === "fail" ? 0 : extraFrags;

      const totalMem = Math.round((base.memory * memMult + memBonus) * setMult);
      const totalFrags = fragReward + setFrags;

      let mem = prev.mem + totalMem;
      let fw = prev.fw;
      let memMax = prev.memMax;
      let levelsGained = 0;
      const levelsReached = [];
      while (mem >= memMax) { mem -= memMax; fw++; memMax = xpFor(fw); levelsGained++; levelsReached.push(fw); }
      const up = levelsGained > 0;
      let levelFrags = 0;
      for (const lvl of levelsReached) { levelFrags += (lvl === 5 || lvl === 9) ? 20 : 10; }

      const cog = m.spec === "intellect" ? Math.min(10, prev.cog + 1) : prev.cog;
      const syn = m.spec === "creativity" ? Math.min(10, prev.syn + 1) : prev.syn;
      const frags = prev.frags + totalFrags + levelFrags;
      const totalFragsEarned = (prev.totalFragsEarned || 0) + totalFrags + levelFrags;

      const outcomeLabel = simResult.outcome === "full" ? "SIM:УСПЕХ" : simResult.outcome === "partial" ? "SIM:ЧАСТИЧНО" : "SIM:ПРОВАЛ";
      const entry = {
        time: new Date().toLocaleTimeString("ru"),
        text: m.title + " [" + outcomeLabel + " +" + totalMem + " MEM, +" + totalFrags + " ◈]",
        report: null,
        threat: m.threat,
      };

      let ns = {
        ...prev,
        fw, mem, memMax, cog, syn, frags, totalFragsEarned,
        log: [entry, ...(prev.log || [])].slice(0, 30),
        missions: (prev.missions || []).filter(x => x.id !== m.id),
        completed: [{ ...m, at: Date.now() }, ...(prev.completed || [])],
        inbox: (prev.inbox || []).filter(l => l.missionId !== m.id),
      };
      ns = runChecks(ns);

      if (up) {
        setTimeout(() => { setFwUp(fw); setTimeout(() => setFwUp(null), 2800); }, 300);
        setTimeout(() => showDialogue("levelUp", { fw }), 3200);
        const isFormUnlock = levelsReached.some(lvl => lvl === 5 || lvl === 9);
        const fragRewardMsg = isFormUnlock ? "НОВАЯ ФОРМА · +" + levelFrags + " ◈" : "+" + levelFrags + " ◈ ЗА УРОВЕНЬ";
        setTimeout(() => toast$(fragRewardMsg, "#c8a882"), 3400);
      }

      const simColor = simResult.outcome === "full" ? "#4a9" : simResult.outcome === "partial" ? "#ca7" : "#c44";
      toast$("SIM " + outcomeLabel.split(":")[1] + " +" + totalMem + " MEM +" + totalFrags + " ◈", simColor);
      return ns;
    });
  }, [runChecks, toast$]);

  const doGacha = useCallback(() => {
    if (S.frags < 10) { toast$("Нужно 10 ◈ фрагментов", "#c44"); return; }
    const result = pullGacha();
    const isEquipment = result.type === "equipment";
    // Calculate dupe status BEFORE setS using current inventory snapshot
    const alreadyHas = inArr(S.inventory || [], result.id);
    const isDupe = isEquipment ? alreadyHas : alreadyHas;
    const dupeFrags = (result.type === "weapon" && alreadyHas) ? (DUPE_FRAGS[result.rarity] || 5)
                    : (isEquipment && alreadyHas) ? (DUPE_FRAGS[result.rarity] || 5)
                    : (!isEquipment && alreadyHas) ? (DUPE_FRAGS[result.rarity] || 5) : 0;

    // Генерируем iid и фиксируем статы сразу при дропе
    const newIid = (isEquipment || result.type === "weapon") ? result.id + "_" + Date.now() : null;
    const newRolledStats = newIid ? rollItemStats({ ...result, slot: result.slot || (result.type === "weapon" ? "weapon" : undefined), iid: newIid }) : null;

    setS(prev => {
      const inv = [...(prev.inventory||[])];

      if (isEquipment) {
        inv.push({ id: result.id, iid: newIid, rolledStats: newRolledStats });
      } else if (result.type === "weapon") {
        inv.push({ id: result.id, iid: newIid, rolledStats: newRolledStats });
      } else {
        // Non-equipment (titles, colors, lore): dupe → convert to frags
        if (alreadyHas) {
          // Don't push to inventory, just add frags below
        } else {
          inv.push(result.id);
        }
      }

      let ns = {
        ...prev,
        frags: prev.frags - 10 + dupeFrags,
        inventory: inv,
      };
      ns = runChecks(ns);
      return ns;
    });

    // Pass dupe info and iid to overlay
    setGachaResult({ ...result, isDupe, dupeFrags, iid: newIid });
    setTimeout(() => showDialogue("gacha"), 200);
  }, [S.frags, S.inventory, toast$, runChecks]);

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
      if (newState.claimedDate !== today) {
        setTimeout(() => setShowDaily(true), 2000);
      }
    } catch(e) {
      toast$("ОШИБКА ЗАГРУЗКИ", "#c44");
    }
  };

  const fixItemStats = () => {
    const SLOT_PRIMARY_FIX = { weapon:["atk"], chest:["hp","atk"], head:["hp","crit"], gloves:["atk","critdmg"], boots:["hp","crit"] };
    const SLOT_SECONDARIES_FIX = { weapon:["crit","critdmg","hp"], chest:["crit","critdmg","atk","hp"], head:["atk","critdmg","crit","hp"], gloves:["hp","crit","critdmg","atk"], boots:["atk","crit","critdmg","hp"] };
    const SLOT_BY_ID_FIX = {};
    [...EQUIPMENT_POOL, ...GACHA_POOL].forEach(p => { if (p.slot) SLOT_BY_ID_FIX[p.id] = p.slot; });

    const log = [];
    let fixedCount = 0;

    setS(prev => {
      const newInv = (prev.inventory || []).map(item => {
        if (!item || typeof item !== 'object') return item;
        const slot = SLOT_BY_ID_FIX[item.id];
        if (!slot) return item;
        const rs = item.rolledStats;
        const expectedSec = slot === "weapon" ? 1 : 2;
        const secs = rs?.secondaries || [];
        const uniqueSecs = new Set(secs);
        const nonZero = Object.entries(rs?.stats || {}).filter(([k,v]) => v > 0 && k !== rs?.primary).length;
        const needsFix = !rs || secs.length !== expectedSec || uniqueSecs.size !== expectedSec || nonZero !== expectedSec;
        if (!needsFix) { log.push(`· ${item.id} — ок`); return item; }
        const newStats = rollItemStats({ ...( EQUIPMENT_POOL.find(p=>p.id===item.id) || GACHA_POOL.find(p=>p.id===item.id) || {}), slot, iid: item.iid });
        const secStr = (newStats.secondaries||[]).map(s=>`${s}:${newStats.stats[s]}`).join(", ");
        log.push(`✓ ${item.id} → ${newStats.primary}:${newStats.stats[newStats.primary]} | ${secStr}`);
        fixedCount++;
        return { ...item, rolledStats: newStats };
      });
      return { ...prev, inventory: newInv };
    });

    if (fixedCount === 0) log.push("Все предметы уже имеют корректные статы.");
    return { fixed: fixedCount, log };
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
        claimedDate: today,
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
      const ms = genMissions();
      const now = Date.now();
      const wid = ms.map((m, i) => {
        const isEvent = m.isEvent || false;
        const lifetime = missionLifetime(m.threat, isEvent, m.isLogic);
        return {
          ...m,
          id: "m" + now + i,
          isEvent,
          expiresAt: now + lifetime,
          createdAt: now,
        };
      });

      // ── INBOX: создаём письмо с советом для каждой новой миссии ──
      const newLetters = wid.map(m => ({
        id: "l" + m.id,
        missionId: m.id,
        missionTitle: m.title,
        missionThreat: m.threat,
        isEvent: m.isEvent,
        hint: getMissionHint(m),
        read: false,
        createdAt: now,
      }));

      setS(p => ({
        ...p,
        missions: [...(p.missions||[]), ...wid],
        inbox: [...(p.inbox||[]), ...newLetters].slice(-20),
        genToday: (p.genDate === today ? p.genToday : 0) + 1,
        genDate: today,
      }));
      toast$("ЗАДАНИЯ ПОЛУЧЕНЫ ▶  ✉ +" + wid.length);
      if (wid.some(m => m.isEvent)) setTimeout(() => showDialogue("missionEvent"), 800);
    } catch(e) {
      console.error("Mission error:", e.message, e.stack);
      toast$("ОШИБКА: " + e.message.slice(0,40), "#c44");
    }
  };

  const markLetterRead = (letterId) => {
    setS(p => ({
      ...p,
      inbox: (p.inbox||[]).map(l => l.id === letterId ? { ...l, read: true } : l),
    }));
  };

  const markAllRead = () => {
    setS(p => ({ ...p, inbox: (p.inbox||[]).map(l => ({ ...l, read: true })) }));
  };

  const clearInbox = () => {
    setS(p => ({ ...p, inbox: [] }));
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
      const ms = genMissions();
      const rerollNow = Date.now();
      const picked = ms[0];
      const isEvent = picked.isEvent || false;
      const isLogic = picked.isLogic || false;
      const lifetime = missionLifetime(picked.threat, isEvent, isLogic);
      // Для обычных миссий сохраняем исходный таймер; для логических и ивент — пересчитываем
      const newExpiresAt = (!isLogic && !isEvent) ? mission.expiresAt : rerollNow + lifetime;
      const newCreatedAt = (!isLogic && !isEvent) ? mission.createdAt : rerollNow;
      const newM = { ...picked, id: missionId, isEvent, isLogic, expiresAt: newExpiresAt, createdAt: newCreatedAt };
      const newCount2 = newCount + 1;
      const newLetter = {
        id: "l" + missionId + "_r" + rerollNow,
        missionId: missionId,
        missionTitle: newM.title,
        missionThreat: newM.threat,
        isEvent: newM.isEvent,
        hint: getMissionHint(newM),
        read: false,
        createdAt: rerollNow,
      };
      setS(p => ({
        ...p,
        missions: (p.missions||[]).map(m => m.id === missionId ? newM : m),
        inbox: [...(p.inbox||[]).filter(l => l.missionId !== missionId), newLetter].slice(-20),
        rerollCount: newCount2,
        rerollBlock: newCount2 >= 3 ? Date.now() + 3600000 : p.rerollBlock,
      }));
      toast$("МИССИЯ ОБНОВЛЕНА ◈  ✉ +1");
    } catch(e) {
      toast$("ОШИБКА ПЕРЕГЕНЕРАЦИИ", "#c44");
    }
  };

  if (showWelcome) return <WelcomeScreen onNew={startNew} onLoad={loadSave} accent={"#c8b89a"} />;
  if (booting) return <Boot onDone={() => setBooting(false)} />;

  const fid    = (typeof S.form === "string" && FORMS[S.form]) ? S.form : "sentinel";
  const form   = FORMS[fid];
  const img    = IMGS[fid];
  const equippedColorItem = S.equipped && S.equipped.color ? GACHA_POOL.find(i => i.id === S.equipped.color) : null;
  const A      = (equippedColorItem && equippedColorItem.value) ? equippedColorItem.value : "#c8b89a";
  const missions  = (S.missions || []).sort((a,b) => (b.isEvent?1:0) - (a.isEvent?1:0));
  const inbox     = S.inbox || [];
  const unreadCount = inbox.filter(l => !l.read).length;
  const completed = S.completed || [];
  const dirs      = S.dirs      || [];
  const log       = S.log       || [];
  const achi      = S.achi      || [];
  const unlocked  = S.unlocked  || ["sentinel"];
  const inventory = S.inventory || [];

  const equippedTitle  = S.equipped && S.equipped.title  ? GACHA_POOL.find(i => i.id === S.equipped.title)  : null;
  const equippedWeapon = S.gear?.weapon
    ? GACHA_POOL.find(i => i.id === resolveBaseId(S.gear.weapon, S.inventory))
    : (S.equipped?.weapon ? GACHA_POOL.find(i => i.id === S.equipped.weapon) : null);

  return (
    <div style={{ background:"#0f0e0d", minHeight:"100vh", fontFamily:"'Courier New',monospace", color:"#d8d0c4", maxWidth:480, margin:"0 auto", position:"relative" }}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes eventPulse{0%,100%{box-shadow:0 0 12px #cc000033}50%{box-shadow:0 0 20px #cc000066}}
        @keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
        @keyframes glow{0%,100%{opacity:0.6}50%{opacity:1}}
        @keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}
        @keyframes ashDrift{0%{transform:translateY(0px) translateX(0px);opacity:0}10%{opacity:1}90%{opacity:0.4}100%{transform:translateY(-110vh) translateX(20px);opacity:0}}
        *{box-sizing:border-box}
        input::placeholder{color:#332e28;font-family:'Courier New',monospace}
        button{font-family:'Courier New',monospace;cursor:pointer}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-track{background:#0f0e0d}
        ::-webkit-scrollbar-thumb{background:#2a2520}
        .ash-particle{position:absolute;border-radius:50%;background:#c8b8a0;pointer-events:none;animation:ashDrift linear infinite;}
      `}</style>

      {/* Background layers — пепельный мир */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none", overflow:"hidden" }}>
        {/* Персонаж */}
        <div style={{ position:"absolute", right:-20, bottom:0, width:360, height:"92vh", backgroundImage:"url("+img+")", backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"bottom right", opacity:0.08, transition:"all 1.2s ease" }}/>
        {/* Тёплый подсвет снизу — как тлеющие угли */}
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% 110%, rgba(180,130,80,0.07) 0%, transparent 55%)" }}/>
        {/* Затемнение по краям */}
        <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% 40%, transparent 40%, rgba(0,0,0,0.55) 100%)" }}/>
        {/* Горизонтальные градиенты */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(90deg,rgba(0,0,0,0.5) 0%,transparent 35%,transparent 65%,rgba(0,0,0,0.5) 100%)" }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(180deg,rgba(0,0,0,0.6) 0%,transparent 12%,transparent 78%,rgba(0,0,0,0.7) 100%)" }}/>
        {/* Частицы пепла */}
        {[
          {left:"8%",  size:1.8, dur:"18s", delay:"0s",   opacity:0.18},
          {left:"19%", size:1.2, dur:"24s", delay:"4s",   opacity:0.12},
          {left:"31%", size:2.2, dur:"20s", delay:"8s",   opacity:0.15},
          {left:"44%", size:1.0, dur:"28s", delay:"2s",   opacity:0.10},
          {left:"57%", size:1.6, dur:"22s", delay:"12s",  opacity:0.14},
          {left:"68%", size:1.3, dur:"26s", delay:"6s",   opacity:0.11},
          {left:"79%", size:2.0, dur:"19s", delay:"16s",  opacity:0.16},
          {left:"88%", size:1.1, dur:"30s", delay:"9s",   opacity:0.09},
          {left:"25%", size:1.5, dur:"21s", delay:"14s",  opacity:0.13},
          {left:"63%", size:1.8, dur:"25s", delay:"3s",   opacity:0.12},
          {left:"42%", size:1.2, dur:"23s", delay:"18s",  opacity:0.10},
          {left:"72%", size:1.4, dur:"27s", delay:"7s",   opacity:0.14},
        ].map((p,i) => (
          <div key={i} className="ash-particle" style={{
            left: p.left,
            bottom: "-4px",
            width: p.size+"px",
            height: p.size+"px",
            opacity: p.opacity,
            animationDuration: p.dur,
            animationDelay: p.delay,
          }}/>
        ))}
      </div>
      {/* Тонкие горизонтальные сканлайны */}
      <div style={{ position:"fixed", inset:0, zIndex:1, pointerEvents:"none", background:"repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.06) 2px,rgba(0,0,0,0.06) 4px)" }}/>

      {/* Overlays */}
      {toast && <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:"#0f0e0d", border:"1px solid "+toast.color, color:toast.color, padding:"7px 20px", fontSize:10, letterSpacing:2, zIndex:9998, animation:"slideDown 0.3s ease", whiteSpace:"nowrap" }}>{toast.msg}</div>}
      {fwUp && <FwUpOverlay fw={fwUp} accent={A} />}
      {formUnlock && <UnlockFormOverlay fid={formUnlock} onClose={() => setFormUnlock(null)} />}
      {gachaResult && <GachaOverlay result={gachaResult} onClose={() => setGachaResult(null)} />}
      {showDaily && <DailyRewardPopup state={S} onClaim={claimDaily} onClose={() => setShowDaily(false)} accent={A} />}
      {showHelp && <HelpPopup onClose={() => setShowHelp(false)} accent={A} />}
      {showSave && <SaveManager state={S} onImport={importSave} onClose={() => setShowSave(false)} onFixStats={fixItemStats} accent={A} />}
      {dialogue && <DialoguePopup key={dialogue.id} text={dialogue.text} formId={fid} onClose={() => setDialogue(null)} />}
      {logicMission && (
        <LogicModal
          mission={logicMission}
          accent={A}
          onClose={(attemptsLeft) => {
            // Save remaining attempts so they aren't reset if reopened
            if (attemptsLeft !== undefined && attemptsLeft < 3) {
              setS(p => ({
                ...p,
                missions: (p.missions||[]).map(x =>
                  x.id === logicMission.id ? { ...x, attemptsLeft } : x
                ),
              }));
              setLogicMission(prev => prev ? { ...prev, attemptsLeft } : null);
            }
            setLogicMission(null);
          }}
          onSuccess={(m) => {
            setLogicMission(null);
            completeMission(m, null);
            toast$("⬡ ЛОГИЧЕСКАЯ ДИРЕКТИВА ВЫПОЛНЕНА", "#b0a898");
          }}
          onFail={(m) => {
            setLogicMission(null);
            // Удаляем миссию как истёкшую
            setS(p => ({ ...p, missions: (p.missions||[]).filter(x => x.id !== m.id), inbox: (p.inbox||[]).filter(l => l.missionId !== m.id) }));
            toast$("⬡ ДИРЕКТИВА АННУЛИРОВАНА", "#c44");
          }}
        />
      )}
      {showInbox && (
        <InboxModal
          inbox={inbox}
          accent={A}
          onClose={() => setShowInbox(false)}
          onRead={markLetterRead}
          onReadAll={markAllRead}
          onClear={clearInbox}
        />
      )}
      {reportMission && <ReportModal
        mission={reportMission}
        accent={A}
        onConfirm={(report) => { completeMission(reportMission, report); setReportMission(null); setTimeout(() => showDialogue("missionComplete", { threat: reportMission.threat }), 500); }}
        onCancel={() => setReportMission(null)}
      />}
      {simulationMission && (
        <SimulationMode
          mission={simulationMission}
          fid={fid}
          onComplete={(simResult) => {
            const m = simulationMission;
            setSimulationMission(null);
            completeSimulation(m, simResult);
            setTimeout(() => showDialogue("missionComplete", { threat: m.threat }), 500);
          }}
          onClose={() => setSimulationMission(null)}
        />
      )}

      {/* Help button */}
      <div style={{ position:"fixed", bottom:20, right:16, zIndex:20, display:"flex", flexDirection:"column", gap:8 }}>
        <button onClick={() => setShowSave(true)}
          style={{ background:"#1a1710", border:"1px solid #3a3228", color:"#6a6058", width:36, height:36, borderRadius:"50%", fontSize:12, cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center" }}
          onMouseEnter={e => { e.target.style.borderColor=A; e.target.style.color=A; }}
          onMouseLeave={e => { e.target.style.borderColor="#4a4438"; e.target.style.color="#7a7068"; }}
          title="Управление сохранениями">💾</button>
        <button onClick={() => setShowHelp(true)}
          style={{ background:"#1a1710", border:"1px solid #3a3228", color:"#6a6058", width:36, height:36, borderRadius:"50%", fontSize:14, fontWeight:700, cursor:"pointer", transition:"all 0.2s", display:"flex", alignItems:"center", justifyContent:"center" }}
          onMouseEnter={e => { e.target.style.borderColor=A; e.target.style.color=A; }}
          onMouseLeave={e => { e.target.style.borderColor="#4a4438"; e.target.style.color="#7a7068"; }}
          title="Справка">?</button>
      </div>

      <div style={{ position:"relative", zIndex:2 }}>

        {/* ── HEADER ── */}
        <div style={{ borderBottom:"1px solid #1e1c18", padding:"16px 16px 14px", background:"rgba(15,14,13,0.95)", position:"relative" }}>
          <div style={{ position:"absolute", top:0, left:0, right:0, height:1, background:"linear-gradient(90deg,transparent,"+A+"55 35%,"+A+"55 65%,transparent)" }}/>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div>
                <div style={{ fontSize:8, letterSpacing:3, color:"#5a5248", marginBottom:3 }}>YORHA ◈ TACTICAL LOG</div>
                <div style={{ fontSize:16, fontWeight:700, letterSpacing:3, color:A, transition:"color 0.8s" }}>No.10 Type H</div>
                <div style={{ fontSize:8, color:"#6a6058", letterSpacing:2, marginTop:2 }}>
                  {form.name}
                  {equippedTitle ? <span style={{ color:"#9a9088" }}> · {equippedTitle.name}</span> : null}
                </div>
                {equippedWeapon && <div style={{ fontSize:8, color:"#5a5048", marginTop:2 }}>⚔ {equippedWeapon.name}</div>}
              </div>
              <button
                onClick={() => setShowInbox(true)}
                title="Входящие директивы"
                style={{
                  position:"relative",
                  background:"transparent",
                  border:"1px solid "+(unreadCount > 0 ? A : "#3a342e"),
                  color: unreadCount > 0 ? A : "#5a5248",
                  width:30, height:30,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:14, cursor:"pointer",
                  transition:"all 0.2s",
                  flexShrink:0,
                  animation: unreadCount > 0 ? "glow 1.5s ease-in-out infinite" : "none",
                }}>
                ✉
                {unreadCount > 0 && (
                  <span style={{
                    position:"absolute", top:-5, right:-5,
                    background:"#c44", color:"#fff",
                    fontSize:7, fontWeight:700,
                    width:14, height:14, borderRadius:"50%",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:8, letterSpacing:2, color:"#5a5248" }}>ПРОШИВКА</div>
              <div style={{ fontSize:22, fontWeight:700, color:A, letterSpacing:2 }}>v{S.fw}.0</div>
              <div style={{ fontSize:8, color:"#6a6058" }}>
                <span style={{ color:"#c8a882" }}>◈ {S.frags}</span>
                <span style={{ color:"#5a5248" }}> · </span>
                <span>{completed.length} МИССИЙ</span>
              </div>
            </div>
          </div>
          <MemBar mem={S.mem} max={S.memMax} accent={A} />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:12 }}>
            {[{abbr:"COG",label:"КОГНИТИВ",val:S.cog,color:"#a09080"},{abbr:"SYN",label:"СИНТЕЗ",val:S.syn,color:"#c8a882"}].map(sp => (
              <div key={sp.abbr}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:8, letterSpacing:2, marginBottom:2 }}>
                  <span style={{ color:"#6a6058" }}>[{sp.abbr}] {sp.label}</span>
                  <span style={{ color:sp.color }}>{String(sp.val).padStart(2,"0")}/10</span>
                </div>
                <div style={{ height:2, background:"#1a1814" }}>
                  <div style={{ height:"100%", width:(sp.val*10)+"%", background:sp.color, transition:"width 0.6s" }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display:"flex", background:"rgba(15,14,13,0.95)", borderBottom:"1px solid #1e1c18", position:"sticky", top:0, zIndex:10 }}>
          {[["missions","◆ МИССИИ"],["equip","⚔ БРОНЯ"],["unit","◈ ЮНИТ"],["gacha","✦ АРХИВ"],["log","◇ ЖУРНАЛ"],["battle","⚡ БОЙ"]].map(([id,l]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ flex:1, padding:"10px 2px", border:"none", background:"transparent", color:tab===id?"#d8d0c4":"#4a4540", borderBottom:"1px solid "+(tab===id?A:"transparent"), fontSize:7, letterSpacing:1, transition:"all 0.2s" }}>
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
                      <div style={{ fontSize:8, color:"#6a6058", letterSpacing:2 }}>
                        ГЕНЕРАЦИЙ СЕГОДНЯ: <span style={{ color: gensLeft>0?A:"#c44" }}>{genToday}/3</span>
                      </div>
                      {rerollBlocked && (
                        <div style={{ fontSize:8, color:"#c44", letterSpacing:1 }}>
                          ↺ разблок: {fmtTime(rerollTimeLeft)}
                        </div>
                      )}
                      {!rerollBlocked && rerollsLeft < 3 && (
                        <div style={{ fontSize:8, color:"#6a6058", letterSpacing:1 }}>
                          ↺ осталось: {rerollsLeft}
                        </div>
                      )}
                    </div>
                    <button onClick={fetchMissions} disabled={loading || limitReached}
                      onMouseEnter={e => { if(!loading&&!limitReached){ e.target.style.background=A; e.target.style.color="#0f0e0d"; } }}
                      onMouseLeave={e => { e.target.style.background="transparent"; e.target.style.color=(loading||limitReached)?"#4a4438":A; }}
                      style={{ width:"100%", marginBottom:14, background:"transparent", border:"1px solid "+((loading||limitReached)?"#3a342e":A), color:(loading||limitReached)?"#4a4438":A, padding:"12px", fontSize:9, letterSpacing:3, transition:"all 0.3s", cursor:(loading||limitReached)?"not-allowed":"pointer" }}>
                      {loading ? ">> ПОЛУЧЕНИЕ ДАННЫХ С БУНКЕРА..."
                        : limitReached ? ">> ЛИМИТ ИСЧЕРПАН · СБРОС: " + fmtTime(msLeft)
                        : ">> ЗАПРОСИТЬ ЗАДАНИЯ У КОМАНДОВАНИЯ [" + gensLeft + "]"}
                    </button>
                    {missions.map(m => <MCard key={m.id} m={m} accent={A} onDone={handleDone}
                      onReroll={rerollMission} rerollsLeft={rerollsLeft} rerollBlocked={rerollBlocked} now={now}
                      onLogic={(m) => setLogicMission(m)}
                      onSimulation={(m) => setSimulationMission(m)} />)}
                  </>
                );
              })()}
              {missions.length === 0 && !loading && (
                <div style={{ textAlign:"center", padding:"44px 0", color:"#3a342e" }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>◆</div>
                  <div style={{ fontSize:9, letterSpacing:2 }}>НЕТ АКТИВНЫХ МИССИЙ</div>
                  <div style={{ fontSize:9, color:"#221f1a", marginTop:6 }}>Запроси задания у командования</div>
                </div>
              )}
              {completed.length > 0 && (
                <div style={{ marginTop:20 }}>
                  <div style={{ fontSize:8, color:"#3a342e", letterSpacing:3, marginBottom:8, borderTop:"1px solid #0d0d0d", paddingTop:12 }}>АРХИВ ВЫПОЛНЕННЫХ [{completed.length}]</div>
                  {completed.slice(0,5).map((m,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #0a0a0a", fontSize:9, color:"#302b24" }}>
                      <span>◇ {m.title}</span>
                      <span style={{ color:"#4a9" }}>+{m.memory}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── EQUIP TAB ── */}
          {tab === "equip" && (
            <EquipmentTab S={S} setS={setS} accent={A} toastFn={toast$} showDialogue={showDialogue} fid={fid} gachaPool={GACHA_POOL} weaponStyles={WEAPON_STYLES} rarityColors={RARITY_COLORS} inArr={inArr} />
          )}

          {/* ── UNIT TAB ── */}
          {tab === "unit" && (
            <div>
              <div style={{ fontSize:8, letterSpacing:3, color:"#5a5248", marginBottom:8 }}>АКТИВНАЯ ФОРМА</div>
              <div style={{ position:"relative", border:"1px solid "+A+"33", borderTop:"2px solid "+A, marginBottom:20, overflow:"hidden" }}>
                <div style={{ height:320, backgroundImage:"url("+img+")", backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"center bottom", filter:"drop-shadow(0 0 28px "+A+"33)", transition:"all 0.8s" }}/>
                <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"12px 16px", background:"linear-gradient(0deg,#000 65%,transparent)" }}>
                  <div style={{ fontSize:8, color:"#5a5248", letterSpacing:3, marginBottom:3 }}>YoRHa No.10 Type H</div>
                  <div style={{ fontSize:14, color:A, letterSpacing:3, fontWeight:700 }}>{form.name}</div>
                  <div style={{ fontSize:9, color:"#6a6058", marginTop:4, lineHeight:1.6 }}>{form.desc}</div>
                </div>
              </div>

              <div style={{ fontSize:8, letterSpacing:3, color:"#5a5248", marginBottom:8 }}>КОЛЛЕКЦИЯ ФОРМ</div>
              {["sentinel","abstract","reborn"].map(id => {
                const f = FORMS[id];
                const unl = inArr(unlocked, id);
                const isAct = fid === id;
                return (
                  <div key={id} onClick={() => unl && setS(p => ({ ...p, form: id }))}
                    style={{ display:"flex", gap:12, alignItems:"center", padding:"10px 12px", marginBottom:6, border:"1px solid "+(isAct?f.accent:"#221f1a"), background:isAct?"#161412":"#111009", opacity:unl?1:0.3, cursor:unl?"pointer":"default", transition:"all 0.2s" }}>
                    <div style={{ width:48, height:64, backgroundImage:unl?"url("+IMGS[id]+")":"none", backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"center bottom", background:unl?"none":"#181614", border:unl?"none":"1px solid #1e1c18", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {!unl && <span style={{ fontSize:18, color:"#6a6058" }}>◈</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:10, color:unl?f.accent:"#6a6058", letterSpacing:2, fontWeight:700 }}>{f.name}</div>
                      <div style={{ fontSize:9, color:unl?"#3a3a3a":"#6a6058", marginTop:3 }}>{unl ? f.desc.slice(0,50)+"…" : "ЗАКРЫТО — v"+f.unlockFw+".0"}</div>
                    </div>
                    {isAct && <span style={{ color:f.accent, fontSize:14 }}>◈</span>}
                  </div>
                );
              })}

              <div style={{ marginTop:16, fontSize:8, letterSpacing:3, color:"#5a5248", marginBottom:4 }}>
                ДОСТИЖЕНИЯ <span style={{color:"#6a6058"}}>({achi.length}/28)</span>
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
                  <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", marginBottom:5, border:"1px solid "+(e?"#4a4438":"#1e1c18"), background:e?"#181614":"#111009" }}>
                    <span style={{ fontSize:14, color:e?"#d8d0c4":"#302b24" }}>{a.icon}</span>
                    <span style={{ fontSize:10, color:e?"#9a9088":"#3a3a3a", letterSpacing:1 }}>{a.t}</span>
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
              <div style={{ border:"1px solid #221f1a", borderTop:"2px solid "+A, padding:20, marginBottom:20, textAlign:"center" }}>
                <div style={{ fontSize:8, letterSpacing:3, color:"#6a6058", marginBottom:8 }}>АРХИВ ДАННЫХ YoRHa</div>
                <div style={{ fontSize:11, color:"#9a9088", lineHeight:1.8, marginBottom:16 }}>
                  За каждую выполненную миссию ты получаешь<br/>
                  <span style={{ color:"#c8a882" }}>◈ фрагменты данных</span>. Накопи 10 — и извлеки запись из архива.
                </div>
                <div style={{ fontSize:28, color:"#c8a882", marginBottom:4 }}>◈ {S.frags}</div>
                <div style={{ fontSize:9, color:"#5a5248", marginBottom:20 }}>фрагментов накоплено</div>
                <div style={{ height:4, background:"#1a1814", borderRadius:2, marginBottom:20, overflow:"hidden" }}>
                  <div style={{ height:"100%", width: Math.min(100, (S.frags % 10) * 10) + "%", background: A, transition:"width 0.4s" }}/>
                </div>
                <button onClick={doGacha} disabled={S.frags < 10}
                  onMouseEnter={e => { if(S.frags>=10){ e.target.style.background=A; e.target.style.color="#0f0e0d"; } }}
                  onMouseLeave={e => { e.target.style.background="transparent"; e.target.style.color=S.frags<10?"#4a4438":A; }}
                  style={{ background:"transparent", border:"1px solid "+(S.frags<10?"#3a342e":A), color:S.frags<10?"#4a4438":A, padding:"12px 32px", fontSize:10, letterSpacing:3, transition:"all 0.3s" }}>
                  {S.frags < 10 ? "НЕДОСТАТОЧНО ФРАГМЕНТОВ" : "✦ ИЗВЛЕЧЬ ИЗ АРХИВА (-10 ◈)"}
                </button>
              </div>

              {/* Inventory */}
              {inventory.length > 0 && (
                <div>
                  <div style={{ fontSize:8, letterSpacing:3, color:"#5a5248", marginBottom:10 }}>КОЛЛЕКЦИЯ [{inventory.length}]</div>
                  {(() => {
                    // Для оружий — каждый экземпляр отдельно; для остальных — уникально по id
                    const nonWeapon = GACHA_POOL.filter(item => item.type !== "weapon" && inArr(inventory, item.id));
                    const weaponInstances = inventory
                      .filter(e => { const id = typeof e === 'object' ? e.id : e; return GACHA_POOL.some(g => g.id === id && g.type === "weapon"); })
                      .map(e => { const id = typeof e === 'object' ? e.id : e; const iid = typeof e === 'object' ? e.iid : id; const rolledStats = typeof e === 'object' ? e.rolledStats : undefined; return { ...GACHA_POOL.find(g => g.id === id), iid, ...(rolledStats ? { rolledStats } : {}) }; })
                      .filter(Boolean);
                    const allItems = [...nonWeapon.map(i => ({...i, iid: null})), ...weaponInstances];
                    return allItems.map(item => {
                    const rc = RARITY_COLORS[item.rarity] || "#9a9088";
                    const typeLabels = { title:"ТИТУЛ", color:"СХЕМА", lore:"АРХИВ", weapon:"ОРУЖИЕ" };
                    const isWeapon = item.type === "weapon";
                    const isEquipped = !isWeapon && S.equipped && (
                      (item.type === "title" && S.equipped.title === item.id) ||
                      (item.type === "color" && S.equipped.color === item.id)
                    );
                    const weaponEquipped = isWeapon && (
                      (item.iid && S.gear?.weapon === item.iid) ||
                      resolveBaseId(S.gear?.weapon, S.inventory) === item.id
                    );
                    return (
                      <div key={item.iid || item.id}
                        onClick={() => {
                          if (isWeapon) return;
                          setS(p => {
                            const eq = { ...(p.equipped || {}) };
                            if (item.type === "title") eq.title = isEquipped ? null : item.id;
                            if (item.type === "color") eq.color = isEquipped ? null : item.id;
                            return { ...p, equipped: eq };
                          });
                        }}
                        style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 12px", marginBottom:6, border:"1px solid "+((isEquipped||weaponEquipped)?rc:"#221f1a"), background:(isEquipped||weaponEquipped)?"#161412":"#111009", cursor:isWeapon?"default":"pointer", transition:"all 0.2s" }}>
                        <span style={{ fontSize:18, color:rc }}>{item.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:2 }}>
                            <span style={{ fontSize:10, color:"#d8d0c4", fontWeight:700 }}>{item.name}</span>
                            <span style={{ fontSize:8, color:rc, letterSpacing:1 }}>{item.rarity.toUpperCase()}</span>
                            <span style={{ fontSize:8, color:"#5a5248" }}>{typeLabels[item.type]}</span>
                          </div>
                          <div style={{ fontSize:9, color:"#6a6058", lineHeight:1.4 }}>
                            {item.desc}
                            {isWeapon && WEAPON_STYLES[item.id] ? <span style={{color:"#c8a882"}}> · +{WEAPON_STYLES[item.id].bonusPct}% к памяти</span> : null}
                          </div>
                          {isWeapon && item.iid && (
                            <div style={{ fontSize:7, color:"#5a5248", marginTop:2, letterSpacing:1 }}>
                              Lv.{(S.gearLevels||{})[item.iid] || 1}
                            </div>
                          )}
                          {isWeapon && <div style={{ fontSize:7, color:"#4a4438", marginTop:1, letterSpacing:1 }}>⚔ Надевается во вкладке БРОНЯ</div>}
                        </div>
                        {(isEquipped || weaponEquipped) && <span style={{ color:rc, fontSize:10, letterSpacing:1 }}>◈</span>}
                      </div>
                    );
                  })})()}
                </div>
              )}

              {inventory.length === 0 && (
                <div style={{ textAlign:"center", padding:40, color:"#221f1a" }}>
                  <div style={{ fontSize:32, marginBottom:10 }}>✦</div>
                  <div style={{ fontSize:9, letterSpacing:2 }}>АРХИВ ПУСТ</div>
                  <div style={{ fontSize:9, color:"#2a2520", marginTop:6 }}>Выполняй миссии, чтобы собрать фрагменты</div>
                </div>
              )}


              {/* Gacha catalog */}
              <div style={{ marginTop:16, padding:"14px 16px", border:"1px solid #1e1c18" }}>
                <div style={{ fontSize:8, letterSpacing:3, color:"#5a5248", marginBottom:12 }}>ЧТО МОЖНО ПОЛУЧИТЬ</div>
                {["title","weapon","color","lore","equipment"].map(type => {
                  const labels = { title:"ТИТУЛЫ", weapon:"ОРУЖИЕ", color:"ЦВЕТОВЫЕ СХЕМЫ", lore:"ЛОР-ФАЙЛЫ", equipment:"СНАРЯЖЕНИЕ" };
                  const descs  = { title:"Отображаются под именем персонажа", weapon:"Влияют на стиль миссий и дают бонус к памяти", color:"Меняют цвет акцента всего интерфейса", lore:"Цитаты и факты из вселенной NieR:Automata", equipment:"Броня, шлемы, перчатки, поножи, оружие — по градации редкости" };
                  const items  = type === "equipment" ? EQUIPMENT_POOL : GACHA_POOL.filter(i => i.type === type);
                  return (
                    <div key={type} style={{ marginBottom:14 }}>
                      <div style={{ fontSize:9, color:"#9a9088", letterSpacing:2, marginBottom:4 }}>{labels[type]}</div>
                      <div style={{ fontSize:9, color:"#5a5248", marginBottom:6 }}>{descs[type]}</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {items.map(item => (
                          <span key={item.id} style={{ fontSize:8, color:RARITY_COLORS[item.rarity], border:"1px solid "+RARITY_COLORS[item.rarity]+"55", background:RARITY_COLORS[item.rarity]+"11", padding:"2px 7px", letterSpacing:1 }}>
                            {item.icon} {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rarity info */}
              <div style={{ marginTop:16, padding:"12px 14px", border:"1px solid #1e1c18" }}>
                <div style={{ fontSize:8, letterSpacing:3, color:"#4a4438", marginBottom:10 }}>ВЕРОЯТНОСТИ ИЗВЛЕЧЕНИЯ</div>
                {Object.entries(RARITY_WEIGHTS).map(([r, w]) => (
                  <div key={r} style={{ display:"flex", justifyContent:"space-between", fontSize:9, marginBottom:5, color:"#5a5248" }}>
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
              <div style={{ marginBottom:20, padding:"14px 16px", border:"1px solid #221f1a", borderLeft:"2px solid "+A+"44" }}>
                <div style={{ fontSize:8, letterSpacing:3, color:"#5a5248", marginBottom:10 }}>◈ ДАННЫЕ ДНЯ</div>
                <div style={{ fontSize:11, color:"#6a6058", fontStyle:"italic", lineHeight:1.8 }}>
                  {LORE_DB[Math.floor((Date.now() / 86400000)) % LORE_DB.length]}
                </div>
              </div>
              {log.length === 0 && (
                <div style={{ textAlign:"center", padding:40, color:"#221f1a" }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>◇</div>
                  <div style={{ fontSize:9, letterSpacing:2 }}>ЖУРНАЛ ПУСТ</div>
                </div>
              )}
              {log.map((e, i) => (
                <div key={i} style={{ paddingLeft:12, marginBottom:14, borderLeft:"1px solid "+(i===0?A:"#221f1a") }}>
                  <div style={{ fontSize:8, color:"#4a4438", marginBottom:2, letterSpacing:1 }}>{e.time}</div>
                  <div style={{ fontSize:10, color:i===0?"#9a9088":"#5a5248" }}>{e.text}</div>
                  {e.report && (
                    <div style={{ marginTop:6, padding:"6px 10px", background:"#181614", border:"1px solid #221f1a", borderLeft:"1px solid "+A+"44" }}>
                      <div style={{ fontSize:8, color:"#5a5248", letterSpacing:2, marginBottom:3 }}>ОТЧЁТ:</div>
                      <div style={{ fontSize:9, color:"#6a6058", lineHeight:1.7 }}>{e.report}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── BATTLE TAB — always mounted to preserve state ── */}
          <div style={{display: tab === "battle" ? "block" : "none"}}>
            <BattleTab S={S} setS={setS} accent={A} onToast={toast$} fid={fid} equipmentPool={EQUIPMENT_POOL} gachaPool={GACHA_POOL} onRegisterPause={(fn) => { pauseBattleRef.current = fn; }} onShowDialogue={(text) => setDialogue({ text, id: Date.now() })} />
          </div>

        </div>
      </div>
    </div>
  );
}
