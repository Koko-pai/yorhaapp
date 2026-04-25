import { useState, useEffect, useRef } from "react";

// ── Helpers ──
function getStatScale(level) {
  if (level >= 30) return 6.0;
  if (level >= 20) return 3.2;
  if (level >= 10) return 1.8;
  return 1 + (level - 1) * 0.085;
}
function calcStats(item) {
  if (!item) return { atk:0, hp:0, crit:0, critdmg:0 };
  const SLOT_BASE = {
    weapon:{ atk:4,hp:0,crit:1,critdmg:4 }, chest:{ atk:1,hp:10,crit:0,critdmg:0 },
    head:  { atk:1,hp:7, crit:2,critdmg:0 }, gloves:{ atk:3,hp:3,crit:2,critdmg:5 },
    boots: { atk:1,hp:8, crit:1,critdmg:2 },
  };
  const RARITY_MULT = { common:1, rare:1.4, epic:1.9, legendary:2.8 };
  const base = SLOT_BASE[item.slot] || { atk:0,hp:0,crit:0,critdmg:0 };
  const rm   = RARITY_MULT[item.rarity] || 1;
  const ls   = getStatScale(item.level || 1);
  return {
    atk:     Math.round(base.atk     * rm * ls),
    hp:      Math.round(base.hp      * rm * ls),
    crit:    Math.round(base.crit    * rm * ls * 10) / 10,
    critdmg: Math.round(base.critdmg * rm * ls * 10) / 10,
  };
}
function xpFor(fw) {
  const T = [0,100,250,900,1400,2000,2800,3800,5000,6400,8000];
  return T[fw] != null ? T[fw] : fw * 400;
}
function todayStr() { return new Date().toISOString().slice(0,10); }

// ── Shared constants ──
const EQUIP_SLOTS  = ["weapon","chest","head","gloves","boots"];
const SLOT_LABELS  = { weapon:"ОРУЖИЕ", chest:"БРОНЯ", head:"ШЛЕМ", gloves:"ПЕРЧАТКИ", boots:"ПОНОЖИ" };
const SLOT_ICONS   = { weapon:"⚔", chest:"◈", head:"◆", gloves:"◇", boots:"▽" };
const RARITY_COLORS = { common:"#888", rare:"#44aaff", epic:"#aa44cc", legendary:"#ffcc00" };

// ═══════════════════════════════════════════════════════
// BATTLE CONSTANTS
// ═══════════════════════════════════════════════════════

export const MATERIALS = {
  iron:   { id:"iron",   name:"Обломок железа",   icon:"⬡", color:"#888",    desc:"Фрагмент металла с уничтоженного юнита машин" },
  oil:    { id:"oil",    name:"Машинное масло",   icon:"◉", color:"#8a6",    desc:"Техническая жидкость из внутренностей машин" },
  core:   { id:"core",  name:"Фрагмент ядра",    icon:"◈", color:"#44aaff", desc:"Квантовый процессор машинного сознания" },
  memory: { id:"memory",name:"Память сети",       icon:"▣", color:"#aa44cc", desc:"Фрагмент коллективной машинной памяти" },
  alloy:  { id:"alloy", name:"Реликвийный сплав", icon:"★", color:"#c8a882", desc:"Сплав до-машинной эпохи. Прочнее любого металла" },
  signal: { id:"signal",name:"Сигнал YoRHa",      icon:"◆", color:"#8888cc", desc:"Зашифрованный фрагмент командного протокола" },
};

export const UPGRADE_COSTS = {
  weapon: [ null, {iron:5,core:2}, {iron:10,core:4,oil:3}, {iron:15,core:8,alloy:2}, {iron:25,core:12,alloy:5,signal:1} ],
  chest:  [ null, {iron:8,oil:3},  {iron:14,oil:6,core:2}, {iron:20,oil:10,core:5,alloy:2}, {iron:30,oil:15,core:8,alloy:4,signal:2} ],
  head:   [ null, {iron:6,oil:2},  {iron:10,oil:4,core:3}, {iron:16,oil:8,core:6,alloy:1},  {iron:24,oil:12,core:9,alloy:3,signal:1} ],
  gloves: [ null, {iron:5,core:1,memory:2}, {iron:9,core:3,memory:5}, {iron:15,core:6,memory:8,alloy:2}, {iron:22,core:10,memory:12,alloy:4,signal:1} ],
  boots:  [ null, {iron:7,oil:2,memory:2},  {iron:12,oil:5,memory:5,core:2}, {iron:18,oil:9,memory:8,core:6,alloy:1}, {iron:26,oil:14,memory:11,core:9,alloy:3,signal:1} ],
};

const ENEMIES = [
  { id:"biped",     name:"Двуногий юнит",  icon:"⬡", hp:40,  atk:8,  },
  { id:"goliath",   name:"Голиаф",         icon:"▲", hp:110, atk:18, },
  { id:"sphere",    name:"Машина-сфера",   icon:"◉", hp:28,  atk:10, },
  { id:"commander", name:"Командный узел", icon:"◆", hp:70,  atk:13, },
  { id:"pascal_jr", name:"Юнит Паскаля",   icon:"◇", hp:50,  atk:9,  },
];

const BOSSES = [
  { id:"adam",      name:"АДАМ",            icon:"★", hp:500, atk:36, isBoss:true },
  { id:"eve",       name:"ЕВА",             icon:"★", hp:460, atk:42, isBoss:true },
  { id:"goliath_b", name:"ГОЛИАФ-Σ",        icon:"★", hp:580, atk:28, isBoss:true },
  { id:"emil_boss", name:"ЭМИЛЬ-АЛЬФА",     icon:"★", hp:420, atk:32, isBoss:true },
  { id:"red_girl",  name:"КРАСНАЯ ДЕВОЧКА", icon:"★", hp:520, atk:38, isBoss:true },
];

// Abilities with clear, tested logic
export const ABILITIES = [
  {
    id:"pod", name:"POD FIRE", icon:"◈",
    desc:"Урон всем врагам на экране (60% ATK)",
    cooldown:8000, color:"#44aaff",
  },
  {
    id:"evade", name:"EVADE", icon:"▷",
    desc:"Рывок: 1.5с неуязвимость + 120% ATK по ближайшему",
    cooldown:5000, color:"#c8a882",
  },
  {
    id:"blade", name:"BLADE STORM", icon:"⚔",
    desc:"200% ATK по цели. Гарантированный крит если HP < 30%",
    cooldown:12000, color:"#cc4444",
  },
];

const BATTLE_MISSIONS_POOL = [
  { id:"bm1",  title:"ВЫЖИТЬ В 5 ВОЛНАХ",         desc:"Продержитесь не менее 5 волн",           req:{waves:5},       mem:30, frags:2 },
  { id:"bm2",  title:"ВЫЖИТЬ В 10 ВОЛНАХ",        desc:"Продержитесь не менее 10 волн",          req:{waves:10},      mem:55, frags:3 },
  { id:"bm3",  title:"ВЫЖИТЬ В 15 ВОЛНАХ",        desc:"Продержитесь не менее 15 волн",          req:{waves:15},      mem:80, frags:4 },
  { id:"bm4",  title:"УНИЧТОЖИТЬ 20 ПРОТИВНИКОВ", desc:"Уничтожьте 20 врагов за один бой",       req:{kills:20},      mem:35, frags:2 },
  { id:"bm5",  title:"УНИЧТОЖИТЬ 50 ПРОТИВНИКОВ", desc:"Уничтожьте 50 врагов за один бой",       req:{kills:50},      mem:65, frags:3 },
  { id:"bm6",  title:"ПОБЕДИТЬ БОССА",             desc:"Уничтожьте первого встреченного босса",  req:{bosses:1},      mem:60, frags:4 },
  { id:"bm7",  title:"ПОБЕДИТЬ 2 БОССОВ",          desc:"Уничтожьте двух боссов в одном бою",    req:{bosses:2},      mem:90, frags:5 },
  { id:"bm8",  title:"POD FIRE × 5",               desc:"Применить POD FIRE не менее 5 раз",     req:{podFire:5},     mem:25, frags:2 },
  { id:"bm9",  title:"ВОЛНА БЕЗ УРОНА",            desc:"Пройти любую волну без получения урона", req:{perfectWave:1}, mem:40, frags:3 },
  { id:"bm10", title:"EVADE × 3",                  desc:"Использовать уклонение не менее 3 раз",  req:{evades:3},      mem:20, frags:2 },
];

export function getDailyBattleMissions(dateStr) {
  const seed = dateStr.split("-").reduce((a,b) => a*31 + parseInt(b), 0);
  const pool = [...BATTLE_MISSIONS_POOL];
  const result = [];
  let s = seed;
  while (result.length < 3 && pool.length > 0) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const idx = s % pool.length;
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

export function getWaveDrops(wave, isBossWave) {
  const d = {};
  if (isBossWave) {
    // Boss drops: rarer, smaller amounts
    if (Math.random()<0.55) d.alloy  = 1;
    if (Math.random()<0.40) d.signal = 1;
    if (Math.random()<0.75) d.core   = 1 + (Math.random()<0.4 ? 1 : 0);
    if (Math.random()<0.65) d.memory = 1 + (Math.random()<0.35 ? 1 : 0);
  }
  // Common drops — less frequent, smaller stacks
  if (Math.random()<0.65) d.iron   = 1 + (wave>=8 && Math.random()<0.4 ? 1 : 0);
  if (Math.random()<0.45) d.oil    = 1;
  if (wave>=5  && Math.random()<0.25) d.core   = (d.core||0)+1;
  if (wave>=5  && Math.random()<0.20) d.memory = (d.memory||0)+1;
  if (wave>=15 && Math.random()<0.12) d.alloy  = (d.alloy||0)+1;
  if (wave>=20 && Math.random()<0.08) d.signal = (d.signal||0)+1;
  return d;
}

// Reduced base stats: HP 30+fw*6, ATK 4+fw*1
function computeUnitStats(gear, inventory, fw, gearLevels, equipPool, gachaPool) {
  const BASE_HP  = 30 + (fw||1) * 6;
  const BASE_ATK = 4  + (fw||1) * 1;
  let hp=BASE_HP, atk=BASE_ATK, crit=5, critdmg=40;
  for (const slot of EQUIP_SLOTS) {
    const id = (gear||{})[slot];
    if (!id) continue;
    const item = (equipPool||[]).find(e=>e.id===id) || (gachaPool||[]).find(e=>e.id===id);
    if (!item) continue;
    const lvl = (gearLevels||{})[slot] || 1;
    const s = calcStats({ ...item, slot: item.slot||slot, level: lvl });
    hp+=s.hp; atk+=s.atk; crit+=s.crit; critdmg+=s.critdmg;
  }
  return { hp, atk, crit:Math.min(crit,75), critdmg:Math.min(critdmg,200) };
}

function spawnWave(wave, isBoss) {
  const scale = 1 + wave * 0.07;
  if (isBoss) {
    const b = BOSSES[Math.floor(Math.random()*BOSSES.length)];
    const hp = Math.round(b.hp * scale);
    return [{ ...b, hp, maxHp:hp, uid:b.id+"_"+Date.now(), x:78, atkTimer:0 }];
  }
  const count = Math.min(7, 2 + Math.floor(wave/3));
  return Array.from({length:count}, (_,i) => {
    const base = ENEMIES[Math.floor(Math.random()*ENEMIES.length)];
    const hp   = Math.round(base.hp * scale);
    return { ...base, hp, maxHp:hp, atk:Math.round(base.atk*scale), uid:base.id+"_"+Date.now()+"_"+i, x:72+i*10, atkTimer:0 };
  });
}

// ═══════════════════════════════════════════════════════
// BATTLE TAB COMPONENT
// ═══════════════════════════════════════════════════════

export default function BattleTab({ S, setS, accent, onToast, fid, equipmentPool, gachaPool }) {
  const TICK     = 100;
  const ATK_CD   = 1000; // unit auto-attack interval ms
  const ENEMY_CD = 1200; // enemy attack interval ms

  // ── Render state ──
  const [phase, setPhase_]                  = useState("lobby");
  const setPhase = (p) => { G.current.phase = p; setPhase_(p); };
  const [displayHP, setDisplayHP]           = useState(100);
  const [displayMaxHP, setDisplayMaxHP]     = useState(100);
  const [displayEnemies, setDisplayEnemies] = useState([]);
  const [displayCDs, setDisplayCDs]         = useState({ pod:0, evade:0, blade:0 });
  const [wave, setWave]                     = useState(0);
  const [kills, setKills]                   = useState(0);
  const [battleLog, setBattleLog]           = useState([]);
  const [waveDrops, setWaveDrops]           = useState(null);
  const [sessionDrops, setSessionDrops]     = useState({});
  const [animHits, setAnimHits]             = useState([]);   // damage numbers
  const [unitAnim, setUnitAnim]             = useState("idle"); // idle|attack|skill|hit|evade
  const [enemyFlash, setEnemyFlash]         = useState({});    // uid -> true when attacking
  const [eventBoss, setEventBoss]           = useState(false);

  // ── All game state lives in ref (no stale closures) ──
  const G = useRef({
    phase:"lobby", unitHP:100, unitMaxHP:100,
    enemies:[], wave:0, kills:0, bossKills:0,
    sessionDrops:{}, podFires:0, evadeCount:0,
    hitThisWave:false, eventBoss:false,
    perfectWaveAchieved:false,
    cds:{ pod:0, evade:0, blade:0 },
    invincUntil:0, atkTimer:0,
    memEarned:0,
  });
  const tickRef = useRef(null);
  const FF = "'Courier New',monospace";

  const today        = todayStr();
  const battleMissions = getDailyBattleMissions(today);
  const doneMissions   = S.battleMissionsDate === today ? (S.battleMissionsDone||[]) : [];
  const gearLevels     = S.gearLevels || {};
  const unitStats      = computeUnitStats(S.gear||{}, S.inventory||[], S.fw||1, gearLevels, equipmentPool||[], gachaPool||[]);

  const formImg = fid==="reborn"   ? "https://i.ibb.co/4wPkwGsJ/nr-10h-reborn-warden-Photoroom.png"
                : fid==="abstract" ? "https://i.ibb.co/kgb7fW9d/nr-10h-abstract-savior-Photoroom.png"
                : "https://i.ibb.co/DgMDtFFk/nr-10h-sentinel-savior-Photoroom.png";

  const log = (msg, color) =>
    setBattleLog(p => [{ msg, color:color||"#888", id:Date.now()+Math.random() }, ...p].slice(0,25));

  // Flash unit animation briefly
  const flashUnit = (anim) => {
    setUnitAnim(anim);
    setTimeout(() => setUnitAnim("idle"), 400);
  };

  // Flash enemy attack indicator
  const flashEnemy = (uid) => {
    setEnemyFlash(p => ({ ...p, [uid]:true }));
    setTimeout(() => setEnemyFlash(p => { const n={...p}; delete n[uid]; return n; }), 300);
  };

  // Spawn damage number
  const spawnHit = (dmg, isCrit, x, y, isHeal) => {
    setAnimHits(h => [...h.slice(-5), { id:Date.now()+Math.random(), dmg, isCrit, x, y, isHeal }]);
  };

  // ── Check and award completed missions (mid-battle) ──
  const checkMissions = (g) => {
    const today2 = todayStr();
    const todayMs = getDailyBattleMissions(today2);
    setS(prev => {
      const done = prev.battleMissionsDate===today2 ? [...(prev.battleMissionsDone||[])] : [];
      let ef=0, em=0, changed=false;
      for (const bm of todayMs) {
        if (done.includes(bm.id)) continue;
        const r = bm.req;
        const ok = (r.waves       && g.wave>=r.waves)       ||
                   (r.kills       && g.kills>=r.kills)       ||
                   (r.bosses      && g.bossKills>=r.bosses)  ||
                   (r.podFire     && g.podFires>=r.podFire)  ||
                   (r.evades      && g.evadeCount>=r.evades) ||
                   (r.perfectWave && g.perfectWaveAchieved);
        if (ok) { done.push(bm.id); ef+=bm.frags; em+=bm.mem; changed=true; }
      }
      if (!changed) return prev;
      let mem=prev.mem+em, fw=prev.fw, memMax=prev.memMax;
      while (mem>=memMax){mem-=memMax;fw++;memMax=xpFor(fw);}
      return {
        ...prev, mem, fw, memMax,
        frags: prev.frags+ef,
        totalFragsEarned: (prev.totalFragsEarned||0)+ef,
        battleMissionsDone:done, battleMissionsDate:today2,
      };
    });
  };

  // ── Save rewards + write to journal ──
  const saveRewards = (finalG) => {
    setS(prev => {
      const g = finalG || G.current;
      const mats = { ...(prev.materials||{}) };
      for (const [k,v] of Object.entries(g.sessionDrops)) mats[k]=(mats[k]||0)+v;

      const today2 = todayStr();
      let bmt = prev.battleMemDate===today2 ? (prev.battleMemToday||0) : 0;
      let memReward = 0;
      if (g.wave >= 5) memReward = Math.min(300-bmt, Math.round(2+(g.wave-5)*0.5));
      bmt = Math.min(300, bmt+memReward);

      let mem=prev.mem+memReward, fw=prev.fw, memMax=prev.memMax;
      while (mem>=memMax) { mem-=memMax; fw++; memMax=xpFor(fw); }

      // Missions already checked mid-battle via checkMissions()
      // Read already-done missions from prev state (no double-award)
      const done = prev.battleMissionsDate===today2 ? [...(prev.battleMissionsDone||[])] : [];
      const ef = 0, em = 0;

      // Journal entry
      const matStr = Object.entries(g.sessionDrops)
        .map(([k,v]) => { const m=MATERIALS[k]; return m ? m.icon+" "+v : ""; })
        .filter(Boolean).join(" ");
      const totalMem = memReward + em;
      const journalEntry = {
        time: new Date().toLocaleTimeString("ru"),
        text: "⚡ БОЙ — волна "+g.wave+" · "+g.kills+" врагов"
              + (g.bossKills>0?" · "+g.bossKills+" БОССОВ":"")
              + " [+"+(totalMem>0?totalMem+" MEM":"0 MEM")
              + (ef>0?" +"+ef+" ◈":"")
              + (matStr?" · "+matStr:"")
              + "]",
        threat: "СРЕДНЯЯ",
      };

      return {
        ...prev,
        materials:mats, mem, fw, memMax,
        frags: prev.frags+ef,
        totalFragsEarned: (prev.totalFragsEarned||0)+ef,
        battleMemToday:bmt, battleMemDate:today2,
        battleMissionsDone:done, battleMissionsDate:today2,
        log: [journalEntry, ...(prev.log||[])].slice(0,30),
      };
    });
  };

  // ── Launch wave ──
  const launchWave = (waveNum) => {
    const g = G.current;
    const isBossWave = waveNum % 10 === 0;
    const isEvent    = !isBossWave && waveNum >= 5 && Math.random() < 0.08;
    const isBoss     = isBossWave || isEvent;
    g.enemies     = spawnWave(waveNum, isBoss);
    g.wave        = waveNum;
    g.hitThisWave = false;
    g.eventBoss   = isEvent;
    setWave(waveNum);
    setEventBoss(isEvent);
    setDisplayEnemies(g.enemies.map(e=>({...e})));
    log(isBoss
      ? "⚠ ВОЛНА "+waveNum+(isBossWave?" — БОСС!":" — СОБЫТИЙНЫЙ БОСС!")
      : "► ВОЛНА "+waveNum, isBoss?"#c44":"#888");
  };

  // ── Main game tick ──
  const startTick = () => {
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const g   = G.current;
      if (g.phase !== "fighting") return;
      const now = Date.now();

      // ── Move enemies toward unit ──
      for (const e of g.enemies) {
        if (e.x > 18) e.x -= e.isBoss ? 0.15 : 0.28;
      }

      // ── Enemy attacks (each enemy has own atkTimer) ──
      for (const e of g.enemies) {
        if (e.x > 22) continue; // not in range
        e.atkTimer = (e.atkTimer||0) + TICK;
        if (e.atkTimer >= ENEMY_CD) {
          e.atkTimer = 0;
          if (g.invincUntil < now) {
            const dmg = Math.max(1, e.atk);
            g.unitHP  = Math.max(0, g.unitHP - dmg);
            g.hitThisWave = true;
            // Show enemy hit flash + damage on unit
            flashEnemy(e.uid);
            spawnHit(dmg, false, 12, 25 + Math.random()*20, false);
            setUnitAnim("hit");
            setTimeout(() => setUnitAnim("idle"), 300);
          }
        }
      }

      // ── Unit auto-attack ──
      g.atkTimer = (g.atkTimer||0) + TICK;
      if (g.atkTimer >= ATK_CD && g.enemies.length > 0) {
        g.atkTimer = 0;
        const tgt    = g.enemies[0];
        const isCrit = Math.random()*100 < unitStats.crit;
        let dmg      = Math.floor(unitStats.atk * (0.85 + Math.random()*0.3));
        if (isCrit) dmg = Math.floor(dmg * (1 + unitStats.critdmg/100));
        dmg = Math.max(1, dmg);
        tgt.hp = Math.max(0, tgt.hp - dmg);
        flashUnit("attack");
        spawnHit(dmg, isCrit, tgt.x, 15+Math.random()*25, false);
      }

      // ── Tick cooldowns ──
      for (const k of Object.keys(g.cds)) g.cds[k] = Math.max(0, g.cds[k]-TICK);

      // ── Remove dead enemies ──
      const dead = g.enemies.filter(e=>e.hp<=0);
      if (dead.length) {
        const wasBoss = dead.some(e=>e.isBoss);
        g.kills      += dead.length;
        if (wasBoss) g.bossKills += dead.filter(e=>e.isBoss).length;
        g.enemies     = g.enemies.filter(e=>e.hp>0);
        dead.forEach(e => log("✓ "+e.name, wasBoss?"#c8a882":"#4a9"));
      }

      // ── Sync display ──
      setDisplayHP(g.unitHP);
      setDisplayEnemies(g.enemies.map(e=>({...e})));
      setDisplayCDs({...g.cds});
      setKills(g.kills);

      // ── Unit death ──
      if (g.unitHP <= 0) {
        clearInterval(tickRef.current);
        g.phase = "dead";
        setPhase("dead");
        setSessionDrops({...g.sessionDrops});
        log("◆ ЮНИТ УНИЧТОЖЕН — волна "+g.wave, "#c44");
        saveRewards();
        return;
      }

      // ── Wave cleared ──
      if (g.enemies.length === 0) {
        clearInterval(tickRef.current);
        // perfectWave: if no damage taken this wave, mark it achieved
        if (!g.hitThisWave) g.perfectWaveAchieved = true;
        g.phase = "waveResult";
        setPhase("waveResult");
        const isBoss = g.wave%10===0 || g.eventBoss;
        const drops  = getWaveDrops(g.wave, isBoss);
        for (const [k,v] of Object.entries(drops)) g.sessionDrops[k]=(g.sessionDrops[k]||0)+v;
        setWaveDrops({...drops});
        setSessionDrops({...g.sessionDrops});
        setWave(g.wave);
        // Check missions mid-battle so progress is saved even if player quits
        checkMissions(g);
      }
    }, TICK);
  };

  // ── Start battle ──
  const startBattle = () => {
    const g = G.current;
    const hp = unitStats.hp;
    g.unitHP=hp; g.unitMaxHP=hp;
    g.enemies=[]; g.wave=0; g.kills=0; g.bossKills=0;
    g.sessionDrops={}; g.podFires=0; g.evadeCount=0;
    g.hitThisWave=false; g.eventBoss=false;
    g.cds={pod:0,evade:0,blade:0}; g.invincUntil=0; g.atkTimer=0;
    g.memEarned=0; g.perfectWaveAchieved=false; g.phase="fighting";
    setDisplayHP(hp); setDisplayMaxHP(hp);
    setWave(0); setKills(0); setBattleLog([]);
    setSessionDrops({}); setWaveDrops(null); setAnimHits([]);
    setEventBoss(false); setEnemyFlash({});
    setDisplayEnemies([]); setDisplayCDs({pod:0,evade:0,blade:0});
    setUnitAnim("idle");
    setPhase("fighting");
    launchWave(1);
    startTick();
  };

  const continueWave = () => {
    const g = G.current;
    g.phase = "fighting";
    setPhase("fighting");
    setWaveDrops(null);
    launchWave(g.wave + 1);
    startTick();
  };

  useEffect(() => () => clearInterval(tickRef.current), []);

  // ── Abilities ──
  const useAbility = (id) => {
    const g = G.current;
    if (g.cds[id] > 0 || g.phase !== "fighting") return;
    const ab = ABILITIES.find(a=>a.id===id);
    if (!ab) return;

    if (id === "pod") {
      // POD FIRE: hit ALL enemies for 60% ATK
      const dmg = Math.max(1, Math.floor(unitStats.atk * 0.6));
      let hit = 0;
      for (const e of g.enemies) {
        e.hp = Math.max(0, e.hp - dmg);
        hit++;
      }
      flashUnit("skill");
      // Spawn hit numbers on each visible enemy
      g.enemies.forEach(e => spawnHit(dmg, false, e.x, 10+Math.random()*20, false));
      g.podFires++;
      log("◈ POD FIRE — "+dmg+" × "+hit+" целей", "#44aaff");

    } else if (id === "evade") {
      // EVADE: become invincible 1.5s, dash-attack nearest enemy for 120% ATK
      g.invincUntil = Date.now() + 1500;
      flashUnit("evade");
      if (g.enemies.length > 0) {
        const tgt = g.enemies[0];
        const dmg = Math.max(1, Math.floor(unitStats.atk * 1.2));
        tgt.hp    = Math.max(0, tgt.hp - dmg);
        spawnHit(dmg, false, tgt.x, 15+Math.random()*20, false);
        log("▷ EVADE — рывок +"+dmg+" · неуязвимость 1.5с", "#c8a882");
      } else {
        log("▷ EVADE — неуязвимость 1.5с", "#c8a882");
      }
      g.evadeCount++;

    } else if (id === "blade") {
      // BLADE STORM: 200% ATK on first enemy, guaranteed crit if target HP < 30%
      if (g.enemies.length === 0) { log("⚔ Нет целей", "#555"); g.cds[id]=ab.cooldown; setDisplayCDs({...g.cds}); return; }
      const tgt    = g.enemies[0];
      const isCrit = (tgt.hp / tgt.maxHp) < 0.3;
      let dmg      = Math.floor(unitStats.atk * 2.0);
      if (isCrit) dmg = Math.floor(dmg * (1 + unitStats.critdmg/100));
      dmg = Math.max(1, dmg);
      tgt.hp = Math.max(0, tgt.hp - dmg);
      flashUnit("skill");
      spawnHit(dmg, isCrit, tgt.x, 10+Math.random()*25, false);
      log("⚔ BLADE STORM — "+(isCrit?"[★КРИТ] ":"")+dmg+" → "+tgt.name, "#cc4444");
    }

    g.cds[id] = ab.cooldown;
    setDisplayEnemies(g.enemies.map(e=>({...e})));
    setDisplayCDs({...g.cds});
  };

  // ── Upgrade gear ──
  const canUpgrade = (slot) => {
    const id = (S.gear||{})[slot]; if (!id) return false;
    const lvl = gearLevels[slot]||1; if (lvl>=5) return false;
    const cost = (UPGRADE_COSTS[slot]||[])[lvl]; if (!cost) return false;
    return Object.entries(cost).every(([k,v])=>((S.materials||{})[k]||0)>=v);
  };
  const upgradeGear = (slot) => {
    if (!canUpgrade(slot)) return;
    const lvl  = gearLevels[slot]||1;
    const cost = UPGRADE_COSTS[slot][lvl];
    setS(prev => {
      const mats = {...(prev.materials||{})};
      for (const [k,v] of Object.entries(cost)) mats[k]=Math.max(0,(mats[k]||0)-v);
      return { ...prev, materials:mats, gearLevels:{...(prev.gearLevels||{}), [slot]:lvl+1} };
    });
    if (onToast) onToast("◈ "+SLOT_LABELS[slot]+" → УР."+String((gearLevels[slot]||1)+1));
  };

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════

  // Unit animation styles
  const unitStyle = (() => {
    if (unitAnim === "attack") return { transform:"translateX(8px)", filter:"drop-shadow(0 0 8px "+accent+")" };
    if (unitAnim === "skill")  return { transform:"translateX(12px) scale(1.08)", filter:"drop-shadow(0 0 14px "+accent+")" };
    if (unitAnim === "evade")  return { transform:"translateX(20px) scaleX(1.15)", filter:"drop-shadow(0 0 10px #c8a882)" };
    if (unitAnim === "hit")    return { transform:"translateX(-6px)", filter:"drop-shadow(0 0 8px #c44)" };
    return { transform:"translateX(0)", filter:"drop-shadow(0 0 5px "+accent+"66)" };
  })();

  if (phase === "inventory") return (
    <div style={{fontFamily:FF}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <button onClick={()=>setPhase("lobby")} style={{background:"none",border:"1px solid #333",color:"#666",padding:"6px 12px",fontSize:9,cursor:"pointer",fontFamily:FF}}>← НАЗАД</button>
        <div style={{fontSize:8,letterSpacing:3,color:"#444"}}>ИНВЕНТАРЬ · МАТЕРИАЛЫ</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {Object.values(MATERIALS).map(mat => {
          const count = (S.materials||{})[mat.id]||0;
          return (
            <div key={mat.id} style={{padding:"12px 14px",border:"1px solid #1a1a1a",borderLeft:"2px solid "+mat.color+"44",background:count>0?mat.color+"0a":"transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:18,color:count>0?mat.color:"#2a2a2a"}}>{mat.icon}</span>
                <span style={{fontSize:16,fontWeight:700,color:count>0?mat.color:"#2a2a2a"}}>{count}</span>
              </div>
              <div style={{fontSize:9,color:count>0?"#888":"#333",letterSpacing:1}}>{mat.name}</div>
              <div style={{fontSize:8,color:"#333",lineHeight:1.5,marginTop:2}}>{mat.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (phase === "upgrade") return (
    <div style={{fontFamily:FF}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
        <button onClick={()=>setPhase("lobby")} style={{background:"none",border:"1px solid #333",color:"#666",padding:"6px 12px",fontSize:9,cursor:"pointer",fontFamily:FF}}>← НАЗАД</button>
        <div style={{fontSize:8,letterSpacing:3,color:"#444"}}>УЛУЧШЕНИЕ СНАРЯЖЕНИЯ</div>
      </div>
      {EQUIP_SLOTS.map(slot => {
        const id   = (S.gear||{})[slot];
        const item = id ? ((equipmentPool||[]).find(e=>e.id===id)||(gachaPool||[]).find(e=>e.id===id)) : null;
        const lvl  = gearLevels[slot]||1;
        const maxed= lvl>=5;
        const cost = !maxed && UPGRADE_COSTS[slot] ? UPGRADE_COSTS[slot][lvl] : null;
        const canUp= canUpgrade(slot);
        const mats = S.materials||{};
        return (
          <div key={slot} style={{marginBottom:12,padding:"14px",border:"1px solid #1a1a1a",borderLeft:"2px solid "+(item?accent+"66":"#1a1a1a")}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <div>
                <div style={{fontSize:9,color:item?"#888":"#333",letterSpacing:2}}>{SLOT_ICONS[slot]} {SLOT_LABELS[slot]}</div>
                {item  && <div style={{fontSize:8,color:RARITY_COLORS[item.rarity]||"#444",marginTop:2}}>{item.name}</div>}
                {!item && <div style={{fontSize:8,color:"#2a2a2a"}}>— нет снаряжения —</div>}
              </div>
              <div style={{fontSize:10,color:maxed?"#c8a882":accent,fontWeight:700}}>УР.{lvl}{maxed?" ★":""}</div>
            </div>
            {item && !maxed && cost && (
              <>
                <div style={{fontSize:8,color:"#444",letterSpacing:1,marginBottom:6}}>→ УР.{lvl+1}:</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                  {Object.entries(cost).map(([mk,qty]) => {
                    const mat=MATERIALS[mk]; const have=mats[mk]||0; const ok=have>=qty;
                    return mat ? (
                      <span key={mk} style={{fontSize:8,padding:"3px 8px",border:"1px solid "+(ok?mat.color+"55":"#2a2a2a"),color:ok?mat.color:"#444",background:ok?mat.color+"11":"transparent"}}>
                        {mat.icon} {mat.name} {have}/{qty}
                      </span>
                    ) : null;
                  })}
                </div>
                <button onClick={()=>upgradeGear(slot)} disabled={!canUp}
                  onMouseEnter={e=>{if(canUp){e.currentTarget.style.background=accent;e.currentTarget.style.color="#000";}}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=canUp?accent:"#333";}}
                  style={{width:"100%",background:"transparent",border:"1px solid "+(canUp?accent:"#2a2a2a"),color:canUp?accent:"#333",padding:"8px",fontSize:9,letterSpacing:2,cursor:canUp?"pointer":"not-allowed",transition:"all 0.2s",fontFamily:FF}}>
                  {canUp?"◈ УЛУЧШИТЬ":"МАТЕРИАЛЫ НЕДОСТАТОЧНЫ"}
                </button>
              </>
            )}
            {item && maxed && <div style={{fontSize:9,color:"#c8a882",letterSpacing:2}}>◆ МАКСИМАЛЬНЫЙ УРОВЕНЬ</div>}
          </div>
        );
      })}
    </div>
  );

  // ── MAIN VIEW ──
  return (
    <div style={{fontFamily:FF}}>
      <style>{
        "@keyframes floatDmg{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-30px) scale(0.8)}}" +
        "@keyframes floatCrit{0%{opacity:1;transform:translateY(0) scale(1.2)}100%{opacity:0;transform:translateY(-36px) scale(0.7)}}" +
        "@keyframes walkBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}" +
        "@keyframes enemyAtk{0%{transform:translateX(0)}30%{transform:translateX(-10px)}60%{transform:translateX(4px)}100%{transform:translateX(0)}}" +
        "@keyframes invincFlash{0%,100%{opacity:1}50%{opacity:0.3}}" +
        "@keyframes podBeam{0%{opacity:0.8;transform:scaleX(0)}100%{opacity:0;transform:scaleX(1)}}"
      }</style>

      {/* Top bar */}
      <div style={{fontSize:8,letterSpacing:3,color:"#444",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>БОЕВОЙ ПРОТОКОЛ</span>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setPhase("inventory")} style={{background:"none",border:"1px solid #222",color:"#555",padding:"2px 8px",fontSize:8,cursor:"pointer",letterSpacing:1,fontFamily:FF}}>◉ СКЛАД</button>
          <button onClick={()=>setPhase("upgrade")}   style={{background:"none",border:"1px solid #222",color:"#555",padding:"2px 8px",fontSize:8,cursor:"pointer",letterSpacing:1,fontFamily:FF}}>◈ АПГРЕЙД</button>
        </div>
      </div>

      {/* Unit stats (lobby) */}
      {phase==="lobby" && (
        <div style={{padding:"12px 14px",border:"1px solid #1a1a1a",marginBottom:12}}>
          <div style={{fontSize:8,color:"#444",letterSpacing:2,marginBottom:8}}>ХАРАКТЕРИСТИКИ ЮНИТА</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
            {[["HP",unitStats.hp,"#4a9"],["ATK",unitStats.atk,"#c8a882"],["КРИТ",unitStats.crit+"%","#44aaff"],["КРУРон","+"+unitStats.critdmg+"%","#aa44cc"]].map(([l,v,c])=>(
              <div key={l} style={{textAlign:"center"}}>
                <div style={{fontSize:7,color:"#444",letterSpacing:1}}>{l}</div>
                <div style={{fontSize:11,fontWeight:700,color:c}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily missions */}
      <div style={{marginBottom:12,padding:"12px 14px",border:"1px solid #1a1a1a"}}>
        <div style={{fontSize:8,color:"#444",letterSpacing:2,marginBottom:8}}>◆ ДНЕВНЫЕ БОЕВЫЕ ЗАДАНИЯ</div>
        {battleMissions.map((bm,i) => {
          const done = doneMissions.includes(bm.id);
          const g    = G.current;
          // Compute current progress value and max for this mission type
          const { cur, max } = (() => {
            const r = bm.req;
            if (r.waves)       return { cur: Math.min(g.wave,      r.waves),       max: r.waves       };
            if (r.kills)       return { cur: Math.min(g.kills,     r.kills),       max: r.kills       };
            if (r.bosses)      return { cur: Math.min(g.bossKills, r.bosses),      max: r.bosses      };
            if (r.podFire)     return { cur: Math.min(g.podFires,  r.podFire),     max: r.podFire     };
            if (r.evades)      return { cur: Math.min(g.evadeCount,r.evades),      max: r.evades      };
            if (r.perfectWave) return { cur: g.perfectWaveAchieved ? 1 : 0,        max: 1             };
            return { cur: 0, max: 1 };
          })();
          const pct = done ? 100 : Math.min(100, Math.round(cur/max*100));
          const active = phase === "fighting" || phase === "waveResult";
          return (
            <div key={bm.id} style={{padding:"8px 0",borderBottom:i<2?"1px solid #0d0d0d":"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:5}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:9,color:done?"#4a9":"#888",letterSpacing:1,textDecoration:done?"line-through":"none"}}>{bm.title}</div>
                  {!done && <div style={{fontSize:8,color:"#333",marginTop:1}}>{bm.desc}</div>}
                  {done  && <div style={{fontSize:8,color:"#4a9",marginTop:1}}>✓ ВЫПОЛНЕНО</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                  <div style={{fontSize:8,color:done?"#333":"#4a9"}}>+{bm.mem} MEM</div>
                  <div style={{fontSize:8,color:done?"#333":"#c8a882"}}>+{bm.frags} ◈</div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{flex:1,height:3,background:"#111",borderRadius:2,overflow:"hidden"}}>
                  <div style={{
                    height:"100%",
                    width:pct+"%",
                    background: done ? "#4a9" : pct>0 ? accent : "#222",
                    transition:"width 0.3s ease",
                    borderRadius:2,
                  }}/>
                </div>
                <div style={{fontSize:7,color:done?"#4a9":pct>0?"#666":"#333",minWidth:28,textAlign:"right"}}>
                  {done ? "✓" : (bm.req.perfectWave ? (cur+"/1") : cur+"/"+max)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ARENA */}
      <div style={{position:"relative",width:"100%",height:200,background:"#d1cdb7",border:"2px solid #b0aa98",overflow:"hidden",marginBottom:12}}>
        {/* Grid */}
        <div style={{position:"absolute",inset:0,backgroundImage:"repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(0,0,0,0.04) 40px),repeating-linear-gradient(90deg,transparent,transparent 49px,rgba(0,0,0,0.04) 50px)",pointerEvents:"none"}}/>
        {/* Ground */}
        <div style={{position:"absolute",bottom:36,left:0,right:0,height:1,background:"rgba(0,0,0,0.12)"}}/>

        {/* Status */}
        <div style={{position:"absolute",top:5,left:8,fontSize:8,color:"rgba(0,0,0,0.45)",letterSpacing:2,fontFamily:FF}}>
          {phase==="lobby"&&"ОЖИДАНИЕ"}
          {phase==="fighting"&&("ВОЛНА "+wave+(eventBoss?" ⚠ СОБЫТИЙНЫЙ БОСС":""))}
          {phase==="waveResult"&&("ВОЛНА "+wave+" — ОЧИЩЕНА")}
          {phase==="dead"&&"ЮНИТ УНИЧТОЖЕН"}
        </div>

        {/* UNIT SPRITE */}
        {phase!=="lobby" && (
          <div style={{
            position:"absolute", left:"10%", bottom:34,
            width:30, height:52,
            backgroundImage:"url("+formImg+")",
            backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"center bottom",
            opacity: phase==="dead" ? 0.2 : G.current.invincUntil > Date.now() ? 0.7 : 1,
            animation: G.current.invincUntil > Date.now() ? "invincFlash 0.25s infinite" : "none",
            transition:"transform 0.1s ease, filter 0.1s ease, opacity 0.3s",
            ...unitStyle,
            zIndex:2,
          }}/>
        )}

        {/* ENEMIES */}
        {displayEnemies.map(e => (
          <div key={e.uid} style={{
            position:"absolute", left:e.x+"%", bottom:33,
            textAlign:"center", zIndex:3,
            animation: enemyFlash[e.uid] ? "enemyAtk 0.3s ease" : "walkBob "+(e.isBoss?"1.3s":"0.75s")+" infinite",
          }}>
            <div style={{
              fontSize:e.isBoss?24:15, lineHeight:1,
              color: enemyFlash[e.uid] ? "#fff" : (e.isBoss?"#c44":"#4a3a2a"),
              textShadow: enemyFlash[e.uid] ? "0 0 8px #c44" : "none",
              transition:"color 0.1s",
            }}>{e.icon}</div>
            {/* HP bar */}
            <div style={{width:e.isBoss?34:18,height:3,background:"rgba(0,0,0,0.15)",marginTop:2,borderRadius:1,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.max(0,e.hp/e.maxHp*100)+"%",background:e.isBoss?"#c44":"#666",transition:"width 0.1s"}}/>
            </div>
            {e.isBoss && <div style={{fontSize:6,color:"rgba(0,0,0,0.5)",letterSpacing:1,marginTop:1,whiteSpace:"nowrap"}}>{e.name}</div>}
          </div>
        ))}

        {/* DAMAGE / HIT NUMBERS */}
        {animHits.map(h => (
          <div key={h.id} style={{
            position:"absolute",
            left:Math.min(88,Math.max(3,h.x-2))+"%",
            top:Math.max(4,h.y)+"%",
            fontSize:h.isCrit?14:9,
            fontWeight:700,
            color: h.isCrit ? "#c44" : "rgba(0,0,0,0.5)",
            fontFamily:FF,
            animation: h.isCrit ? "floatCrit 0.8s ease forwards" : "floatDmg 0.65s ease forwards",
            pointerEvents:"none",
            zIndex:5,
            whiteSpace:"nowrap",
          }}>
            {h.isCrit ? "★"+h.dmg : h.dmg}
          </div>
        ))}

        {/* HP BAR */}
        {phase!=="lobby" && (
          <div style={{position:"absolute",bottom:5,left:8,right:8}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"rgba(0,0,0,0.4)",fontFamily:FF,marginBottom:2,letterSpacing:1}}>
              <span>HP</span><span>{displayHP}/{displayMaxHP}</span>
            </div>
            <div style={{height:4,background:"rgba(0,0,0,0.12)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:Math.max(0,displayHP/displayMaxHP*100)+"%",background:displayHP<displayMaxHP*0.3?"#c44":displayHP<displayMaxHP*0.6?"#ca7":"#4a9",transition:"width 0.12s"}}/>
            </div>
          </div>
        )}

        {/* WAVE RESULT OVERLAY */}
        {phase==="waveResult" && waveDrops && (
          <div style={{position:"absolute",inset:0,background:"rgba(209,205,183,0.94)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:FF,zIndex:10}}>
            <div style={{fontSize:9,color:"rgba(0,0,0,0.6)",letterSpacing:3,marginBottom:8}}>◆ ВОЛНА {wave} ОЧИЩЕНА</div>
            <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",justifyContent:"center"}}>
              {Object.entries(waveDrops).length > 0
                ? Object.entries(waveDrops).map(([k,v])=>{ const m=MATERIALS[k]; return m?<span key={k} style={{fontSize:9,color:"rgba(0,0,0,0.7)",background:"rgba(0,0,0,0.08)",padding:"3px 8px",border:"1px solid rgba(0,0,0,0.2)"}}>{m.icon} {m.name} ×{v}</span>:null; })
                : <span style={{fontSize:9,color:"rgba(0,0,0,0.4)"}}>— нет дропа —</span>
              }
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={continueWave} style={{background:"rgba(0,0,0,0.15)",border:"1px solid rgba(0,0,0,0.3)",color:"rgba(0,0,0,0.7)",padding:"8px 16px",fontSize:9,letterSpacing:2,cursor:"pointer",fontFamily:FF}}>
                ► СЛЕДУЮЩАЯ ВОЛНА
              </button>
              <button onClick={()=>{ clearInterval(tickRef.current); G.current.phase="dead"; setPhase("dead"); setSessionDrops({...G.current.sessionDrops}); saveRewards(); }} style={{background:"rgba(80,0,0,0.15)",border:"1px solid rgba(150,50,50,0.4)",color:"rgba(180,80,80,0.8)",padding:"8px 12px",fontSize:9,letterSpacing:1,cursor:"pointer",fontFamily:FF}}>
                ✕ ЗАВЕРШИТЬ
              </button>
            </div>
          </div>
        )}

        {/* DEAD OVERLAY */}
        {phase==="dead" && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.68)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:FF,zIndex:10}}>
            <div style={{fontSize:10,color:"#c44",letterSpacing:4,marginBottom:6}}>ЮНИТ УНИЧТОЖЕН</div>
            <div style={{fontSize:8,color:"#888",letterSpacing:2}}>волна {wave} · {kills} уничтожено</div>
          </div>
        )}
      </div>

      {/* ABILITY BUTTONS */}
      {phase==="fighting" && (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
          {ABILITIES.map(ab => {
            const cd=displayCDs[ab.id]||0; const ready=cd<=0;
            return (
              <button key={ab.id} onClick={()=>useAbility(ab.id)}
                style={{
                  background:ready?ab.color+"18":"#0a0a0a",
                  border:"1px solid "+(ready?ab.color:"#222"),
                  color:ready?ab.color:"#333",
                  padding:"10px 4px", fontSize:8, cursor:ready?"pointer":"not-allowed",
                  transition:"all 0.12s", textAlign:"center", fontFamily:FF,
                  position:"relative", overflow:"hidden",
                  transform: ready ? "scale(1)" : "scale(0.97)",
                }}>
                <div style={{fontSize:18,marginBottom:3}}>{ab.icon}</div>
                <div style={{fontWeight:700,fontSize:8,marginBottom:2}}>{ab.name}</div>
                {!ready && <div style={{fontSize:8,color:"#555"}}>{(cd/1000).toFixed(1)}с</div>}
                {ready  && <div style={{fontSize:7,color:ab.color+"88",lineHeight:1.3}}>{ab.desc}</div>}
                {/* Cooldown progress bar */}
                {!ready && <div style={{position:"absolute",bottom:0,left:0,width:(1-cd/ab.cooldown)*100+"%",height:2,background:ab.color+"88",transition:"width 0.1s"}}/>}
              </button>
            );
          })}
        </div>
      )}

      {/* START / RESTART */}
      {(phase==="lobby"||phase==="dead") && (
        <button onClick={startBattle}
          onMouseEnter={e=>{e.currentTarget.style.background=accent;e.currentTarget.style.color="#000";}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=accent;}}
          style={{width:"100%",background:"transparent",border:"1px solid "+accent,color:accent,padding:"14px",fontSize:10,letterSpacing:3,cursor:"pointer",transition:"all 0.2s",fontFamily:FF,marginBottom:12}}>
          {phase==="dead"?"↺ НАЧАТЬ ЗАНОВО":"► НАЧАТЬ БОЙ"}
        </button>
      )}

      {/* POST-BATTLE SUMMARY */}
      {phase==="dead" && (
        <div style={{padding:"14px",border:"1px solid #1a1a1a",marginBottom:12}}>
          <div style={{fontSize:8,color:"#444",letterSpacing:2,marginBottom:10}}>◈ ИТОГИ БОЯ</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
            {[["ВОЛН",wave],["УБИТО",kills],["БОССОВ",G.current.bossKills]].map(([l,v])=>(
              <div key={l} style={{textAlign:"center",padding:"8px",border:"1px solid #111"}}>
                <div style={{fontSize:8,color:"#444",letterSpacing:1}}>{l}</div>
                <div style={{fontSize:14,fontWeight:700,color:"#888"}}>{v}</div>
              </div>
            ))}
          </div>
          {Object.keys(sessionDrops).length>0 && (
            <>
              <div style={{fontSize:8,color:"#333",letterSpacing:2,marginBottom:6}}>МАТЕРИАЛЫ:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {Object.entries(sessionDrops).map(([k,v])=>{const m=MATERIALS[k];return m?<span key={k} style={{fontSize:8,padding:"3px 8px",border:"1px solid "+m.color+"44",color:m.color+"aa"}}>{m.icon} {m.name} ×{v}</span>:null;})}
              </div>
            </>
          )}
          <div style={{fontSize:8,color:"#555",marginTop:10,letterSpacing:1}}>◇ Результат записан в журнал</div>
        </div>
      )}

      {/* BATTLE LOG */}
      {(phase==="fighting"||phase==="dead") && battleLog.length>0 && (
        <div style={{maxHeight:90,overflowY:"auto",padding:"8px 10px",border:"1px solid #111",background:"#050505"}}>
          {battleLog.slice(0,10).map(e=>(
            <div key={e.id} style={{fontSize:8,color:e.color,letterSpacing:1,marginBottom:2,fontFamily:FF}}>{e.msg}</div>
          ))}
        </div>
      )}
    </div>
  );
}
