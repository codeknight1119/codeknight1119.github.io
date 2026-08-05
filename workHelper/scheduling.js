import { SchedulingService } from './schedulingService.js';

let schedulingService = null;
const VIEW_TYPES = {
  calendar: 'calendar',
  week: 'week',
  day: 'day',
};
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') return new Date(value);
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.toMillis === 'function') return new Date(value.toMillis());
  return new Date(value);
}

function formatTime(date, locale = navigator.language) {
  if (!date) return '';
  const dt = toDate(date);
  return dt.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateLabel(date, locale = navigator.language) {
  if (!date) return '';
  return toDate(date).toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDayHeader(date, locale = navigator.language) {
  return toDate(date).toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function startOfDay(date) {
  const d = toDate(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + 1);
  d.setMilliseconds(d.getMilliseconds() - 1);
  return d;
}

function getWeekStart(date) {
  const d = toDate(date);
  const offset = d.getDay();
  const start = startOfDay(d);
  start.setDate(start.getDate() - offset);
  return start;
}

function getMonthRange(date) {
  const d = toDate(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  return {
    start: new Date(year, month, 1, 0, 0, 0, 0),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

function addDays(date, count) {
  const result = new Date(toDate(date));
  result.setDate(result.getDate() + count);
  return result;
}

function addMinutes(date, minutes) {
  const result = new Date(toDate(date));
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

function normalizeOccurrences(rawList) {
  return rawList
    .map((item) => ({
      ...item,
      start: toDate(item.start),
      end: toDate(item.end),
    }))
    .sort((a, b) => a.start - b.start);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getOccurrenceStyle(occurrence, timelineHeight) {
  const dayStart = startOfDay(occurrence.start);
  const minutesFromDayStart = Math.max(0, Math.floor((occurrence.start - dayStart) / 60000));
  const durationMinutes = Math.max(5, Math.floor((occurrence.end - occurrence.start) / 60000));
  return {
    top: `${(minutesFromDayStart / (24 * 60)) * 100}%`,
    height: `${(durationMinutes / (24 * 60)) * 100}%`,
    '--event-top': `${(minutesFromDayStart / (24 * 60)) * 100}%`,
    '--event-height': `${(durationMinutes / (24 * 60)) * 100}%`,
  };
}

function resolveUserId() {
  if (window.__workHelperUserId) return window.__workHelperUserId;
  const stored = localStorage.getItem('workhelper-user-uid');
  if (stored) return stored;
  return null;
}

function buildViewButton(label, viewType, currentView) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `schedule-view-toggle${viewType === currentView ? ' schedule-view-toggle--active' : ''}`;
  button.textContent = label;
  button.dataset.view = viewType;
  return button;
}

function updateViewToggles(state) {
  document.querySelectorAll('.schedule-view-toggle').forEach((button) => {
    if (button.dataset.view === state.view) {
      button.classList.add('schedule-view-toggle--active');
    } else {
      button.classList.remove('schedule-view-toggle--active');
    }
  });
}

function createSchedulePage(initialView = VIEW_TYPES.calendar) {
  const userId = resolveUserId();
  const locale = navigator.language || 'en-US';
  const state = {
    view: initialView,
    focusedDate: new Date(),
    occurrences: [],
    templates: [],
    activeOccurrence: null,
    isLoading: false,
    dragState: null,
    userId,
    locale,
    loadError: null,
  };

  const page = document.createElement('section');
  page.className = 'page-card schedule-page';

  const header = document.createElement('div');
  header.className = 'app-shell__header schedule-header';

  const headerText = document.createElement('div');
  headerText.innerHTML = `
    <div>
      <h1 class="page-card__title">Scheduling</h1>
      <p class="page-card__subtitle">Manage blocked time, recurring templates, and local-time schedule views.</p>
    </div>
  `;

  const viewControls = document.createElement('div');
  viewControls.className = 'schedule-header__controls';
  [
    { label: 'Calendar', view: VIEW_TYPES.calendar },
    { label: 'Week', view: VIEW_TYPES.week },
    { label: 'Day', view: VIEW_TYPES.day },
  ].forEach((option) => {
    const button = buildViewButton(option.label, option.view, state.view);
    button.addEventListener('click', () => {
      state.view = option.view;
      updateViewToggles(state);
      loadScheduleData();
    });
    viewControls.appendChild(button);
  });
  header.appendChild(headerText);
  header.appendChild(viewControls);

  const content = document.createElement('div');
  content.className = 'schedule-content';

  page.appendChild(header);
  page.appendChild(content);

  async function loadScheduleData() {
    state.isLoading = true;
    state.loadError = null;
    render();
    if (!state.userId) {
      state.isLoading = false;
      return;
    }

    const windowBounds = getWindowBounds(state.view, state.focusedDate);
    if (!schedulingService) {
      schedulingService = new SchedulingService();
    }

    try {
      await schedulingService.expandRecurringOccurrences(state.userId, windowBounds.start, windowBounds.end);
      const occurrences = await schedulingService.getOccurrences(state.userId, windowBounds.start, windowBounds.end);
      const templates = await schedulingService.getTemplates(state.userId);
      state.occurrences = normalizeOccurrences(occurrences);
      state.templates = templates;
      state.loadError = null;
    } catch (error) {
      state.loadError = error.message || 'Failed to load schedule. Initialize Firebase first.';
      state.occurrences = [];
      state.templates = [];
    }

    state.isLoading = false;
    render();
  }

  function getWindowBounds(view, focusedDate) {
    const date = toDate(focusedDate);
    if (view === VIEW_TYPES.day) {
      return { start: startOfDay(date), end: endOfDay(date) };
    }
    if (view === VIEW_TYPES.week) {
      const weekStart = getWeekStart(date);
      return { start: weekStart, end: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6, 23, 59, 59, 999) };
    }
    const monthRange = getMonthRange(date);
    return { start: monthRange.start, end: monthRange.end };
  }

  function createNavigationBar() {
    const navBar = document.createElement('div');
    navBar.className = 'schedule-nav';

    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.className = 'schedule-nav__button';
    prevButton.textContent = '← Previous';
    prevButton.addEventListener('click', () => {
      if (state.view === VIEW_TYPES.day) {
        state.focusedDate = addDays(state.focusedDate, -1);
      } else if (state.view === VIEW_TYPES.week) {
        state.focusedDate = addDays(state.focusedDate, -7);
      } else {
        state.focusedDate = new Date(state.focusedDate.getFullYear(), state.focusedDate.getMonth() - 1, 1);
      }
      loadScheduleData();
    });

    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.className = 'schedule-nav__button';
    nextButton.textContent = 'Next →';
    nextButton.addEventListener('click', () => {
      if (state.view === VIEW_TYPES.day) {
        state.focusedDate = addDays(state.focusedDate, 1);
      } else if (state.view === VIEW_TYPES.week) {
        state.focusedDate = addDays(state.focusedDate, 7);
      } else {
        state.focusedDate = new Date(state.focusedDate.getFullYear(), state.focusedDate.getMonth() + 1, 1);
      }
      loadScheduleData();
    });

    const rangeLabel = document.createElement('div');
    rangeLabel.className = 'schedule-nav__label';
    rangeLabel.textContent = getRangeLabel(state.view, state.focusedDate, state.locale);

    navBar.appendChild(prevButton);
    navBar.appendChild(rangeLabel);
    navBar.appendChild(nextButton);
    return navBar;
  }

  function getRangeLabel(view, focusedDate, locale) {
    const date = toDate(focusedDate);
    if (view === VIEW_TYPES.day) {
      return date.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
    }

    if (view === VIEW_TYPES.week) {
      const start = getWeekStart(date);
      const end = addDays(start, 6);
      const startLabel = start.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      const endLabel = end.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
      return `${startLabel} — ${endLabel}`;
    }

    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }

  function buildScheduleSummary() {
    const summary = document.createElement('div');
    summary.className = 'schedule-summary';

    const totalEntries = state.occurrences.length;
    const upcomingCount = state.occurrences.filter((item) => item.start >= new Date()).length;

    summary.innerHTML = `
      <div class="schedule-summary__item">
        <span>Loaded</span>
        <strong>${totalEntries}</strong>
      </div>
      <div class="schedule-summary__item">
        <span>Upcoming</span>
        <strong>${upcomingCount}</strong>
      </div>
      <div class="schedule-summary__item">
        <span>Time zone</span>
        <strong>${state.locale}</strong>
      </div>
    `;
    return summary;
  }

  function buildLegend() {
    const legend = document.createElement('div');
    legend.className = 'schedule-legend';
    legend.innerHTML = `
      <span class="schedule-chip schedule-chip--primary">Drag to move</span>
      <span class="schedule-chip schedule-chip--secondary">Resize to adjust</span>
      <span class="schedule-chip schedule-chip--muted">Persisted after drop</span>
    `;
    return legend;
  }

  function buildBlockForm() {
    const section = document.createElement('section');
    section.className = 'schedule-form card';
    section.innerHTML = `
      <div class="schedule-form__header">
        <h2>New block</h2>
        <p>Create a one-off block or recurring template.</p>
      </div>
      <div class="schedule-form__fields">
        <label>Title<input name="title" type="text" placeholder="Focus time" /></label>
        <label>Start<input name="start" type="time" value="09:00" /></label>
        <label>End<input name="end" type="time" value="10:00" /></label>
        <label>Date<input name="date" type="date" value="${toDate(state.focusedDate).toISOString().slice(0, 10)}" /></label>
        <label>Type<select name="recurrence">
          <option value="oneOff">One-off</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select></label>
        <label>Weekly days<select name="daysOfWeek" multiple size="4">
          <option value="1">Mon</option>
          <option value="2">Tue</option>
          <option value="3">Wed</option>
          <option value="4">Thu</option>
          <option value="5">Fri</option>
          <option value="6">Sat</option>
          <option value="0">Sun</option>
        </select></label>
        <label>Monthly dates<input name="monthDays" type="text" placeholder="1, 15, 28" /></label>
        <label>Color<input name="color" type="color" value="#ff5ce6" /></label>
      </div>
      <div class="schedule-form__actions">
        <button type="button" class="button button--primary">Save block</button>
      </div>
    `;

    const submitButton = section.querySelector('.button');
    submitButton.addEventListener('click', async () => {
      const form = section.querySelector('.schedule-form__fields');
      if (!form) {
        alert('Unable to read the block form. Please refresh the page.');
        return;
      }

      const title = form.querySelector('input[name="title"]').value.trim();
      const start = form.querySelector('input[name="start"]').value;
      const end = form.querySelector('input[name="end"]').value;
      const dateValue = form.querySelector('input[name="date"]').value;
      const recurrence = form.querySelector('select[name="recurrence"]').value;

      const daySelect = form.querySelector('select[name="daysOfWeek"]');
      const selectedDays = daySelect ? Array.from(daySelect.selectedOptions).map((option) => Number(option.value)) : [];

      const color = form.querySelector('input[name="color"]').value;
      const monthDaysText = form.querySelector('input[name="monthDays"]').value;
      const monthDays = monthDaysText
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((value) => Number.isInteger(value) && value >= 1 && value <= 31);

      if (!title || !start || !end || !dateValue) {
        alert('Please complete title, date, start, and end.');
        return;
      }

      if (!state.userId) {
        alert('Unable to save. No user configured.');
        return;
      }

      const startDate = new Date(`${dateValue}T${start}:00`);
      const endDate = new Date(`${dateValue}T${end}:00`);
      if (endDate <= startDate) {
        alert('End time must be after start time.');
        return;
      }

      if (recurrence === 'oneOff') {
        await schedulingService.addOneOffBlock(state.userId, {
          title,
          start: startDate,
          end: endDate,
          color,
          description: '',
        });
      } else {
        await schedulingService.addTemplate(state.userId, {
          title,
          startTime: start,
          endTime: end,
          startDate: dateValue,
          recurrence,
          daysOfWeek: recurrence === 'weekly' ? selectedDays : [],
          monthDays: recurrence === 'monthly' ? monthDays : [],
          color,
          description: '',
        });
      }

      loadScheduleData();
    });

    return section;
  }

  function createTemplatesPanel() {
    const panel = document.createElement('section');
    panel.className = 'schedule-panel card';
    panel.innerHTML = `
      <div class="schedule-panel__header">
        <h2>Recurring templates</h2>
        <p>Templates persist template rules and generate day-level occurrences.</p>
      </div>
    `;
    const list = document.createElement('div');
    list.className = 'schedule-panel__list';

    if (state.templates.length === 0) {
      list.innerHTML = '<p class="schedule-empty">No recurring templates yet.</p>';
    } else {
      state.templates.forEach((template) => {
        const item = document.createElement('div');
        item.className = 'schedule-template-item';
        item.innerHTML = `
          <div>
            <strong>${template.title}</strong>
            <div class="schedule-template-meta">${template.recurrence} • ${template.startTime}–${template.endTime}</div>
          </div>
          <button type="button" class="button button--tertiary">Delete</button>
        `;
        item.querySelector('button').addEventListener('click', async () => {
          if (confirm('Delete this template and its generated occurrences?')) {
            await schedulingService.deleteTemplate(state.userId, template.id);
            loadScheduleData();
          }
        });
        list.appendChild(item);
      });
    }

    panel.appendChild(list);
    return panel;
  }

  function createOccurrenceList() {
    const list = document.createElement('section');
    list.className = 'schedule-panel card';
    list.innerHTML = `
      <div class="schedule-panel__header">
        <h2>Upcoming occurrences</h2>
      </div>
    `;

    const rows = document.createElement('div');
    rows.className = 'schedule-occurrence-list';

    if (state.occurrences.length === 0) {
      rows.innerHTML = '<p class="schedule-empty">No blocks in this range.</p>';
    } else {
      state.occurrences.slice(0, 14).forEach((occurrence) => {
        const row = document.createElement('div');
        row.className = 'schedule-occurrence-row';
        row.innerHTML = `
          <div>
            <strong>${occurrence.title}</strong>
            <div class="schedule-occurrence-meta">${formatDateLabel(occurrence.start, state.locale)} · ${formatTime(occurrence.start, state.locale)}–${formatTime(occurrence.end, state.locale)}</div>
          </div>
          <button type="button" class="button button--tertiary">Delete</button>
        `;
        row.querySelector('button').addEventListener('click', async () => {
          if (confirm('Remove this scheduled occurrence?')) {
            await schedulingService.deleteOccurrence(state.userId, occurrence.id);
            loadScheduleData();
          }
        });
        rows.appendChild(row);
      });
    }

    list.appendChild(rows);
    return list;
  }

  function render() {
    content.innerHTML = '';

    if (!state.userId) {
      const message = document.createElement('div');
      message.className = 'schedule-missing-config';
      message.innerHTML = `
        <p>Scheduling requires a configured user context and Firestore backend.</p>
        <p>Set <code>window.__workHelperUserId</code> to your UID and ensure Firebase is initialized before the scheduler loads.</p>
      `;
      content.appendChild(message);
      return;
    }

    if (state.isLoading) {
      content.appendChild(createLoadingState());
      return;
    }

    if (state.loadError) {
      const errorMessage = document.createElement('div');
      errorMessage.className = 'schedule-load-error';
      errorMessage.innerHTML = `
        <p>Failed to load scheduling data:</p>
        <pre>${state.loadError}</pre>
      `;
      content.appendChild(errorMessage);
      return;
    }

    const topPanel = document.createElement('div');
    topPanel.className = 'schedule-top-panel';
    topPanel.appendChild(buildScheduleSummary());
    topPanel.appendChild(buildLegend());

    const grid = document.createElement('div');
    grid.className = 'schedule-grid-layout';
    const main = document.createElement('div');
    main.className = 'schedule-main';
    const side = document.createElement('aside');
    side.className = 'schedule-side';

    main.appendChild(createScheduleView());
    side.appendChild(buildBlockForm());
    side.appendChild(createTemplatesPanel());
    side.appendChild(createOccurrenceList());

    grid.appendChild(main);
    grid.appendChild(side);
    content.appendChild(topPanel);
    content.appendChild(grid);
    updateViewToggles(state);
  }

  function createLoadingState() {
    const loading = document.createElement('div');
    loading.className = 'schedule-loading';
    loading.textContent = 'Loading schedule...';
    return loading;
  }

  function createScheduleView() {
    const view = document.createElement('div');
    view.className = 'schedule-view';
    if (state.view === VIEW_TYPES.calendar) {
      view.appendChild(createCalendarView());
    } else if (state.view === VIEW_TYPES.week) {
      view.appendChild(createWeekView());
    } else {
      view.appendChild(createDayView());
    }
    return view;
  }

  function createCalendarView() {
    const calendar = document.createElement('div');
    calendar.className = 'schedule-calendar';
    const range = getMonthRange(state.focusedDate);
    const monthStart = new Date(range.start);
    const firstDay = monthStart.getDay();
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDay; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), day));
    }

    cells.forEach((date) => {
      const cell = document.createElement('button');
      cell.className = 'schedule-calendar__cell';
      cell.type = 'button';
      if (!date) {
        cell.classList.add('schedule-calendar__cell--empty');
      } else {
        const eventsForDay = state.occurrences.filter((occ) => isSameDay(occ.start, date));
        const dayCount = eventsForDay.length;
        const selected = isSameDay(date, state.focusedDate);
        if (selected) {
          cell.classList.add('schedule-calendar__cell--selected');
        }

        cell.innerHTML = `
          <div class="schedule-calendar__day">${date.getDate()}</div>
          <div class="schedule-calendar__count">${dayCount} block${dayCount === 1 ? '' : 's'}</div>
        `;

        if (dayCount > 0) {
          const eventsList = document.createElement('div');
          eventsList.className = 'schedule-calendar__event-list';
          eventsForDay.slice(0, 3).forEach((occurrence) => {
            const eventItem = document.createElement('div');
            eventItem.className = 'schedule-calendar__event-item';
            eventItem.textContent = `${formatTime(occurrence.start, state.locale)} ${occurrence.title}`;
            eventsList.appendChild(eventItem);
          });
          if (dayCount > 3) {
            const more = document.createElement('div');
            more.className = 'schedule-calendar__event-more';
            more.textContent = `+${dayCount - 3} more`;
            eventsList.appendChild(more);
          }
          cell.appendChild(eventsList);
        }

        cell.addEventListener('click', () => {
          state.focusedDate = date;
          state.view = VIEW_TYPES.day;
          render();
        });
      }
      calendar.appendChild(cell);
    });

    return calendar;
  }

  function isSameDay(a, b) {
    const da = toDate(a);
    const db = toDate(b);
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  }

  function createWeekView() {
    const weekGrid = document.createElement('div');
    weekGrid.className = 'schedule-week-view';
    const start = getWeekStart(state.focusedDate);
    const columns = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      columns.push(addDays(start, dayIndex));
    }
    columns.forEach((dayDate) => {
      const column = document.createElement('div');
      column.className = 'schedule-week-column';
      const header = document.createElement('div');
      header.className = 'schedule-week-column__header';
      header.textContent = `${DAYS[dayDate.getDay()]} ${dayDate.getDate()}`;
      column.appendChild(header);
      const body = document.createElement('div');
      body.className = 'schedule-week-column__body';
      const events = state.occurrences.filter((occ) => isSameDay(occ.start, dayDate));
      events.forEach((occurrence) => {
        const event = createEventCard(occurrence, dayDate, weekGrid);
        body.appendChild(event);
      });
      column.appendChild(body);
      weekGrid.appendChild(column);
    });
    return weekGrid;
  }

  function createDayView() {
    const dayDate = toDate(state.focusedDate);
    const dayContainer = document.createElement('div');
    dayContainer.className = 'schedule-day-view';
    const heading = document.createElement('div');
    heading.className = 'schedule-day-heading';
    heading.textContent = formatDayHeader(dayDate, state.locale);
    dayContainer.appendChild(heading);
    const timeline = document.createElement('div');
    timeline.className = 'schedule-day-timeline';
    const labels = document.createElement('div');
    labels.className = 'schedule-day-times';
    for (let hour = 0; hour < 24; hour += 1) {
      const label = document.createElement('div');
      label.className = 'schedule-day-time-label';
      label.textContent = `${hour.toString().padStart(2, '0')}:00`;
      labels.appendChild(label);
    }
    const events = document.createElement('div');
    events.className = 'schedule-day-events';
    state.occurrences
      .filter((occurrence) => isSameDay(occurrence.start, dayDate))
      .forEach((occurrence) => {
        events.appendChild(createEventCard(occurrence, dayDate, dayContainer));
      });
    timeline.appendChild(labels);
    timeline.appendChild(events);
    dayContainer.appendChild(timeline);
    return dayContainer;
  }

  function createEventCard(occurrence, dayDate, scopeElement) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'schedule-event';
    card.dataset.occurrenceId = occurrence.id;
    card.dataset.recurrence = occurrence.recurrenceType || 'oneOff';
    card.style.backgroundColor = occurrence.color || '#ff5ce6';

    const style = getOccurrenceStyle(occurrence);
    card.style.top = style.top;
    card.style.height = style.height;
    card.innerHTML = `
      <div class="schedule-event__label">${occurrence.title}</div>
      <div class="schedule-event__time">${formatTime(occurrence.start, state.locale)}–${formatTime(occurrence.end, state.locale)}</div>
      <div class="schedule-event__handle" title="Drag to move / resize"></div>
    `;

    const startOfDayTarget = startOfDay(dayDate);
    const minutesFromDayStart = Math.floor((occurrence.start - startOfDayTarget) / 60000);
    const durationMinutes = Math.max(5, Math.floor((occurrence.end - occurrence.start) / 60000));
    card.style.setProperty('--event-top', `${(minutesFromDayStart / (24 * 60)) * 100}%`);
    card.style.setProperty('--event-height', `${(durationMinutes / (24 * 60)) * 100}%`);

    card.addEventListener('pointerdown', (event) => handlePointerDown(event, occurrence, dayDate, scopeElement));
    return card;
  }

  function handlePointerDown(event, occurrence, dayDate, scopeElement) {
    event.preventDefault();
    const target = event.target;
    const isResizeHandle = target.classList.contains('schedule-event__handle');
    const rect = scopeElement.getBoundingClientRect();
    const initialY = event.clientY;
    const initialX = event.clientX;
    const originalStart = new Date(occurrence.start);
    const originalEnd = new Date(occurrence.end);
    const startOfDayTarget = startOfDay(dayDate);

    const pointerMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - initialY;
      const deltaMinutes = clamp(Math.round((deltaY / rect.height) * 24 * 60 / 5) * 5, -24 * 60, 24 * 60);
      if (isResizeHandle) {
        const newEnd = addMinutes(originalEnd, deltaMinutes);
        occurrence.end = new Date(Math.max(newEnd, addMinutes(originalStart, 5)));
      } else {
        const newStart = addMinutes(originalStart, deltaMinutes);
        const newEnd = addMinutes(originalEnd, deltaMinutes);
        const startOfDayClamp = startOfDay(newStart);
        const nextDay = endOfDay(newStart);
        if (newStart >= startOfDayTarget && newStart <= nextDay) {
          occurrence.start = newStart;
          occurrence.end = newEnd;
        }
      }
      render();
    };

    const pointerUp = async (upEvent) => {
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
      const moveDeltaY = upEvent.clientY - initialY;
      const moveMinutes = clamp(Math.round((moveDeltaY / rect.height) * 24 * 60 / 5) * 5, -24 * 60, 24 * 60);
      let updates = null;
      if (isResizeHandle) {
        updates = {
          end: addMinutes(originalEnd, moveMinutes),
        };
      } else {
        updates = {
          start: addMinutes(originalStart, moveMinutes),
          end: addMinutes(originalEnd, moveMinutes),
        };
      }
      if (updates) {
        await schedulingService.updateOccurrence(state.userId, occurrence.id, {
          start: updates.start,
          end: updates.end,
        });
        loadScheduleData();
      }
    };

    window.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp, { once: true });
  }

  loadScheduleData();
  return page;
}

export { createSchedulePage };
