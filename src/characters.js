// ═══════════════════════════════════════════════════════
// characters.js
// Все данные персонажей проекта.
// Чтобы добавить нового персонажа — создай объект
// по образцу CHARACTER_10H и зарегистрируй его в CHARACTERS.
// ═══════════════════════════════════════════════════════

// ── Изображения форм ────────────────────────────────────────────────────────

export const CHARACTER_10H = {
  id: "10h",
  shortName: "No.10 TYPE H",
  fullName: "YoRHa No.10 Type H",

  // Изображения для каждой формы
  imgs: {
    sentinel: "https://i.ibb.co/DgMDtFFk/nr-10h-sentinel-savior-Photoroom.png",
    abstract: "https://i.ibb.co/kgb7fW9d/nr-10h-abstract-savior-Photoroom.png",
    reborn:   "https://i.ibb.co/4wPkwGsJ/nr-10h-reborn-warden-Photoroom.png",
  },

  // Формы / скины персонажа
  forms: {
    sentinel: { name: "SENTINEL SAVIOR", unlockFw: 1,  accent: "#8888cc", desc: "Базовая боевая форма YoRHa No.10 Type H." },
    abstract: { name: "ABSTRACT SAVIOR", unlockFw: 5,  accent: "#44aaff", desc: "Улучшенная форма. Длинное пальто, расширенный арсенал." },
    reborn:   { name: "REBORN WARDEN",   unlockFw: 9,  accent: "#ffe0a0", desc: "Финальная форма. Белое облачение, реликвийное оружие." },
  },

  // Базовые характеристики для Battle Mode
  // BASE_HP = baseHp + fw * hpPerFw
  // BASE_ATK = baseAtk + fw * atkPerFw
  battleStats: {
    baseHp:   30,
    hpPerFw:  6,
    baseAtk:  4,
    atkPerFw: 1,
    baseCrit:    5,
    baseCritdmg: 40,
  },

  // Способности персонажа в Battle Mode
  abilities: [
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
  ],

  // Диалоги персонажа
  dialogues: {
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
    equipItem: [
      "Чип установлен. Система адаптируется.",
      "Модуль интегрирован. Параметры обновлены.",
      "...Это тебе идёт. Не то чтобы я обращаю внимание.",
    ],
    setBonus2: [
      "Два элемента серии синхронизированы. Слабый резонанс зафиксирован.",
      "Частичная синхронизация. Протокол активирован на минимуме.",
    ],
    setBonus4: [
      "Четыре элемента серии объединены. Полный протокол активирован!",
      "Резонанс максимальный. Командование зафиксировало аномальный сигнал.",
    ],
  },
};


// ═══════════════════════════════════════════════════════
// Реестр персонажей (для гачи и выбора персонажа)
// Добавь сюда нового персонажа, когда будешь готов.
// ═══════════════════════════════════════════════════════

export const CHARACTERS = {
  [CHARACTER_10H.id]: CHARACTER_10H,
  // "2b": CHARACTER_2B,  ← пример будущего персонажа
};

// Персонаж по умолчанию
export const DEFAULT_CHARACTER_ID = CHARACTER_10H.id;


// ═══════════════════════════════════════════════════════
// Вспомогательные функции
// ═══════════════════════════════════════════════════════

/** Возвращает объект персонажа по id (или дефолтного) */
export function getCharacter(id) {
  return CHARACTERS[id] || CHARACTERS[DEFAULT_CHARACTER_ID];
}

/** Возвращает изображение персонажа для текущей формы */
export function getCharacterImg(characterId, formId) {
  const char = getCharacter(characterId);
  return char.imgs[formId] || char.imgs[Object.keys(char.imgs)[0]];
}

/** Возвращает данные формы персонажа */
export function getCharacterForm(characterId, formId) {
  const char = getCharacter(characterId);
  return char.forms[formId] || char.forms[Object.keys(char.forms)[0]];
}

/** Возвращает базовые боевые характеристики персонажа с учётом fw */
export function computeCharacterBattleBase(characterId, fw) {
  const char = getCharacter(characterId);
  const s = char.battleStats;
  return {
    baseHp:  s.baseHp  + (fw || 1) * s.hpPerFw,
    baseAtk: s.baseAtk + (fw || 1) * s.atkPerFw,
    baseCrit:    s.baseCrit,
    baseCritdmg: s.baseCritdmg,
  };
}

/** Возвращает способности персонажа для Battle Mode */
export function getCharacterAbilities(characterId) {
  return getCharacter(characterId).abilities;
}

/** Возвращает случайный диалог персонажа по типу */
export function getCharacterDialogue(characterId, type, params) {
  const char = getCharacter(characterId);
  const dialogues = char.dialogues;
  let lines;
  if (type === "missionComplete") {
    lines = dialogues.missionComplete?.[params?.threat] || dialogues.missionComplete?.["СРЕДНЯЯ"] || [];
  } else if (type === "formUnlock") {
    lines = dialogues.formUnlock?.[params?.form] || dialogues.formUnlock?.abstract || [];
  } else {
    lines = dialogues[type] || [];
  }
  let line = lines[Math.floor(Math.random() * lines.length)] || "";
  if (params?.fw)  line = line.replace("{fw}", params.fw);
  if (params?.day) line = line.replace("{day}", params.day);
  return line;
}
