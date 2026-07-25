/**
 * 倒计时模块 — 实时更新倒计时显示
 */

let countdownTimerId = null;
let activeCountdowns = [];

/**
 * 启动倒计时刷新
 */
function startCountdown() {
  updateCountdowns();
  // 每秒刷新一次
  countdownTimerId = setInterval(updateCountdowns, 1000);
}

/** 停止倒计时 */
function stopCountdown() {
  if (countdownTimerId) {
    clearInterval(countdownTimerId);
    countdownTimerId = null;
  }
}

/**
 * 更新倒计时显示
 */
function updateCountdowns() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const year = now.getFullYear();
  const events = getEventsForYear(year);

  // 获取未来的事件，包含进行中的日期范围
  const upcoming = events
    .filter(evt => {
      // 日期范围事件：检查是否还在进行中
      if (evt.endDate) {
        return evt.endDate >= todayStr;
      }
      // 单日事件：今天及未来
      return evt.startDate >= todayStr;
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 8);

  activeCountdowns = upcoming;

  const container = document.getElementById('countdown-list');
  if (!container) return;

  if (upcoming.length === 0) {
    container.innerHTML = '<div class="empty-detail"><p>📭 暂无即将到来的事件</p></div>';
    return;
  }

  let html = '';
  for (const evt of upcoming) {
    const countdownHTML = getCountdownHTML(evt, now);
    html += `
      <div class="countdown-item" style="border-left: 3px solid ${evt.color || '#1565c0'}">
        <div class="countdown-icon">${evt.icon || '📌'}</div>
        <div class="countdown-info">
          <div class="countdown-name">${evt.name}
            ${evt.repeat === 'yearly' ? '<span class="badge badge-repeat">每年</span>' : ''}
          </div>
          <div class="countdown-date">
            ${evt.endDate ? `${evt.startDate} ~ ${evt.endDate}` : evt.startDate}
          </div>
        </div>
        <div class="countdown-timer">${countdownHTML}</div>
      </div>`;
  }
  container.innerHTML = html;
}

/**
 * 生成单个事件的倒计时 HTML
 */
function getCountdownHTML(event, now) {
  const startDate = new Date(event.startDate + 'T00:00:00');
  const endDate = event.endDate ? new Date(event.endDate + 'T23:59:59') : null;

  // 事件已开始（日期范围模式）
  if (startDate <= now && endDate && endDate >= now) {
    const remaining = endDate - now;
    if (remaining <= 0) return '<span class="countdown-ended">已结束</span>';

    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    return `<span class="countdown-active">🟢 进行中</span>
            <span class="countdown-remaining">剩余 ${days}天${hours}时${minutes}分</span>`;
  }

  // 事件在今天
  if (startDate.toDateString() === now.toDateString()) {
    return '<span class="countdown-today">🎯 今天</span>';
  }

  // 事件已过期（非重复事件）
  if (startDate < now) {
    return '<span class="countdown-ended">已结束</span>';
  }

  // 未来事件
  const total = startDate - now;
  if (total <= 0) return '<span class="countdown-today">🎯 今天</span>';

  const days = Math.floor(total / 86400000);
  const hours = Math.floor((total % 86400000) / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);

  if (days > 30) {
    return `<span class="countdown-future">
      <span class="countdown-days-num">${days}</span> 天
    </span>`;
  }

  return `<span class="countdown-future">
    <span class="countdown-days-num">${days}</span>天
    <span class="countdown-unit">${String(hours).padStart(2, '0')}</span>:
    <span class="countdown-unit">${String(minutes).padStart(2, '0')}</span>:
    <span class="countdown-unit">${String(seconds).padStart(2, '0')}</span>
  </span>`;
}
