'use strict';

const DEFAULT_REMINDER_DAYS = 30;
const ALLOWED_REMINDER_DAYS = Object.freeze([0, 30, 60, 90]);

function normalizeTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeReminderDays(value) {
  const parsed = Number.parseInt(value, 10);
  return ALLOWED_REMINDER_DAYS.includes(parsed) ? parsed : DEFAULT_REMINDER_DAYS;
}

function ageState(timestamp, reminderDays = DEFAULT_REMINDER_DAYS, now = Date.now()) {
  const days = normalizeReminderDays(reminderDays);
  const normalized = normalizeTimestamp(timestamp);
  if (!normalized) return { state: 'never', ageDays: null, reminderDays: days };
  const ageMs = Math.max(0, Number(now) - new Date(normalized).getTime());
  const ageDays = Math.floor(ageMs / 86400000);
  if (days === 0) return { state: 'current', ageDays, reminderDays: days };
  return { state: ageDays >= days ? 'due' : 'current', ageDays, reminderDays: days };
}

function summarize(settings = {}, now = Date.now()) {
  const reminderDays = normalizeReminderDays(settings.backupReminderDays);
  return {
    reminderDays,
    backup: ageState(settings.lastBackupAt, reminderDays, now),
    verified: ageState(settings.lastVerifiedBackupAt, reminderDays, now),
    verifiedBackupCreatedAt: normalizeTimestamp(settings.lastVerifiedBackupCreatedAt)
  };
}

module.exports = {
  DEFAULT_REMINDER_DAYS,
  ALLOWED_REMINDER_DAYS,
  normalizeTimestamp,
  normalizeReminderDays,
  ageState,
  summarize
};
