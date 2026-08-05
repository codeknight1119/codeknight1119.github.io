import { FirestoreService } from './firestoreService.js';

const SCHEDULING_ROOT = (uid) => `users/${uid}/scheduling`;
const TEMPLATES_PATH = (uid) => `${SCHEDULING_ROOT(uid)}/templates`;
const OCCURRENCES_PATH = (uid) => `${SCHEDULING_ROOT(uid)}/occurrences`;

const DEFAULT_TEMPLATE = {
  title: 'Blocked Time',
  description: '',
  color: '#ff5ce6',
  recurrence: 'weekly',
  startTime: '09:00',
  endTime: '10:00',
  daysOfWeek: [1, 2, 3, 4, 5],
  monthDays: [],
  interval: 1,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  until: null,
  isActive: true,
};

function parseTimeString(value) {
  const [hours = '0', minutes = '0'] = String(value || '00:00').split(':');
  return {
    hours: Number(hours),
    minutes: Number(minutes),
  };
}

function clampMinutes(minutes) {
  return Math.max(0, Math.min(60 * 24, minutes));
}

function snapMinutes(minutes, step = 5) {
  return Math.round(minutes / step) * step;
}

function buildLocalDate(date, timeString) {
  const { hours, minutes } = parseTimeString(timeString);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function addMonths(date, count) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + count);
  return next;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function compareDateRange(date, start, end) {
  return date >= start && date <= end;
}

function getNextBoundary(date, stepDays = 1) {
  return addDays(startOfDay(date), stepDays);
}

function buildOccurrenceKey(templateId, date, startTime) {
  return `${templateId}:${date.toISOString().slice(0, 10)}:${startTime}`;
}

function validateTemplatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Template payload must be an object.');
  }

  if (!payload.title || typeof payload.title !== 'string') {
    throw new Error('Template must include a title.');
  }

  if (!payload.startTime || !payload.endTime) {
    throw new Error('Template must include startTime and endTime.');
  }

  const start = parseTimeString(payload.startTime);
  const end = parseTimeString(payload.endTime);
  if (start.hours > 23 || start.minutes > 59 || end.hours > 23 || end.minutes > 59) {
    throw new Error('Invalid template time values.');
  }
}

function generateTemplateInstances(template, windowStart, windowEnd) {
  const instances = [];
  const sourceStart = template.startDate ? new Date(template.startDate) : new Date();
  const windowBegin = startOfDay(windowStart);
  const windowFinish = endOfDay(windowEnd);
  const effectiveStart = sourceStart > windowBegin ? sourceStart : windowBegin;
  const until = template.until ? new Date(template.until) : null;

  if (template.recurrence === 'weekly') {
    let current = startOfDay(effectiveStart);
    while (current <= windowFinish) {
      const weekday = current.getDay();
      if (template.daysOfWeek.includes(weekday)) {
        const startDate = buildLocalDate(current, template.startTime);
        const endDate = buildLocalDate(current, template.endTime);
        if (startDate < sourceStart) {
          // skip occurrences before the template becomes active.
        } else if ((!until || startDate <= until) && compareDateRange(startDate, windowBegin, windowFinish)) {
          instances.push({ start: startDate, end: endDate });
        }
      }
      current = addDays(current, 1);
    }
  }

  if (template.recurrence === 'monthly') {
    let currentMonth = new Date(effectiveStart.getFullYear(), effectiveStart.getMonth(), 1);
    const endMonth = new Date(windowFinish.getFullYear(), windowFinish.getMonth(), 1);
    while (currentMonth <= endMonth) {
      (template.monthDays || []).forEach((monthDay) => {
        const targetDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), monthDay);
        if (targetDay.getMonth() === currentMonth.getMonth()) {
          const startDate = buildLocalDate(targetDay, template.startTime);
          const endDate = buildLocalDate(targetDay, template.endTime);
          if (startDate >= sourceStart && (!until || startDate <= until) && compareDateRange(startDate, windowBegin, windowFinish)) {
            instances.push({ start: startDate, end: endDate });
          }
        }
      });
      currentMonth = addMonths(currentMonth, 1);
    }
  }

  if (template.recurrence === 'oneOff') {
    const oneOffDate = new Date(template.startDate);
    const startDate = buildLocalDate(oneOffDate, template.startTime);
    const endDate = buildLocalDate(oneOffDate, template.endTime);
    if (compareDateRange(startDate, windowBegin, windowFinish)) {
      instances.push({ start: startDate, end: endDate });
    }
  }

  return instances;
}

function normalizeOccurrenceInstance(instance, template) {
  return {
    ownerId: template.ownerId,
    templateId: template.id,
    title: template.title,
    description: template.description || '',
    color: template.color || '#ff5ce6',
    start: instance.start,
    end: instance.end,
    isGenerated: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    recurrenceType: template.recurrence,
  };
}

export class SchedulingService {
  constructor(firestoreService) {
    this.firestore = firestoreService || null;
  }

  getFirestore() {
    if (!this.firestore) {
      this.firestore = new FirestoreService();
    }
    return this.firestore;
  }

  async getTemplates(uid) {
    if (!uid) throw new Error('SchedulingService.getTemplates requires a uid.');
    return this.getFirestore().getDocuments(TEMPLATES_PATH(uid), {
      orderBy: { field: 'createdAt', direction: 'asc' },
    });
  }

  async getOccurrences(uid, windowStart, windowEnd) {
    if (!uid) throw new Error('SchedulingService.getOccurrences requires a uid.');
    const filters = [];
    if (windowStart) filters.push({ field: 'start', operator: '>=', value: windowStart });
    if (windowEnd) filters.push({ field: 'start', operator: '<=', value: windowEnd });
    return this.getFirestore().getDocuments(OCCURRENCES_PATH(uid), {
      filters,
      orderBy: { field: 'start', direction: 'asc' },
    });
  }

  async addTemplate(uid, payload) {
    if (!uid) throw new Error('SchedulingService.addTemplate requires a uid.');
    validateTemplatePayload(payload);
    const template = {
      ...DEFAULT_TEMPLATE,
      ...payload,
      ownerId: uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.getFirestore().addDocument(TEMPLATES_PATH(uid), template);
    return { ...template, id: result.id };
  }

  async updateTemplate(uid, templateId, updates) {
    if (!uid) throw new Error('SchedulingService.updateTemplate requires a uid.');
    const payload = {
      ...updates,
      updatedAt: new Date(),
    };
    await this.getFirestore().updateDocument(`${TEMPLATES_PATH(uid)}/${templateId}`, payload);
    return true;
  }

  async deleteTemplate(uid, templateId) {
    if (!uid) throw new Error('SchedulingService.deleteTemplate requires a uid.');
    const occurrences = await this.getFirestore().getDocuments(OCCURRENCES_PATH(uid), {
      filters: [{ field: 'templateId', operator: '==', value: templateId }],
    });
    await Promise.all(
      occurrences.map((occ) => this.getFirestore().deleteDocument(`${OCCURRENCES_PATH(uid)}/${occ.id}`))
    );
    await this.getFirestore().deleteDocument(`${TEMPLATES_PATH(uid)}/${templateId}`);
    return true;
  }

  async addOneOffBlock(uid, block) {
    if (!uid) throw new Error('SchedulingService.addOneOffBlock requires a uid.');
    if (!block.title || !block.start || !block.end) {
      throw new Error('One-off block must include title, start, and end.');
    }
    const payload = {
      ownerId: uid,
      templateId: null,
      title: block.title,
      description: block.description || '',
      color: block.color || '#48f6ff',
      start: new Date(block.start),
      end: new Date(block.end),
      isGenerated: false,
      recurrenceType: 'oneOff',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await this.getFirestore().addDocument(OCCURRENCES_PATH(uid), payload);
    return { ...payload, id: result.id };
  }

  async updateOccurrence(uid, occurrenceId, changes) {
    if (!uid) throw new Error('SchedulingService.updateOccurrence requires a uid.');
    const payload = {
      ...changes,
      updatedAt: new Date(),
    };
    await this.getFirestore().updateDocument(`${OCCURRENCES_PATH(uid)}/${occurrenceId}`, payload);
    return true;
  }

  async deleteOccurrence(uid, occurrenceId) {
    if (!uid) throw new Error('SchedulingService.deleteOccurrence requires a uid.');
    await this.getFirestore().deleteDocument(`${OCCURRENCES_PATH(uid)}/${occurrenceId}`);
    return true;
  }

  async expandRecurringOccurrences(uid, windowStart, windowEnd) {
    if (!uid) throw new Error('SchedulingService.expandRecurringOccurrences requires a uid.');
    const templates = await this.getTemplates(uid);
    const occurrences = await this.getOccurrences(uid, windowStart, windowEnd);
    const existingKeys = new Set(
      occurrences
        .filter((occ) => occ.templateId)
        .map((occ) => `${occ.templateId}:${new Date(occ.start).toISOString()}`)
    );

    const creations = [];
    templates.forEach((template) => {
      if (!template.recurrence || template.recurrence === 'oneOff') {
        return;
      }
      const generatedInstances = generateTemplateInstances(template, windowStart, windowEnd);
      generatedInstances.forEach((instance) => {
        const key = `${template.id}:${instance.start.toISOString()}`;
        if (!existingKeys.has(key)) {
          const occurrence = normalizeOccurrenceInstance(instance, template);
          creations.push(this.getFirestore().addDocument(OCCURRENCES_PATH(uid), occurrence));
        }
      });
    });

    if (creations.length === 0) {
      return [];
    }

    const results = await Promise.all(creations);
    return results;
  }
}
