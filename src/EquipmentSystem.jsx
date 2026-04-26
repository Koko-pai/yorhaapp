import { useState } from "react";

// ── Shared imports from App (passed as props to avoid circular imports) ──
// gachaPool, weaponStyles, rarityColors, inArr — passed as props
// pickMissions — not needed here

// ═══════════════════════════════════════════════════════
// EQUIPMENT SYSTEM — CONSTANTS & HELPERS
// ═══════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════
// EQUIPMENT SYSTEM
// ═══════════════════════════════════════════════════════

const EQUIP_SLOTS  = ["weapon", "chest", "head", "gloves", "boots"];
const SLOT_LABELS  = { weapon:"ОРУЖИЕ", chest:"БРОНЯ", head:"ШЛЕМ", gloves:"ПЕРЧАТКИ", boots:"ПОНОЖИ" };
const SLOT_ICONS   = { weapon:"⚔", chest:"◈", head:"◆", gloves:"◇", boots:"▽" };

const RARITY_STAT_MULT = { common: 1, rare: 1.4, epic: 1.9, legendary: 2.8 };

// ── Stat ranges per slot (min, max) ──────────────────────────────────────
// Each item has 1 PRIMARY stat and 3 SECONDARY stats, rolled on item creation
const STAT_RANGES = {
  atk:     { min:3,  max:10, label:"АТК",       suffix:""  },
  hp:      { min:8,  max:25, label:"HP",         suffix:""  },
  crit:    { min:1,  max:6,  label:"КРИТ.ШНС",   suffix:"%" },
  critdmg: { min:4,  max:16, label:"КРИТ.УРОН",  suffix:"%" },
};

// Which stats can be PRIMARY for each slot
const SLOT_PRIMARY = {
  weapon: ["atk"],           // weapon always has ATK as primary
  chest:  ["hp","atk"],
  head:   ["hp","crit"],
  gloves: ["atk","critdmg"],
  boots:  ["hp","crit"],
};

// All possible secondary stats per slot (weapon has none — ATK only)
const SLOT_SECONDARIES = {
  weapon: [],            // weapon: only ATK, no secondaries
  chest:  ["crit","critdmg","atk","hp"],
  head:   ["atk","critdmg","crit","hp"],
  gloves: ["hp","crit","critdmg","atk"],
  boots:  ["atk","crit","critdmg","hp"],
};

// Primary stat multiplier (1.5–2x the normal range)
const PRIMARY_MULT = { common:1.5, rare:2.0, epic:2.8, legendary:4.0 };
const SECONDARY_MULT = { common:1.0, rare:1.3, epic:1.7, legendary:2.4 };

// Seeded random from item id (so stats are stable per item)
function seededRand(seed, idx) {
  let h = 0x811c9dc5;
  for (let i=0; i<seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  h = ((h ^ idx) * 0x01000193) >>> 0;
  return (h >>> 0) / 0xffffffff;
}

function rollItemStats(item) {
  if (!item) return { primary: null, stats: { atk:0, hp:0, crit:0, critdmg:0 } };
  const slot = item.slot || "chest";
  // iid = instance id: duplicates of same item can have different stats
  // weapon always has ATK as primary so iid doesn't change primary for weapon
  const rid  = item.iid || item.id || "x";

  // If item already has rolledStats saved, use those
  if (item.rolledStats) return item.rolledStats;

  // Pick primary stat
  const primOptions = SLOT_PRIMARY[slot] || ["hp"];
  // weapon: always ATK; others: iid-seeded so duplicates can have different primary
  const primIdx     = slot === "weapon" ? 0 : Math.floor(seededRand(rid, 0) * primOptions.length);
  const primaryStat = primOptions[primIdx];

  // Pick secondary stats (weapon has none)
  const secPool = (SLOT_SECONDARIES[slot] || []).filter(s => s !== primaryStat);
  const secondaries = [];
  if (secPool.length > 0) {
    const used = new Set();
    const count = Math.min(3, secPool.length);
    for (let i=0; i<count; i++) {
      let tries=0, idx;
      do { idx = Math.floor(seededRand(rid, i*7+tries+1) * secPool.length); tries++; } while(used.has(idx) && tries<20);
      used.add(idx);
      secondaries.push(secPool[idx % secPool.length]);
    }
  }

  // Roll values
  const pm = PRIMARY_MULT[item.rarity]   || 1.5;
  const sm = SECONDARY_MULT[item.rarity] || 1.0;
  const stats = { atk:0, hp:0, crit:0, critdmg:0 };

  const r = STAT_RANGES[primaryStat];
  stats[primaryStat] = Math.round((r.min + seededRand(rid,10) * (r.max - r.min)) * pm * 10) / 10;

  secondaries.forEach((s, i) => {
    const rs = STAT_RANGES[s];
    const val = (rs.min + seededRand(rid, 20+i) * (rs.max - rs.min)) * sm;
    stats[s] = (s==="crit"||s==="critdmg") ? Math.round(val*10)/10 : Math.round(val);
  });

  return { primary: primaryStat, secondaries, stats };
}

function getStatScale(level) {
  if (level >= 30) return 6.0;
  if (level >= 20) return 3.2;
  if (level >= 10) return 1.8;
  return 1 + (level - 1) * 0.085;
}

// Secondary stats grow much slower on upgrade (≈30% of primary growth per level)
function getSecondaryScale(level) {
  if (level <= 1) return 1;
  return 1 + (level - 1) * 0.025; // ~2.5% per level vs ~8.5% primary
}

// Main stat calculator — primary scales fast, secondaries scale slow
function calcStats(item) {
  if (!item) return { atk:0, hp:0, crit:0, critdmg:0 };
  const rolled = rollItemStats(item);
  const lp = getStatScale(item.level || 1);       // primary scale
  const ls = getSecondaryScale(item.level || 1);  // secondary scale
  const primary = rolled.primary;
  const result = { atk:0, hp:0, crit:0, critdmg:0 };
  for (const stat of ["atk","hp","crit","critdmg"]) {
    const base = rolled.stats[stat] || 0;
    if (!base) continue;
    const scale = stat === primary ? lp : ls;
    result[stat] = (stat==="crit"||stat==="critdmg")
      ? Math.round(base * scale * 10) / 10
      : Math.round(base * scale);
  }
  return result;
}

const EQUIPMENT_SETS = {
  yorha:   { name:"YoRHa",   color:"#8888cc", bonus2:{ missions:"+10% MEM за миссии", desc:"Слабый сигнал командования усиливает протокол." },        bonus4:{ missions:"+25% MEM + 1 ◈ за миссии", desc:"Четыре модуля YoRHa синхронизированы. Полный протокол активирован." } },
  machine: { name:"Машины",  color:"#cc6644", bonus2:{ missions:"+10% MEM за миссии", desc:"Фрагменты машинного интеллекта резонируют." },              bonus4:{ missions:"+25% MEM + 1 ◈ за миссии", desc:"Машинная сеть установила контакт. Цикл замкнулся." } },
  ancient: { name:"Древние", color:"#c8a882", bonus2:{ missions:"+10% MEM за миссии", desc:"Реликвии прошлого пробуждают скрытую память." },            bonus4:{ missions:"+25% MEM + 1 ◈ за миссии", desc:"Четыре реликвии объединены. Древний протокол восстановлен." } },
};

const EQUIPMENT_POOL = [
  // ── COMMON (без серии) ─────────────────────────────
  { id:"cw1", slot:"weapon", set:null, rarity:"common", icon:"◇", level:1, name:"Полевой тесак",        desc:"Стандартный нож выживания. Не изящно — но надёжно.", lore:"Выдаётся каждому юниту перед десантированием. Большинство теряют их на второй день.", missionStyle:"базовая дисциплина", missionBonus:"intellect", missionBonusPct:5 },
  { id:"cw2", slot:"weapon", set:null, rarity:"common", icon:"◇", level:1, name:"Обломок лезвия",       desc:"Треснутый клинок, найденный на руинах. Всё ещё режет.", lore:"Прежний владелец неизвестен. Зазубрина на рукоятке похожа на инициалы.", missionStyle:"адаптация", missionBonus:"creativity", missionBonusPct:5 },
  { id:"cw3", slot:"weapon", set:null, rarity:"common", icon:"◇", level:1, name:"Боевой прут",          desc:"Металлический прут с обмоткой. Примитивно, эффективно.", lore:"Машины тоже пользовались такими. Что-то ироничное в этом есть.", missionStyle:"грубая сила", missionBonus:"intellect", missionBonusPct:5 },
  { id:"cc1", slot:"chest",  set:null, rarity:"common", icon:"◇", level:1, name:"Полевой нагрудник",    desc:"Базовая защитная пластина. Выдаётся на складе перед вылетом.", lore:"Серийный номер выбит, но стёрт временем. Кто-то носил это до тебя." },
  { id:"cc2", slot:"chest",  set:null, rarity:"common", icon:"◇", level:1, name:"Кевларовый жилет",     desc:"Трофейная защита с поверхности. Слегка помята, но цела.", lore:"Найдена в укрытии сопротивления. Снаружи — рисунок, назначение которого непонятно." },
  { id:"cc3", slot:"chest",  set:null, rarity:"common", icon:"◇", level:1, name:"Пластины выживания",   desc:"Составная броня из подручных материалов. Каждая пластина — своя история.", lore:"Сделано руками, а не на заводе. Это придаёт ей особую ценность." },
  { id:"ch1", slot:"head",   set:null, rarity:"common", icon:"◇", level:1, name:"Боевая маска",         desc:"Простая защитная маска. Скрывает лицо — и, возможно, эмоции.", lore:"На складе их было сотни. Осталась одна." },
  { id:"ch2", slot:"head",   set:null, rarity:"common", icon:"◇", level:1, name:"Тактический козырёк",  desc:"Облегчённый щиток для глаз. Фильтрует свет, не мешает обзору.", lore:"Стандартная выдача для юнитов класса S. Применение — по усмотрению." },
  { id:"ch3", slot:"head",   set:null, rarity:"common", icon:"◇", level:1, name:"Шлем рядового",        desc:"Базовый защитный шлем. Простой. Надёжный.", lore:"Таких шлемов было выпущено 40 000 единиц. Сколько дошло до боя — неизвестно." },
  { id:"cg1", slot:"gloves", set:null, rarity:"common", icon:"◇", level:1, name:"Рабочие перчатки",     desc:"Плотная кожа, усиленные суставы. Для тех, кто работает руками.", lore:"Пахнут машинным маслом. Предыдущий владелец был механиком." },
  { id:"cg2", slot:"gloves", set:null, rarity:"common", icon:"◇", level:1, name:"Полевые рукавицы",     desc:"Стандартные перчатки для операций на поверхности.", lore:"В левой рукавице — маленькая дыра. Кто-то зашил её вручную красной нитью." },
  { id:"cb1", slot:"boots",  set:null, rarity:"common", icon:"◇", level:1, name:"Полевые сапоги",       desc:"Износостойкая обувь для долгих маршей. Грубо, но надёжно.", lore:"Прошли 300 км по руинам. Ни единого разрыва." },
  { id:"cb2", slot:"boots",  set:null, rarity:"common", icon:"◇", level:1, name:"Лёгкие ботинки",       desc:"Облегчённые сапоги для скоростных операций. Почти бесшумные.", lore:"Разработаны для разведчиков. Подошва поглощает звук шагов." },
  // ── YoRHa RARE ─────────────────────────────────────
  { id:"yw1", slot:"weapon", set:"yorha",   rarity:"rare",      icon:"◆", level:1, name:"Клинок YoRHa-VII",     desc:"Стандартный меч командного состава. Маркировка стёрта.",                    lore:"Найден на руинах Бункера. Серийный номер удалён — возможно, намеренно.", missionStyle:"дисциплина и фокус", missionBonus:"intellect", missionBonusPct:15 },
  { id:"yc1", slot:"chest",  set:"yorha",   rarity:"rare",      icon:"◆", level:1, name:"Кожух YoRHa",          desc:"Бронепластины стандартного боевого снаряжения YoRHa.",                       lore:"Выдаётся при вводе в строй. Большинство андроидов не снимают его до финального протокола." },
  { id:"yh1", slot:"head",   set:"yorha",   rarity:"rare",      icon:"◆", level:1, name:"Повязка YoRHa",        desc:"Тактическая повязка. Ограничивает восприятие — усиливает интуицию.",        lore:"Официально — для боевой концентрации. Неофициально — чтобы не видеть лишнего." },
  { id:"yg1", slot:"gloves", set:"yorha",   rarity:"rare",      icon:"◆", level:1, name:"Перчатки YoRHa",       desc:"Усиленные перчатки с нейроинтерфейсом. Улучшают контроль Pod-системы.",    lore:"Разработаны для операций на поверхности. Чёрный цвет — не камуфляж, а символ." },
  { id:"yb1", slot:"boots",  set:"yorha",   rarity:"rare",      icon:"◆", level:1, name:"Поножи YoRHa",         desc:"Боевые сапоги с усиленной подошвой. Бесшумный шаг на любом покрытии.",     lore:"Стандартная выдача. Единственный элемент, который A2 сохранила после дезертирства." },
  // ── Machine EPIC ───────────────────────────────────
  { id:"mw1", slot:"weapon", set:"machine", rarity:"epic",      icon:"▲", level:1, name:"Рычаг Адама",          desc:"Оружие машины-отступника. Форма нестабильна — сила непредсказуема.",         lore:"Адам создал его из обломков, изучая людей. Сила без понимания — опасная вещь.", missionStyle:"хаос и адаптация", missionBonus:"creativity", missionBonusPct:20 },
  { id:"mc1", slot:"chest",  set:"machine", rarity:"epic",      icon:"▲", level:1, name:"Панцирь машин",        desc:"Броня с тяжёлого машинного юнита. Чужеродная, но функциональная.",           lore:"Машины не знают боли — их броня создавалась не для защиты, а для устрашения." },
  { id:"mh1", slot:"head",   set:"machine", rarity:"epic",      icon:"▲", level:1, name:"Голова Эмиля",         desc:"Сфера с загадочным взглядом. Функция неизвестна. Иногда моргает.",           lore:"Эмиль потерял счёт своим копиям. Эта голова помнит то, о чём он давно забыл." },
  { id:"mg1", slot:"gloves", set:"machine", rarity:"epic",      icon:"▲", level:1, name:"Манипуляторы машин",   desc:"Многосуставные перчатки машинного происхождения. Сила захвата — класс А.",  lore:"Машины использовали их, чтобы строить семьи. Эволюция — странная штука." },
  { id:"mb1", slot:"boots",  set:"machine", rarity:"epic",      icon:"▲", level:1, name:"Шагоходы Pascal",      desc:"Ходовые модули деревенского юнита. Следы ведут в деревню машин.",           lore:"Pascal учил детей ходить на этих ногах. Теперь дети исчезли. Ноги остались." },
  // ── Ancient LEGENDARY ──────────────────────────────
  { id:"aw1", slot:"weapon", set:"ancient", rarity:"legendary", icon:"★", level:1, name:"Осколок Древа Вёрльда", desc:"Фрагмент мирового оружия. Резонирует с памятью земли.",                    lore:"До войны с машинами существовало Древо Вёрльда. Это — его последний фрагмент.", missionStyle:"баланс и мудрость", missionBonus:"both", missionBonusPct:30 },
  { id:"ac1", slot:"chest",  set:"ancient", rarity:"legendary", icon:"★", level:1, name:"Реликвийная мантия",   desc:"Одеяние неизвестного происхождения. Материал не поддаётся анализу.",        lore:"Датировка невозможна. Материал не существует в современных базах данных." },
  { id:"ah1", slot:"head",   set:"ancient", rarity:"legendary", icon:"★", level:1, name:"Венец Роботов",        desc:"Корона из металла, которого больше нет. Излучает слабый сигнал.",           lore:"Найден в самом глубоком бункере. Рядом лежал дневник на языке, которого не существует." },
  { id:"ag1", slot:"gloves", set:"ancient", rarity:"legendary", icon:"★", level:1, name:"Перчатки Создателя",   desc:"Прикасаясь к ним, чувствуешь чужую память. Чья — неизвестно.",             lore:"Создатели ушли. Эти перчатки — всё что осталось от тех, кто запустил всё это." },
  { id:"ab1", slot:"boots",  set:"ancient", rarity:"legendary", icon:"★", level:1, name:"Сапоги Странника",     desc:"Прошли тысячи километров. Следы ведут в никуда.",                           lore:"Старый странник ходил в них по опустевшей земле. Куда он шёл — никто не знает." },
];

// Extended weapon styles (equipment weapons)
const EQUIPMENT_WEAPON_STYLES = {
  "cw1": { style:"базовая дисциплина", bonus:"intellect",  bonusPct:5  },
  "cw2": { style:"адаптация",          bonus:"creativity", bonusPct:5  },
  "cw3": { style:"грубая сила",        bonus:"intellect",  bonusPct:5  },
  "yw1": { style:"дисциплина и фокус", bonus:"intellect",  bonusPct:15 },
  "mw1": { style:"хаос и адаптация",   bonus:"creativity", bonusPct:20 },
  "aw1": { style:"баланс и мудрость",  bonus:"both",       bonusPct:30 },
};

function getEquippedItems(gear, inventory, gachaPool) {
  if (!gear || !inventory) return {};
  const gp = gachaPool || [];
  const result = {};
  for (const slot of EQUIP_SLOTS) {
    const gearKey = gear[slot]; // may be iid or plain id
    if (!gearKey) continue;
    // Check EQUIPMENT_POOL by plain id
    const eq = EQUIPMENT_POOL.find(e => e.id === gearKey);
    if (eq) { result[slot] = { ...eq, level: 1 }; continue; }
    // Check inventory: match by iid first, then by id
    const inv = Array.isArray(inventory) ? inventory : [];
    const invItem = inv.find(i => typeof i === 'object' && (i.iid === gearKey || i.id === gearKey))
                 || inv.find(i => (typeof i === 'object' ? i.id : i) === gearKey);
    const baseId = invItem && typeof invItem === 'object' ? invItem.id : gearKey;
    const base = gp.find(e => e.id === gearKey) || gp.find(e => e.id === baseId)
              || EQUIPMENT_POOL.find(e => e.id === baseId);
    if (base) {
      const iid = invItem && invItem.iid ? invItem.iid : gearKey;
      result[slot] = { ...base, slot: base.slot || "weapon", level:1, iid };
    }
  }
  return result;
}

function getSetBonuses(gear, inventory, gachaPool) {
  const equippedItems = getEquippedItems(gear, inventory, gachaPool);
  const setCounts = {};
  for (const item of Object.values(equippedItems)) {
    if (item.set) setCounts[item.set] = (setCounts[item.set] || 0) + 1;
  }
  const bonuses = [];
  for (const [setId, count] of Object.entries(setCounts)) {
    const setDef = EQUIPMENT_SETS[setId];
    if (!setDef) continue;
    if (count >= 4)      bonuses.push({ setId, count, level:"full",  ...setDef.bonus4, color:setDef.color, setName:setDef.name });
    else if (count >= 2) bonuses.push({ setId, count, level:"minor", ...setDef.bonus2, color:setDef.color, setName:setDef.name });
  }
  return bonuses;
}

function getSetMemMultiplier(gear, inventory, gachaPool) {
  const bonuses = getSetBonuses(gear, inventory, gachaPool);
  let mult = 1, extraFrags = 0;
  for (const b of bonuses) {
    if (b.level === "full")       { mult += 0.25; extraFrags += 1; }
    else if (b.level === "minor") { mult += 0.10; }
  }
  return { mult, extraFrags };
}

// ═══════════════════════════════════════════════════════
// EQUIPMENT TAB COMPONENT
// ═══════════════════════════════════════════════════════

export default function EquipmentTab({ S, setS, accent, toastFn, showDialogue, fid, gachaPool, weaponStyles, rarityColors, inArr: inArrFn }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [insertSlot, setInsertSlot]     = useState(null);
  const [openSlot, setOpenSlot]         = useState(null);   // какой слот открыт в popup
  const gear      = S.gear || {};
  const inventory = S.inventory || [];

  const ownedEquipment = EQUIPMENT_POOL.filter(e => inArrFn(inventory, e.id));

  const equipItem = (item) => {
    const prevBonuses = getSetBonuses(gear, inventory, gachaPool);
    setInsertSlot(item.slot);
    setTimeout(() => setInsertSlot(null), 600);
    setS(p => {
      const gearKey = item.iid || item.id;
      const newGear = { ...(p.gear || {}), [item.slot]: gearKey };
      const newEquipped = { ...(p.equipped || {}) };
      if (item.slot === "weapon") newEquipped.weapon = gearKey;
      return { ...p, gear: newGear, equipped: newEquipped };
    });
    setTimeout(() => {
      const newGear = { ...gear, [item.slot]: item.id };
      const newBonuses = getSetBonuses(newGear, inventory, gachaPool);
      const prevB = prevBonuses.map(b => b.setId + b.level).join(",");
      const newB  = newBonuses.map(b => b.setId + b.level).join(",");
      if (newB !== prevB) {
        const full  = newBonuses.find(b => b.level === "full"  && !prevBonuses.find(pb => pb.setId === b.setId && pb.level === "full"));
        const minor = newBonuses.find(b => b.level === "minor" && !prevBonuses.find(pb => pb.setId === b.setId && pb.level === "minor"));
        if (full) showDialogue("setBonus4"); else if (minor) showDialogue("setBonus2");
      } else showDialogue("equipItem");
    }, 300);
    toastFn("ЧИП УСТАНОВЛЕН ◈");
  };

  const unequipSlot = (slot) => {
    setS(p => {
      const newGear = { ...(p.gear || {}) };
      delete newGear[slot];
      const newEquipped = { ...(p.equipped || {}) };
      if (slot === "weapon") newEquipped.weapon = null;
      return { ...p, gear: newGear, equipped: newEquipped };
    });
    toastFn("СЛОТ ОСВОБОЖДЁН");
  };

  const equippedItems = getEquippedItems(gear, inventory, gachaPool);
  const setBonuses    = getSetBonuses(gear, inventory, gachaPool);
  const formImg       = fid === "reborn" ? "https://i.ibb.co/4wPkwGsJ/nr-10h-reborn-warden-Photoroom.png"
                      : fid === "abstract" ? "https://i.ibb.co/kgb7fW9d/nr-10h-abstract-savior-Photoroom.png"
                      : "https://i.ibb.co/DgMDtFFk/nr-10h-sentinel-savior-Photoroom.png";

  const slotPositions = {
    head:   { top:"10%" }, chest:  { top:"30%" },
    weapon: { top:"20%" }, gloves: { top:"52%" }, boots:  { top:"76%" },
  };

  return (
    <div>
      <div style={{ fontSize:8, letterSpacing:3, color:"#444", marginBottom:12 }}>СНАРЯЖЕНИЕ · МОДУЛЬНАЯ ПЛАТА</div>
      <style>{`@keyframes chipInsert{0%{opacity:0;transform:scale(0.8)}60%{opacity:1;transform:scale(1.1)}100%{transform:scale(1)}}`}</style>

      {/* Art — full width, tall */}
      <div style={{ position:"relative", marginBottom:12 }}>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", zIndex:1, opacity:0.15 }} viewBox="0 0 448 520" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="224" y1="0"   x2="224" y2="520" stroke={accent} strokeWidth="0.5" strokeDasharray="4 8"/>
          <line x1="0"   y1="260" x2="448" y2="260" stroke={accent} strokeWidth="0.5" strokeDasharray="4 8"/>
          <line x1="10"  y1="52"  x2="438" y2="52"  stroke={accent} strokeWidth="0.3" opacity="0.5"/>
          <line x1="10"  y1="156" x2="438" y2="156" stroke={accent} strokeWidth="0.3" opacity="0.5"/>
          <line x1="10"  y1="364" x2="438" y2="364" stroke={accent} strokeWidth="0.3" opacity="0.5"/>
          <line x1="10"  y1="468" x2="438" y2="468" stroke={accent} strokeWidth="0.3" opacity="0.5"/>
          {[[224,52],[224,156],[224,364],[224,468],[40,208],[408,208],[40,312],[408,312]].map(([x,y],i)=>(
            <circle key={i} cx={x} cy={y} r="3" fill="none" stroke={accent} strokeWidth="0.8"/>
          ))}
          <rect x="4"   y="4"   width="14" height="14" fill="none" stroke={accent} strokeWidth="0.5"/>
          <rect x="430" y="4"   width="14" height="14" fill="none" stroke={accent} strokeWidth="0.5"/>
          <rect x="4"   y="502" width="14" height="14" fill="none" stroke={accent} strokeWidth="0.5"/>
          <rect x="430" y="502" width="14" height="14" fill="none" stroke={accent} strokeWidth="0.5"/>
        </svg>
        {/* Art — увеличен, выровнен по центру */}
        <div style={{ height:520, backgroundImage:"url("+formImg+")", backgroundSize:"contain", backgroundRepeat:"no-repeat", backgroundPosition:"center bottom", position:"relative", zIndex:2, filter:"drop-shadow(0 0 20px "+accent+"33)" }}/>
        {/* Slot indicators — кликабельные квадратики на плате */}
        {["head","chest","weapon","gloves","boots"].map(slot => {
          const eq     = equippedItems[slot];
          const pos    = slotPositions[slot];
          const isLeft = slot === "weapon";
          const isOpen = openSlot === slot;
          // Предметы доступные для этого слота
          const slotItems = [
            ...EQUIPMENT_POOL.filter(e => e.slot === slot && inArrFn(inventory, e.id)),
            ...(slot === "weapon" ? gachaPool.filter(i => i.type === "weapon" && inArrFn(inventory, i.id)).map(i => ({...i, slot:"weapon"})) : []),
          ];
          return (
            <div key={slot} style={{ position:"absolute", zIndex:10, top:pos.top, [isLeft?"left":"right"]:0, display:"flex", flexDirection:isLeft?"row":"row-reverse", alignItems:"center", gap:3 }}>
              <div style={{ width:30, height:1, background:eq?accent:"#2a2a2a", transition:"background 0.4s", boxShadow:eq?"0 0 5px "+accent:"none" }}/>
              {/* Кликабельный квадратик */}
              <div
                onClick={e => { e.stopPropagation(); setOpenSlot(isOpen ? null : slot); }}
                style={{ width:26, height:26, background:isOpen?accent+"44":eq?accent+"22":"#0a0a0a", border:"1px solid "+(isOpen?accent:eq?accent:"#2a2a2a"), boxShadow:isOpen?"0 0 12px "+accent+"cc":eq?"0 0 8px "+accent+"88":"none", transition:"all 0.25s", animation:insertSlot===slot?"chipInsert 0.5s ease":"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:isOpen?accent:eq?accent:"#444" }}>
                {eq ? eq.icon : "+"}
              </div>
              {/* Popup меню */}
              {isOpen && (
                <div style={{ position:"absolute", [isLeft?"left":"right"]:22, top:"-8px", zIndex:20, background:"#050505", border:"1px solid "+accent+"44", borderTop:"2px solid "+accent, minWidth:200, maxWidth:260, boxShadow:"0 4px 24px #000a", padding:10 }}>
                  {/* Угловой декор */}
                  <div style={{ position:"absolute", top:0, [isLeft?"right":"left"]:0, width:10, height:10, borderBottom:"1px solid "+accent+"44", [isLeft?"borderLeft":"borderRight"]:"1px solid "+accent+"44" }}/>
                  <div style={{ fontSize:7, letterSpacing:3, color:accent, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span>{SLOT_LABELS[slot]}</span>
                    <span onClick={e=>{e.stopPropagation();setOpenSlot(null);}} style={{ cursor:"pointer", color:"#444", fontSize:10 }}>✕</span>
                  </div>
                  {/* Снять */}
                  {eq && (
                    <div onClick={e=>{e.stopPropagation();unequipSlot(slot);setOpenSlot(null);}}
                      style={{ padding:"6px 8px", marginBottom:6, border:"1px solid #c4444433", color:"#c44", fontSize:8, cursor:"pointer", letterSpacing:1, display:"flex", alignItems:"center", gap:6 }}
                      onMouseEnter={e=>e.currentTarget.style.background="#c4444411"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      ✕ СНЯТЬ: {eq.name}
                    </div>
                  )}
                  {/* Список предметов */}
                  {slotItems.length === 0 ? (
                    <div style={{ padding:"10px 8px", fontSize:8, color:"#333", textAlign:"center", letterSpacing:1 }}>
                      — НЕТ ПРЕДМЕТОВ —<br/>
                      <span style={{ fontSize:7, color:"#222" }}>Получите снаряжение в Архиве</span>
                    </div>
                  ) : (
                    <div style={{ maxHeight:200, overflowY:"auto" }}>
                      {slotItems.map(item => {
                        const rc = rarityColors[item.rarity] || "#888";
                        const isEq = gear[slot] === item.id;
                        const setDef = item.set ? EQUIPMENT_SETS[item.set] : null;
                        return (
                          <div key={item.id}
                            onClick={e => { e.stopPropagation(); if (!isEq) { equipItem(item); } setOpenSlot(null); }}
                            onMouseEnter={e => { if (!isEq) e.currentTarget.style.background = rc+"11"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = isEq ? rc+"18" : "transparent"; }}
                            style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 8px", marginBottom:3, border:"1px solid "+(isEq?rc+"55":"#111"), background:isEq?rc+"18":"transparent", cursor:isEq?"default":"pointer", transition:"all 0.15s" }}>
                            <span style={{ fontSize:14, color:rc, flexShrink:0 }}>{item.icon}</span>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:8, color:isEq?"#e8e0d0":rc, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.name}</div>
                              <div style={{ fontSize:7, color:"#444", display:"flex", gap:4, alignItems:"center", flexWrap:"wrap" }}>
                                <span style={{ color:rc }}>{item.rarity?.toUpperCase()}</span>
                                {setDef && <span style={{ color:setDef.color }}>· {setDef.name}</span>}
                                {(() => {
                                  const r = rollItemStats(item);
                                  const cs = calcStats(item);
                                  const pv = cs[r.primary];
                                  const pr = STAT_RANGES[r.primary];
                                  if (!pr) return null;
                                  return <span style={{ color:"#888" }}>· {pr.label} {pv}{pr.suffix}</span>;
                                })()}
                              </div>
                            </div>
                            {isEq && <span style={{ fontSize:8, color:rc, flexShrink:0 }}>◈</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {/* Клик вне popup — закрыть */}
        {openSlot && <div style={{ position:"fixed", inset:0, zIndex:9 }} onClick={() => setOpenSlot(null)}/>}
      </div>

      {/* Status bar — compact equipped overview */}
      <div style={{ display:"flex", gap:4, marginBottom:14, flexWrap:"wrap" }}>
        {EQUIP_SLOTS.map(slot => {
          const item = equippedItems[slot];
          const rc   = item ? (rarityColors[item.rarity] || "#888") : "#1a1a1a";
          const isIns = insertSlot === slot;
          return (
            <div key={slot} style={{ flex:"1 1 80px", minWidth:80, border:"1px solid "+(item?rc+"44":"#111"), borderTop:"2px solid "+(item?rc:"#1a1a1a"), background:"#050505", padding:"6px 8px", transition:"all 0.3s", boxShadow:isIns?"0 0 10px "+rc+"55":"none", animation:isIns?"chipInsert 0.5s ease":"none" }}>
              <div style={{ fontSize:7, color:"#333", letterSpacing:1, marginBottom:3 }}>{SLOT_ICONS[slot]} {SLOT_LABELS[slot]}</div>
              {item ? (
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <span style={{ fontSize:10, color:rc }}>{item.icon}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:8, color:rc, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.name}</div>
                    <div style={{ fontSize:7, color:"#333" }}>{item.rarity?.toUpperCase()}</div>
                  </div>
                  <button onClick={() => setSelectedItem(item)}
                    onMouseEnter={e=>{e.target.style.color=rc;}} onMouseLeave={e=>{e.target.style.color="#333";}}
                    style={{ background:"none", border:"none", color:"#333", fontSize:9, cursor:"pointer", padding:0, transition:"color 0.2s" }}>ⓘ</button>
                </div>
              ) : (
                <div style={{ fontSize:7, color:"#1a1a1a", letterSpacing:1 }}>— ПУСТО —</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Set bonuses */}
      {setBonuses.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:7, letterSpacing:3, color:"#444", marginBottom:8 }}>АКТИВНЫЕ СЕТ-БОНУСЫ</div>
          {setBonuses.map((b, i) => (
            <div key={i} style={{ padding:"10px 12px", border:"1px solid "+b.color+"33", borderLeft:"2px solid "+b.color, background:"#050505", marginBottom:6 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ fontSize:9, color:b.color, fontWeight:700, letterSpacing:1 }}>{b.setName} · {b.count}/5</div>
                <div style={{ fontSize:7, color:b.level==="full"?"#ffcc00":"#888", letterSpacing:1 }}>{b.level==="full"?"◈ ПОЛНЫЙ":"◇ МАЛЫЙ"}</div>
              </div>
              <div style={{ fontSize:8, color:"#555" }}>{b.missions}</div>
              <div style={{ fontSize:8, color:"#3a3a3a", marginTop:2, fontStyle:"italic" }}>{b.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* Inventory */}
      <div style={{ marginBottom:10 }}>
        <div style={{ fontSize:7, letterSpacing:3, color:"#444", marginBottom:8 }}>ИНВЕНТАРЬ — СНАРЯЖЕНИЕ{ownedEquipment.length > 0 && <span style={{ color:"#555" }}> [{ownedEquipment.length}]</span>}</div>
        {ownedEquipment.length === 0 ? (
          <div style={{ padding:"24px 0", textAlign:"center", border:"1px solid #0d0d0d" }}>
            <div style={{ fontSize:20, marginBottom:8, color:"#1a1a1a" }}>◈</div>
            <div style={{ fontSize:8, color:"#1a1a1a", letterSpacing:2 }}>СНАРЯЖЕНИЕ НЕ ПОЛУЧЕНО</div>
            <div style={{ fontSize:8, color:"#111", marginTop:4, lineHeight:1.8 }}>Выпадает из Архива по обычной градации редкости</div>
          </div>
        ) : (
          EQUIP_SLOTS.map(slot => {
            const slotItems = ownedEquipment.filter(e => e.slot === slot);
            if (!slotItems.length) return null;
            return (
              <div key={slot} style={{ marginBottom:10 }}>
                <div style={{ fontSize:7, letterSpacing:2, color:"#333", marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>
                  <span>{SLOT_ICONS[slot]}</span><span>{SLOT_LABELS[slot]}</span>
                </div>
                {slotItems.map(item => {
                  const rc = rarityColors[item.rarity] || "#888";
                  const isEquipped = gear[item.slot] === item.id;
                  const setDef = item.set ? EQUIPMENT_SETS[item.set] : null;
                  return (
                    <div key={item.id} onClick={() => isEquipped ? setSelectedItem(item) : equipItem(item)}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", marginBottom:5, border:"1px solid "+(isEquipped?rc+"55":"#111"), borderLeft:"2px solid "+(isEquipped?rc:"#1a1a1a"), background:isEquipped?"#080808":"#030303", cursor:"pointer", transition:"all 0.2s" }}>
                      <span style={{ fontSize:16, color:rc }}>{item.icon}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:2, flexWrap:"wrap" }}>
                          <span style={{ fontSize:9, color:"#c8c0b8", fontWeight:700 }}>{item.name}</span>
                          <span style={{ fontSize:7, color:rc, letterSpacing:1 }}>{item.rarity.toUpperCase()}</span>
                          {setDef && <span style={{ fontSize:7, color:setDef.color, letterSpacing:1 }}>{setDef.name}</span>}
                        </div>
                        <div style={{ fontSize:8, color:"#555", lineHeight:1.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.desc}</div>
                        {slot === "weapon" && item.missionBonusPct && <div style={{ fontSize:7, color:"#c8a882", marginTop:1 }}>+{item.missionBonusPct}% MEM за миссии</div>}
                      </div>
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        {isEquipped ? <div style={{ fontSize:8, color:rc, letterSpacing:1 }}>◈ НАДЕТ</div> : <div style={{ fontSize:8, color:"#444" }}>НАДЕТЬ</div>}
                        <div style={{ fontSize:7, color:"#2a2a2a", marginTop:2 }}>Lv.1</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Legacy gacha weapons */}
      {(() => {
        const lw = gachaPool.filter(i => i.type === "weapon" && inArrFn(inventory, i.id));
        if (!lw.length) return null;
        return (
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:7, letterSpacing:2, color:"#333", marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>⚔ ОРУЖИЕ (АРХИВ)</div>
            {lw.map(item => {
              const rc = rarityColors[item.rarity] || "#888";
              const isEquipped = gear["weapon"] === item.id || (!gear["weapon"] && S.equipped?.weapon === item.id);
              const ws = weaponStyles[item.id];
              return (
                <div key={item.id} onClick={() => {
                  if (isEquipped) { unequipSlot("weapon"); } else {
                    setInsertSlot("weapon"); setTimeout(() => setInsertSlot(null), 600);
                    setS(p => ({ ...p, gear:{ ...(p.gear||{}), weapon:item.id }, equipped:{ ...(p.equipped||{}), weapon:item.id } }));
                    showDialogue("equipItem"); toastFn("ОРУЖИЕ УСТАНОВЛЕНО ◈");
                  }
                }} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 10px", marginBottom:5, border:"1px solid "+(isEquipped?rc+"55":"#111"), borderLeft:"2px solid "+(isEquipped?rc:"#1a1a1a"), background:isEquipped?"#080808":"#030303", cursor:"pointer", transition:"all 0.2s" }}>
                  <span style={{ fontSize:16, color:rc }}>{item.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:2 }}>
                      <span style={{ fontSize:9, color:"#c8c0b8", fontWeight:700 }}>{item.name}</span>
                      <span style={{ fontSize:7, color:rc, letterSpacing:1 }}>{item.rarity.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize:8, color:"#555" }}>{item.desc}</div>
                    {ws && <div style={{ fontSize:7, color:"#c8a882", marginTop:1 }}>+{ws.bonusPct}% MEM за миссии</div>}
                  </div>
                  <div style={{ flexShrink:0 }}>
                    {isEquipped ? <div style={{ fontSize:8, color:rc }}>◈ НАДЕТ</div> : <div style={{ fontSize:8, color:"#444" }}>НАДЕТЬ</div>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Set catalog */}
      <div style={{ marginTop:16, padding:"14px 16px", border:"1px solid #111" }}>
        <div style={{ fontSize:7, letterSpacing:3, color:"#444", marginBottom:12 }}>КАТАЛОГ СЕРИЙ</div>
        {Object.entries(EQUIPMENT_SETS).map(([setId, setDef]) => {
          const setItems      = EQUIPMENT_POOL.filter(e => e.set === setId);
          const ownedCount    = setItems.filter(e => inArrFn(inventory, e.id)).length;
          const equippedCount = setItems.filter(e => gear[e.slot] === e.id).length;
          return (
            <div key={setId} style={{ marginBottom:16, paddingBottom:16, borderBottom:"1px solid #0d0d0d" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <div style={{ fontSize:10, color:setDef.color, fontWeight:700, letterSpacing:2 }}>{setDef.name.toUpperCase()}</div>
                <div style={{ fontSize:8, color:"#444" }}>{equippedCount}/5 надет · {ownedCount}/5 есть</div>
              </div>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:7, color:"#555", marginBottom:2 }}>◇ 2 предмета: <span style={{ color:"#888" }}>{setDef.bonus2.missions}</span></div>
                <div style={{ fontSize:7, color:"#555" }}>◈ 4 предмета: <span style={{ color:setDef.color }}>{setDef.bonus4.missions}</span></div>
              </div>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {setItems.map(item => {
                  const owned    = inArrFn(inventory, item.id);
                  const equipped = gear[item.slot] === item.id;
                  const rc       = rarityColors[item.rarity] || "#888";
                  return (
                    <div key={item.id} style={{ fontSize:8, padding:"3px 8px", border:"1px solid "+(equipped?rc:owned?rc+"44":"#111"), color:equipped?rc:owned?rc+"aa":"#333", background:equipped?rc+"11":"#050505" }}>
                      {item.icon} {SLOT_LABELS[item.slot]}{equipped && " ◈"}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Item detail popup */}
      {selectedItem && (
        <div style={{ position:"fixed", inset:0, zIndex:9989, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Courier New',monospace", padding:16 }} onClick={() => setSelectedItem(null)}>
          <div style={{ background:"#080808", border:"1px solid #222", borderTop:"2px solid "+(rarityColors[selectedItem.rarity]||"#888"), maxWidth:380, width:"100%", padding:24, position:"relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedItem(null)} style={{ position:"absolute", top:12, right:12, background:"none", border:"none", color:"#444", fontSize:18, cursor:"pointer" }}>✕</button>
            <div style={{ fontSize:7, letterSpacing:3, color:"#555", marginBottom:4 }}>ДАННЫЕ МОДУЛЯ</div>
            <div style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom:16 }}>
              <div style={{ fontSize:32, color:rarityColors[selectedItem.rarity]||"#888" }}>{selectedItem.icon}</div>
              <div>
                <div style={{ fontSize:13, color:"#e8e0d0", fontWeight:700, letterSpacing:2, marginBottom:4 }}>{selectedItem.name}</div>
                <div style={{ fontSize:8, color:rarityColors[selectedItem.rarity]||"#888", letterSpacing:2 }}>{selectedItem.rarity?.toUpperCase()} · {SLOT_LABELS[selectedItem.slot]}</div>
                {selectedItem.set && <div style={{ fontSize:8, color:EQUIPMENT_SETS[selectedItem.set]?.color||"#888", marginTop:2 }}>Серия: {EQUIPMENT_SETS[selectedItem.set]?.name}</div>}
              </div>
            </div>
            <div style={{ fontSize:9, color:"#666", lineHeight:1.8, marginBottom:12 }}>{selectedItem.desc}</div>
            {selectedItem.lore && (
              <div style={{ padding:"10px 12px", border:"1px solid #111", borderLeft:"2px solid "+(rarityColors[selectedItem.rarity]||"#444")+"44", marginBottom:12 }}>
                <div style={{ fontSize:7, letterSpacing:2, color:"#444", marginBottom:4 }}>ЛОР-ФАЙЛ</div>
                <div style={{ fontSize:9, color:"#555", fontStyle:"italic", lineHeight:1.8 }}>{selectedItem.lore}</div>
              </div>
            )}
            {(() => {
              const rolled  = rollItemStats(selectedItem);
              const cs      = calcStats(selectedItem);
              const allStats = [
                { key:"atk",     val: cs.atk,     label:"АТК",       suffix:"" },
                { key:"hp",      val: cs.hp,       label:"HP",         suffix:"" },
                { key:"crit",    val: cs.crit,     label:"КРИТ.ШНС",   suffix:"%" },
                { key:"critdmg", val: cs.critdmg,  label:"КРИТ.УРОН",  suffix:"%" },
              ].filter(s => s.val > 0);
              return (
                <div style={{ padding:"10px 12px", border:"1px solid #111", marginBottom:12 }}>
                  <div style={{ fontSize:7, letterSpacing:2, color:"#444", marginBottom:8 }}>ХАРАКТЕРИСТИКИ</div>
                  {allStats.map(({ key, val, label, suffix }) => {
                    const isPrimary = rolled.primary === key;
                    return (
                      <div key={key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          {isPrimary && <span style={{ fontSize:8, color:accent }}>◆</span>}
                          {!isPrimary && <span style={{ fontSize:8, color:"#2a2a2a" }}>·</span>}
                          <span style={{ fontSize:8, color: isPrimary ? "#888" : "#555", letterSpacing:1 }}>{label}</span>
                        </div>
                        <span style={{ fontSize: isPrimary ? 10 : 8, fontWeight: isPrimary ? 700 : 400, color: isPrimary ? accent : "#666" }}>
                          {val}{suffix}
                        </span>
                      </div>
                    );
                  })}
                  {selectedItem.slot === "weapon" && (selectedItem.missionBonusPct || weaponStyles[selectedItem.id]?.bonusPct) > 0 && (
                    <div style={{ marginTop:6, paddingTop:6, borderTop:"1px solid #111", fontSize:8, color:"#c8a882" }}>
                      +{selectedItem.missionBonusPct || weaponStyles[selectedItem.id]?.bonusPct}% MEM за миссии
                    </div>
                  )}
                </div>
              );
            })()}
            <div style={{ padding:"8px 12px", border:"1px solid #111" }}>
              <div style={{ fontSize:7, letterSpacing:2, color:"#444", marginBottom:6 }}>УЛУЧШЕНИЕ</div>
              {(() => {
                const slot = selectedItem.slot;
                const lvl  = (S.gearLevels||{})[slot] || 1;
                const maxed = lvl >= 5;
                return (
                  <>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                      <div style={{ fontSize:8, color: maxed ? "#c8a882" : "#888" }}>Уровень: {lvl}/5{maxed?" ★":""}</div>
                      <div style={{ flex:1, height:2, background:"#111" }}>
                        <div style={{ height:"100%", width:((lvl-1)/4*100)+"%", background: maxed?"#c8a882":accent, transition:"width 0.4s" }}/>
                      </div>
                    </div>
                    {maxed
                      ? <div style={{ fontSize:7, color:"#c8a882", letterSpacing:1 }}>◆ МАКСИМАЛЬНЫЙ УРОВЕНЬ</div>
                      : <div style={{ fontSize:7, color:"#555", lineHeight:1.6 }}>Материалы для улучшения — вкладка ⚡ БОЙ → АПГРЕЙД</div>
                    }
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export {
  EQUIP_SLOTS, SLOT_LABELS, SLOT_ICONS,
  RARITY_STAT_MULT, STAT_RANGES, SLOT_PRIMARY, SLOT_SECONDARIES,
  PRIMARY_MULT, SECONDARY_MULT,
  EQUIPMENT_SETS, EQUIPMENT_POOL, EQUIPMENT_WEAPON_STYLES,
  getStatScale, calcStats, rollItemStats,
  getEquippedItems, getSetBonuses, getSetMemMultiplier,
};
