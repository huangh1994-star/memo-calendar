/**
 * 提醒备忘日历 — 主入口
 * 初始化所有模块，协调组件交互
 */

// ========== 初始化 ==========
function init() {
  // 初始化节日数据
  initHolidays();

  // 渲染月历
  renderCalendar();

  // 启动倒计时
  startCountdown();

  // 绑定事件
  bindEvents();

  // 注册 Service Worker（生产环境）
  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // 静默失败，不影响主功能
    });
  }

  console.log('📅 提醒备忘日历已就绪');
}

// ========== 全局事件绑定 ==========
function bindEvents() {
  // 月份导航
  document.getElementById('btn-prev-month').addEventListener('click', prevMonth);
  document.getElementById('btn-next-month').addEventListener('click', nextMonth);
  document.getElementById('btn-today').addEventListener('click', goToToday);

  // 添加事件
  document.getElementById('btn-add-event').addEventListener('click', () => openAddModal());

  // 模态框关闭
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('btn-cancel').addEventListener('click', closeModal);

  // 表单提交
  document.getElementById('event-form').addEventListener('submit', handleFormSubmit);

  // 键盘快捷键
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
    if (e.ctrlKey || e.metaKey) return;
    if (document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA') return;
    if (e.key === 'ArrowLeft') prevMonth();
    if (e.key === 'ArrowRight') nextMonth();
  });

  // 关闭日期详情
  document.getElementById('btn-close-detail').addEventListener('click', () => {
    document.getElementById('date-detail').classList.remove('visible');
    calendarState.selectedDate = null;
    renderCalendar();
  });
}

// ========== 模态框管理 ==========
let editingEventId = null;

function openAddModal(presetDate) {
  editingEventId = null;
  document.getElementById('modal-title').textContent = '添加事件';
  document.getElementById('event-id').value = '';
  document.getElementById('event-name').value = '';
  document.getElementById('event-start-date').value = presetDate || getTodayStr();
  document.getElementById('event-end-date').value = '';
  document.getElementById('event-note').value = '';
  document.getElementById('event-repeat').checked = false;
  document.getElementById('modal-overlay').classList.add('visible');
  document.getElementById('event-name').focus();
}

function openEditModal(eventId) {
  const events = getUserEvents();
  const evt = events.find(e => e.id === eventId);
  if (!evt) return;

  editingEventId = eventId;
  document.getElementById('modal-title').textContent = '编辑事件';
  document.getElementById('event-id').value = eventId;
  document.getElementById('event-name').value = evt.name;
  document.getElementById('event-start-date').value = evt.startDate;
  document.getElementById('event-end-date').value = evt.endDate || '';
  document.getElementById('event-note').value = evt.note || '';
  document.getElementById('event-repeat').checked = evt.repeat === 'yearly';
  document.getElementById('modal-overlay').classList.add('visible');
  document.getElementById('event-name').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('visible');
  editingEventId = null;
}

function handleFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('event-name').value.trim();
  const startDate = document.getElementById('event-start-date').value;
  const endDate = document.getElementById('event-end-date').value || null;
  const note = document.getElementById('event-note').value.trim();
  const repeat = document.getElementById('event-repeat').checked ? 'yearly' : 'none';

  if (!name) {
    alert('请输入事件名称');
    return;
  }
  if (!startDate) {
    alert('请选择日期');
    return;
  }

  // 验证日期范围
  if (endDate && endDate < startDate) {
    alert('结束日期不能早于开始日期');
    return;
  }

  const eventData = { name, startDate, endDate, note, repeat };

  if (editingEventId) {
    updateEvent(editingEventId, eventData);
  } else {
    addEvent(eventData);
  }

  closeModal();
  renderCalendar();
  updateCountdowns();
}

// 删除确认
function confirmDelete(eventId) {
  const events = getUserEvents();
  const evt = events.find(e => e.id === eventId);
  if (!evt) return;

  if (confirm(`确定要删除"${evt.name}"吗？此操作不可撤销。`)) {
    deleteEvent(eventId);
    renderCalendar();
    updateCountdowns();
  }
}

// ========== 页面加载完成后初始化 ==========
document.addEventListener('DOMContentLoaded', init);
