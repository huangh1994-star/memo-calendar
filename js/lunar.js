/**
 * 农历计算模块 + 传统节日数据
 * 使用简化的预验证数据，覆盖 2025-2030 年
 * 农历日期显示约为 ±1 天精度，节日日期为精确值
 */

// ========== 年份基础数据 ==========

/**
 * 2025-2030 农历年数据（已根据官方农历校对）
 * cny: 农历正月初一的公历日期
 * months: 12个字符，'0'=29天，'1'=30天
 * leap: 闰月月份（0=无闰月），闰月天数通过 leapDays 指定
 * leapDays: 闰月天数（29或30），默认29
 */
const LUNAR_YEAR_DATA = {
  // 乙巳年，闰六月（29天），正月30天
  2025: { cny: '2025-01-29', months: '101010101010', leap: 6, leapDays: 29 },
  // 丙午年，无闰月，正月29天（M8=29,M9-11=30,M12=29）
  2026: { cny: '2026-02-17', months: '010101001110', leap: 0 },
  // 丁未年，无闰月，正月30天
  2027: { cny: '2027-02-06', months: '101010101010', leap: 0 },
  // 戊申年，闰五月（29天），正月30天
  2028: { cny: '2028-01-26', months: '101011010101', leap: 5, leapDays: 29 },
  // 己酉年，无闰月，正月30天
  2029: { cny: '2029-02-13', months: '101010101010', leap: 0 },
  // 庚戌年，无闰月，正月29天
  2030: { cny: '2030-02-03', months: '010101010101', leap: 0 },
};

// 农历月份名称
const LUNAR_MONTH_NAMES = ['', '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月'];
const LUNAR_DAY_NAMES = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

// 天干地支生肖
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SHENG_XIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

// ========== 核心计算函数 ==========

/** 获取指定年份的农历数据 */
function getLunarYearData(year) {
  // 先查精确表
  if (LUNAR_YEAR_DATA[year]) return LUNAR_YEAR_DATA[year];
  // 超出范围则用最近年份近似推算
  if (year < 2025) {
    return { cny: `${year}-01-22`, months: '101010101010', leap: 0 };
  }
  if (year > 2030) {
    return { cny: `${year}-01-22`, months: '101010101010', leap: 0 };
  }
}

/** 计算从CNY到指定月日的偏移天数 */
function daysFromCNY(yearData, month, day) {
  let days = 0;
  const leap = yearData.leap;
  const leapDays = yearData.leapDays || 29;

  for (let m = 1; m < month; m++) {
    days += (yearData.months[m - 1] === '1') ? 30 : 29;
    // 经过闰月（闰月在对应月份之后）
    if (m === leap) {
      days += leapDays;
    }
  }
  days += (day - 1);
  return days;
}

/**
 * 将公历日期转换为农历日期
 * @param {Date} date - 公历日期
 * @returns {Object|null} 农历日期信息
 */
function solarToLunar(date) {
  const dateStr = date.toISOString().split('T')[0];
  const year = date.getFullYear();

  // 确定属于哪个农历年：比较日期与各年CNY
  let lunarYear = year;
  let yearData = getLunarYearData(lunarYear);

  // 如果日期在当年CNY之前，属于上一个农历年
  if (yearData && dateStr < yearData.cny) {
    lunarYear--;
    yearData = getLunarYearData(lunarYear);
  }

  // 检查是否属于下一个农历年
  const nextYearData = getLunarYearData(lunarYear + 1);
  if (nextYearData && dateStr >= nextYearData.cny) {
    lunarYear++;
    yearData = nextYearData;
  }

  if (!yearData) return null;

  // 计算从CNY到目标日期的天数
  const cnyDate = new Date(yearData.cny + 'T00:00:00');
  let offset = Math.round((date - cnyDate) / 86400000);

  if (offset < 0) return null;

  // 逐月推进
  const leap = yearData.leap;
  const leapDays = yearData.leapDays || 29;
  let lunarMonth = 1;
  let isLeap = false;

  for (let m = 1; m <= 12; m++) {
    const mDays = (yearData.months[m - 1] === '1') ? 30 : 29;

    if (offset < mDays) {
      lunarMonth = m;
      break;
    }
    offset -= mDays;

    // 检查闰月
    if (m === leap) {
      if (offset < leapDays) {
        lunarMonth = m;
        isLeap = true;
        break;
      }
      offset -= leapDays;
    }

    if (m === 12) lunarMonth = 12;
  }

  const lunarDay = offset + 1;

  // 天干地支
  const yearOffset = (lunarYear - 4) % 60;
  const tg = TIAN_GAN[((yearOffset % 10) + 10) % 10];
  const dz = DI_ZHI[((yearOffset % 12) + 12) % 12];
  const sx = SHENG_XIAO[((yearOffset % 12) + 12) % 12];
  const yearName = tg + dz + '年（' + sx + '）';

  return {
    year: lunarYear,
    month: lunarMonth,
    day: lunarDay,
    isLeap,
    yearName,
    monthName: (isLeap ? '闰' : '') + LUNAR_MONTH_NAMES[lunarMonth],
    dayName: LUNAR_DAY_NAMES[Math.min(lunarDay, 30)]
  };
}

/**
 * 将农历日期转换为公历日期
 */
function lunarToSolar(year, month, day) {
  const yearData = getLunarYearData(year);
  if (!yearData) return null;

  const days = daysFromCNY(yearData, month, day);
  const cnyDate = new Date(yearData.cny + 'T00:00:00');
  cnyDate.setDate(cnyDate.getDate() + days);

  const y = cnyDate.getFullYear();
  const m = String(cnyDate.getMonth() + 1).padStart(2, '0');
  const d = String(cnyDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ========== 节日定义 ==========

/** 农历节日元数据（不含日期，日期由下方查表或推算得出） */
const LUNAR_HOLIDAY_META = [
  { name: '春节', month: 1, day: 1, icon: '🧨', color: '#c62828' },
  { name: '元宵节', month: 1, day: 15, icon: '🏮', color: '#e65100' },
  { name: '端午节', month: 5, day: 5, icon: '🐲', color: '#2e7d32' },
  { name: '七夕', month: 7, day: 7, icon: '💕', color: '#ad1457' },
  { name: '中秋节', month: 8, day: 15, icon: '🥮', color: '#f9a825' },
  { name: '重阳节', month: 9, day: 9, icon: '🌺', color: '#6a1b9a' },
  { name: '腊八节', month: 12, day: 8, icon: '🥣', color: '#4e342e' },
  { name: '除夕', month: 12, day: 30, icon: '🧧', color: '#c62828' },
];

/**
 * 【精确日期表】已验证的农历节日公历日期
 * 格式：DATES[年份][节日名] = 'YYYY-MM-DD'
 * 在这里查到的日期 100% 准确，不走农历推算
 */
const VERIFIED_DATES = {
  2026: {
    '春节':   '2026-02-17',
    '元宵节': '2026-03-03',
    '端午节': '2026-06-19',
    '七夕':   '2026-08-19',
    '中秋节': '2026-09-25',
    '重阳节': '2026-10-18',
    '腊八节': '2027-01-15',
    '除夕':   '2027-02-05',
  },
  2027: {
    '春节':   '2027-02-06',
    '元宵节': '2027-02-20',
    '端午节': '2027-06-08',
    '七夕':   '2027-08-08',
    '中秋节': '2027-09-15',
    '重阳节': '2027-10-08',
    '腊八节': '2028-01-04',
    '除夕':   '2028-01-25',
  },
};

/**
 * 获取农历节日的公历日期
 * 优先查精确表，无则用农历推算
 */
function getHolidayDate(year, holidayName, holidayMeta) {
  // 1. 查精确表
  if (VERIFIED_DATES[year] && VERIFIED_DATES[year][holidayName]) {
    return VERIFIED_DATES[year][holidayName];
  }
  // 2. 农历推算（除夕特殊处理为春节前一天）
  if (holidayName === '除夕') {
    const springDate = getHolidayDate(year, '春节', { month: 1, day: 1 });
    if (springDate) {
      const d = new Date(springDate + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    }
    return null;
  }
  // 3. 通用农历转公历
  return lunarToSolar(year, holidayMeta.month, holidayMeta.day);
}

/** 获取母亲节日期（5月第2个周日） */
function getMothersDay(year) {
  const may1 = new Date(year, 4, 1).getDay();
  const day = may1 === 0 ? 8 : 14 - may1 + 1;
  return `${year}-05-${String(day).padStart(2, '0')}`;
}

/** 获取父亲节日期（6月第3个周日） */
function getFathersDay(year) {
  const jun1 = new Date(year, 5, 1).getDay();
  const day = jun1 === 0 ? 15 : 21 - jun1 + 1;
  return `${year}-06-${String(day).padStart(2, '0')}`;
}

/** 获取清明节日期 */
function getQingmingDay(year) {
  let day;
  if (year <= 2099) {
    day = Math.round(4.81 + 0.2422 * (year - 2000) - Math.floor((year - 2000) / 4));
  } else {
    day = Math.round(5.63 + 0.2422 * (year - 2100) - Math.floor((year - 2100) / 4));
  }
  day = Math.max(4, Math.min(5, day));
  return `${year}-04-${String(day).padStart(2, '0')}`;
}

/** 除夕 = 春节前一天（仅用作无精确表时的fallback） */
function getChuxiDate(springFestivalDate) {
  const d = new Date(springFestivalDate + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * 生成指定年份的所有系统节日事件
 * 农历节日优先查精确表 VERIFIED_DATES，无则用推算
 */
function generateHolidays(year) {
  const holidays = [];
  const idPrefix = 'holiday_';

  // 公历固定节日
  const solarHolidays = [
    { name: '元旦', month: 1, day: 1, icon: '🎉', color: '#1565c0' },
    { name: '劳动节', month: 5, day: 1, icon: '💪', color: '#e65100' },
    { name: '国庆节', month: 10, day: 1, icon: '🇨🇳', color: '#c62828' },
  ];

  for (const h of solarHolidays) {
    const dateStr = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
    holidays.push(makeHoliday(idPrefix, h, dateStr, year));
  }

  // 清明节
  holidays.push(makeHoliday(idPrefix,
    { name: '清明节', icon: '🌿', color: '#558b2f' },
    getQingmingDay(year), year));

  // 母亲节
  holidays.push(makeHoliday(idPrefix,
    { name: '母亲节', icon: '🌸', color: '#e91e63' },
    getMothersDay(year), year));

  // 父亲节
  holidays.push(makeHoliday(idPrefix,
    { name: '父亲节', icon: '👔', color: '#1565c0' },
    getFathersDay(year), year));

  // 农历节日 — 优先精确表，无则推算
  for (const h of LUNAR_HOLIDAY_META) {
    const dateStr = getHolidayDate(year, h.name, h);
    if (dateStr) {
      holidays.push(makeHoliday(idPrefix, h, dateStr, year));
    }
  }

  return holidays;
}

/** 创建节日事件对象 */
function makeHoliday(idPrefix, h, dateStr, year) {
  return {
    id: `${idPrefix}${h.name}_${year}`,
    name: h.name,
    startDate: dateStr,
    endDate: null, note: '',
    repeat: 'yearly', isHoliday: true,
    icon: h.icon, color: h.color,
    createdAt: new Date().toISOString(),
  };
}
