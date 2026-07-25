/**
 * 月历模块 — 月历网格渲染 + 日期导航
 */

/** 当前月历状态 */
let calendarState = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1, // 1-12
  selectedDate: null, // YYYY-MM-DD
};

/** 获取日历状态 */
function getCalendarState() {
  return calendarState;
}

/** 设置日历到指定年月 */
function navigateToMonth(year, month) {
  calendarState.year = year;
  calendarState.month = month;
  calendarState.selectedDate = null;
  renderCalendar();
}

/** 跳转到今天 */
function goToToday() {
  const today = new Date();
  calendarState.year = today.getFullYear();
  calendarState.month = today.getMonth() + 1;
  calendarState.selectedDate = null;
  renderCalendar();
}

/** 上一个月 */
function prevMonth() {
  if (calendarState.month === 1) {
    calendarState.year--;
    calendarState.month = 12;
  } else {
    calendarState.month--;
  }
  calendarState.selectedDate = null;
  renderCalendar();
}

/** 下一个月 */
function nextMonth() {
  if (calendarState.month === 12) {
    calendarState.year++;
    calendarState.month = 1;
  } else {
    calendarState.month++;
  }
  calendarState.selectedDate = null;
  renderCalendar();
}

/** 获取今天的日期字符串 */
function getTodayStr() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 渲染月历
 */
function renderCalendar() {
  const { year, month, selectedDate } = calendarState;
  const todayStr = getTodayStr();

  // 更新标题
  document.getElementById('calendar-title').textContent = `${year}年 ${month}月`;
  document.getElementById('year-display').textContent = year;

  // 获取当月事件日期
  const eventDates = getEventDatesForMonth(year, month);

  // 计算当月日历网格
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=周日
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  // 生成42个格子（6行×7列）
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const totalCells = 42;
  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    let dayNum, dateStr, isCurrentMonth, isToday, isSelected, hasEvent;

    if (i < firstDay) {
      // 上月填充
      dayNum = daysInPrevMonth - firstDay + i + 1;
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      dateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      isCurrentMonth = false;
      cell.classList.add('other-month');
    } else if (i >= firstDay + daysInMonth) {
      // 下月填充
      dayNum = i - firstDay - daysInMonth + 1;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      dateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      isCurrentMonth = false;
      cell.classList.add('other-month');
    } else {
      // 当月
      dayNum = i - firstDay + 1;
      dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      isCurrentMonth = true;
    }

    isToday = dateStr === todayStr;
    isSelected = dateStr === selectedDate;
    hasEvent = eventDates.has(String(dayNum).padStart(2, '0')) && isCurrentMonth;

    if (isToday) cell.classList.add('today');
    if (isSelected) cell.classList.add('selected');
    if (hasEvent) cell.classList.add('has-event');

    cell.dataset.date = dateStr;

    // 日期数字
    const daySpan = document.createElement('span');
    daySpan.className = 'day-num';
    daySpan.textContent = dayNum;
    cell.appendChild(daySpan);

    // 农历信息
    if (isCurrentMonth) {
      const lunar = solarToLunar(new Date(dateStr + 'T00:00:00'));
      if (lunar) {
        const lunarSpan = document.createElement('span');
        lunarSpan.className = 'lunar-text';
        // 显示农历日（初一显示月份）
        if (lunar.day === 1) {
          lunarSpan.textContent = lunar.monthName;
        } else {
          lunarSpan.textContent = lunar.dayName;
        }
        // 节日特殊标记
        const dayEvents = getEventsForDate(dateStr);
        const holiday = dayEvents.find(e => e.isHoliday);
        if (holiday) {
          lunarSpan.textContent = holiday.name;
          lunarSpan.classList.add('holiday-label');
          cell.classList.add('holiday-cell');
        }
        cell.appendChild(lunarSpan);
      }
    }

    // 事件标记点
    if (hasEvent) {
      const dots = document.createElement('div');
      dots.className = 'event-dots';

      if (isCurrentMonth) {
        const dateEvents = getEventsForDate(dateStr);
        const maxDots = 3;
        for (let d = 0; d < Math.min(dateEvents.length, maxDots); d++) {
          const dot = document.createElement('span');
          dot.className = 'dot';
          dot.style.backgroundColor = dateEvents[d].color || '#1565c0';
          dots.appendChild(dot);
        }
        if (dateEvents.length > maxDots) {
          const more = document.createElement('span');
          more.className = 'dot-more';
          more.textContent = '+' + (dateEvents.length - maxDots);
          dots.appendChild(more);
        }
      }
      cell.appendChild(dots);
    }

    // 点击事件
    cell.addEventListener('click', () => {
      calendarState.selectedDate = dateStr;
      renderCalendar();
      showDateDetail(dateStr);
    });

    grid.appendChild(cell);
  }

  // 更新事件列表（如果选中了日期）
  if (selectedDate) {
    showDateDetail(selectedDate);
  } else {
    renderUpcomingEvents();
  }
}

/**
 * 显示选中日期的事件详情
 */
function showDateDetail(dateStr) {
  const events = getEventsForDate(dateStr);
  const detailPanel = document.getElementById('date-detail');
  const detailContent = document.getElementById('detail-content');

  const date = new Date(dateStr + 'T00:00:00');
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const lunar = solarToLunar(date);
  const lunarStr = lunar ? lunar.monthName + lunar.dayName : '';

  let titleHTML = `<span class="detail-date">${dateStr}</span>`;
  titleHTML += `<span class="detail-week">${weekDays[date.getDay()]}</span>`;
  if (lunarStr) {
    titleHTML += `<span class="detail-lunar">${lunar.yearName} ${lunarStr}</span>`;
  }
  document.getElementById('detail-title').innerHTML = titleHTML;

  if (events.length === 0) {
    detailContent.innerHTML = `
      <div class="empty-detail">
        <p>📭 这天暂无事件</p>
        <button class="btn btn-primary" onclick="openAddModal('${dateStr}')">+ 添加事件</button>
      </div>`;
  } else {
    let html = '';
    for (const evt of events) {
      const isHoliday = evt.isHoliday;
      const dateRange = evt.endDate
        ? `${evt.startDate} ~ ${evt.endDate}`
        : evt.startDate;
      const repeatBadge = evt.repeat === 'yearly' ? '<span class="badge badge-repeat">每年</span>' : '';
      const holidayBadge = isHoliday ? '<span class="badge badge-holiday">节日</span>' : '';

      html += `
        <div class="event-card ${isHoliday ? 'holiday' : ''}"
             style="border-left: 3px solid ${evt.color || '#1565c0'}">
          <div class="event-card-header">
            <span class="event-icon">${evt.icon || '📌'}</span>
            <span class="event-name">${evt.name}</span>
            ${repeatBadge}
            ${holidayBadge}
          </div>
          <div class="event-date-range">📅 ${dateRange}</div>
          ${evt.note ? `<div class="event-note">💬 ${evt.note}</div>` : ''}
          ${!isHoliday ? `
          <div class="event-actions">
            <button class="btn-sm btn-edit" onclick="openEditModal('${evt.id}')">✏️ 编辑</button>
            <button class="btn-sm btn-delete" onclick="confirmDelete('${evt.id}')">🗑️ 删除</button>
          </div>` : ''}
        </div>`;
    }
    html += `<button class="btn btn-primary btn-full" onclick="openAddModal('${dateStr}')">+ 在该日期添加事件</button>`;
    detailContent.innerHTML = html;
  }

  detailPanel.classList.add('visible');
}

/**
 * 渲染即将到来的事件（倒计时列表）
 */
function renderUpcomingEvents() {
  const todayStr = getTodayStr();
  const year = parseInt(todayStr.substring(0, 4));
  const events = getEventsForYear(year);

  // 筛选未来事件（今天及之后）
  const upcoming = events
    .filter(evt => evt.startDate >= todayStr)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 5);

  const container = document.getElementById('countdown-list');
  if (upcoming.length === 0) {
    container.innerHTML = '<div class="empty-detail"><p>📭 暂无即将到来的事件</p></div>';
    return;
  }

  let html = '';
  for (const evt of upcoming) {
    const daysLeft = getDaysDiff(todayStr, evt.startDate);
    const daysText = daysLeft === 0 ? '🎯 今天' :
      daysLeft === 1 ? '⏰ 明天' :
      `⏳ ${daysLeft} 天后`;

    html += `
      <div class="countdown-item" style="border-left: 3px solid ${evt.color || '#1565c0'}">
        <div class="countdown-icon">${evt.icon || '📌'}</div>
        <div class="countdown-info">
          <div class="countdown-name">${evt.name}</div>
          <div class="countdown-date">${evt.startDate}</div>
        </div>
        <div class="countdown-days">${daysText}</div>
      </div>`;
  }
  container.innerHTML = html;
}

/** 计算两个日期相差的天数 */
function getDaysDiff(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1 + 'T00:00:00');
  const d2 = new Date(dateStr2 + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000);
}
