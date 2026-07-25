/**
 * 事件管理模块 — 增删改查 + localStorage 持久化
 * 支持年度重复事件展开
 */

const STORAGE_KEY_EVENTS = 'memo_calendar_events';
const STORAGE_KEY_HOLIDAYS = 'memo_calendar_holidays';
const STORAGE_KEY_HOLIDAY_YEAR = 'memo_calendar_holiday_year';

/** 生成唯一 ID */
function generateId() {
  return 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

/** 获取所有用户事件 */
function getUserEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/** 保存用户事件 */
function saveUserEvents(events) {
  localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
}

/** 获取系统节日 */
function getHolidayEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HOLIDAYS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/** 保存系统节日 */
function saveHolidayEvents(holidays) {
  localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(holidays));
}

/**
 * 将年度重复事件展开为当前年份的实际事件
 * @param {Object} event - 原始事件对象
 * @param {number} year - 目标年份
 * @returns {Object|null} 展开后的事件，如果该年份没有对应日期则返回 null
 */
function expandYearlyEvent(event, year) {
  // 节日事件：每年有独立条目，不跨年展开
  if (event.isHoliday) {
    const startYear = parseInt(event.startDate.substring(0, 4));
    if (startYear === year) return event;
    return null;
  }

  if (event.repeat !== 'yearly') {
    // 非重复事件：检查是否在目标年份
    const startYear = parseInt(event.startDate.substring(0, 4));
    if (startYear === year) return event;
    // 跨年日期范围的特殊处理
    if (event.endDate) {
      const endYear = parseInt(event.endDate.substring(0, 4));
      if (year >= startYear && year <= endYear) return event;
    }
    return null;
  }

  // 年度重复事件（用户创建的生日、纪念日等）：替换年份
  const origMonth = event.startDate.substring(5, 7);
  const origDay = event.startDate.substring(8, 10);
  const startDate = `${year}-${origMonth}-${origDay}`;

  // 检查该日期是否有效（处理2月29日）
  const testDate = new Date(startDate + 'T00:00:00');
  if (testDate.getFullYear() !== year ||
      String(testDate.getMonth() + 1).padStart(2, '0') !== origMonth ||
      String(testDate.getDate()).padStart(2, '0') !== origDay) {
    // 2月29日但今年不是闰年，使用2月28日
    const adjusted = `${year}-02-28`;
    return { ...event, startDate: adjusted, endDate: null, _expandedFrom: event.id };
  }

  let endDate = null;
  if (event.endDate) {
    const endMonth = event.endDate.substring(5, 7);
    const endDay = event.endDate.substring(8, 10);
    endDate = `${year}-${endMonth}-${endDay}`;
    // 同样检查 endDate 有效性
    const testEnd = new Date(endDate + 'T00:00:00');
    if (testEnd.getFullYear() !== year) {
      endDate = `${year}-12-31`;
    }
  }

  return {
    ...event,
    startDate,
    endDate,
    _expandedFrom: event.id,
  };
}

/**
 * 获取指定年份范围内所有有效事件（展开重复事件）
 * @param {number} year - 当前视图年份
 * @returns {Array} 所有展开后的事件
 */
function getEventsForYear(year) {
  const userEvents = getUserEvents();
  const holidays = getHolidayEvents();

  // 合并并展开
  const allEvents = [...userEvents, ...holidays];
  const expanded = [];

  // 展开3年范围（去年、今年、明年）以确保覆盖整个日历视图
  for (const evt of allEvents) {
    for (let y = year - 1; y <= year + 1; y++) {
      const expandedEvt = expandYearlyEvent(evt, y);
      if (expandedEvt) {
        // 去重：同一事件的同一年份展开只加一次
        const dupKey = `${expandedEvt._expandedFrom || expandedEvt.id}_${expandedEvt.startDate}`;
        if (!expanded.find(e => (e._expandedFrom || e.id) + '_' + e.startDate === dupKey)) {
          expanded.push(expandedEvt);
        }
      }
    }
  }

  return expanded;
}

/**
 * 获取指定日期的所有事件
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {Array} 该日期的事件列表
 */
function getEventsForDate(dateStr) {
  const year = parseInt(dateStr.substring(0, 4));
  const events = getEventsForYear(year);
  return events.filter(evt => {
    if (evt.endDate) {
      return dateStr >= evt.startDate && dateStr <= evt.endDate;
    }
    return evt.startDate === dateStr;
  });
}

/**
 * 获取某个月份中有事件的日期集合
 * @param {number} year - 年份
 * @param {number} month - 月份 (1-12)
 * @returns {Map<string, number>} 日期 → 事件数量
 */
function getEventDatesForMonth(year, month) {
  const events = getEventsForYear(year);
  const dateMap = new Map();

  for (const evt of events) {
    const startYear = parseInt(evt.startDate.substring(0, 4));
    const startMonth = parseInt(evt.startDate.substring(5, 7));

    // 只有在该月份有活动的事件
    if (startYear === year && startMonth === month) {
      const day = evt.startDate.substring(8, 10);
      dateMap.set(day, (dateMap.get(day) || 0) + 1);
    }

    // 日期范围：标记范围内的每一天
    if (evt.endDate) {
      const endYear = parseInt(evt.endDate.substring(0, 4));
      const endMonth = parseInt(evt.endDate.substring(5, 7));
      const rangeStart = new Date(Math.max(
        new Date(`${year}-${String(month).padStart(2, '0')}-01`).getTime(),
        new Date(evt.startDate).getTime()
      ));
      const rangeEnd = new Date(Math.min(
        new Date(`${year}-${String(month).padStart(2, '0')}-31`).getTime(),
        new Date(evt.endDate).getTime()
      ));
      const current = new Date(rangeStart);
      while (current <= rangeEnd) {
        if (current.getFullYear() === year && current.getMonth() + 1 === month) {
          const d = String(current.getDate()).padStart(2, '0');
          dateMap.set(d, (dateMap.get(d) || 0) + 1);
        }
        current.setDate(current.getDate() + 1);
      }
    }
  }

  return dateMap;
}

/** 添加用户事件 */
function addEvent(eventData) {
  const events = getUserEvents();
  const newEvent = {
    id: generateId(),
    name: eventData.name.trim(),
    startDate: eventData.startDate,
    endDate: eventData.endDate || null,
    note: eventData.note || '',
    repeat: eventData.repeat || 'none',
    isHoliday: false,
    icon: eventData.repeat === 'yearly' ? '🔄' : '📌',
    color: eventData.repeat === 'yearly' ? '#e91e63' : '#1565c0',
    createdAt: new Date().toISOString(),
  };
  events.push(newEvent);
  saveUserEvents(events);
  return newEvent;
}

/** 更新用户事件 */
function updateEvent(eventId, eventData) {
  const events = getUserEvents();
  const index = events.findIndex(e => e.id === eventId);
  if (index === -1) return null;

  events[index] = {
    ...events[index],
    name: eventData.name.trim(),
    startDate: eventData.startDate,
    endDate: eventData.endDate || null,
    note: eventData.note || '',
    repeat: eventData.repeat || 'none',
    icon: eventData.repeat === 'yearly' ? '🔄' : '📌',
    color: eventData.repeat === 'yearly' ? '#e91e63' : '#1565c0',
  };
  saveUserEvents(events);
  return events[index];
}

/** 删除用户事件 */
function deleteEvent(eventId) {
  const events = getUserEvents();
  const filtered = events.filter(e => e.id !== eventId);
  if (filtered.length === events.length) return false;
  saveUserEvents(filtered);
  return true;
}

/**
 * 初始化节日数据（在当前年份范围内生成）
 */
function initHolidays() {
  const currentYear = new Date().getFullYear();
  const lastInitYear = parseInt(localStorage.getItem(STORAGE_KEY_HOLIDAY_YEAR) || '0');

  // 每年检查一次，或在年份变化时更新
  if (lastInitYear >= currentYear) {
    // 确保有数据
    const existing = getHolidayEvents();
    if (existing.length > 0) return;
  }

  // 生成 2025-2030 的节日
  const allHolidays = [];
  for (let y = 2025; y <= 2030; y++) {
    allHolidays.push(...generateHolidays(y));
  }

  saveHolidayEvents(allHolidays);
  localStorage.setItem(STORAGE_KEY_HOLIDAY_YEAR, String(currentYear));
}
