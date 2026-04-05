import AsyncStorage from '@react-native-async-storage/async-storage';
import { taskAPI, invoiceAPI, meetingAPI, projectAPI, clientAPI } from './api';

const LAST_CHECK_KEY = 'notification_last_check';

// Lazily resolve expo-notifications — only available in custom/dev builds, not Expo Go
function getNotifications() {
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

export function setupNotificationHandler() {
  const Notifications = getNotifications();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function requestNotificationPermission() {
  const Notifications = getNotifications();
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

async function sendLocalNotification(title, body, data = {}) {
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null, // fire immediately
  });
}

// Returns YYYY-MM-DD string in local time
function toLocalDateStr(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr() {
  return toLocalDateStr(new Date());
}

// ─── Task Reminders (for assigned users) ────────────────────────────────────
// Schedules 2-hour interval local notifications for tasks assigned to the
// current user that are todo/in_progress and due today.
export async function scheduleTaskReminders(currentUser) {
  const Notifications = getNotifications();
  if (!Notifications || !currentUser) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  try {
    // Cancel previously scheduled task-reminder notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'task_reminder') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    const res = await taskAPI.getAll({});
    const all = res.data?.data || res.data || [];
    const today = todayStr();
    const userId = currentUser._id;

    const tasks = (Array.isArray(all) ? all : []).filter((t) => {
      if (!t.dueDate) return false;
      if (t.status !== 'todo' && t.status !== 'in_progress') return false;
      if (toLocalDateStr(t.dueDate) !== today) return false;
      // Superadmin gets all, others only their assigned tasks
      if (currentUser.role === 'superadmin') return true;
      return (t.assignees || []).some(
        (a) => (a._id || a) === userId
      );
    });

    if (tasks.length === 0) return;

    const taskTitles = tasks.map((t) => t.title).join(', ');
    const body =
      tasks.length === 1
        ? `"${tasks[0].title}" is due today`
        : `${tasks.length} tasks due today: ${taskTitles.length > 80 ? taskTitles.slice(0, 80) + '…' : taskTitles}`;

    // Schedule at 08:00, 10:00, 12:00, 14:00, 16:00, 18:00, 20:00 (skip past hours)
    const reminderHours = [8, 10, 12, 14, 16, 18, 20];
    const nowHour = new Date().getHours();

    for (const hour of reminderHours) {
      if (hour <= nowHour) continue;
      const trigger = new Date();
      trigger.setHours(hour, 0, 0, 0);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Task Reminder',
          body,
          data: { type: 'task_reminder' },
        },
        trigger,
      });
    }
  } catch {
    // Silently fail — notifications are non-critical
  }
}

// ─── Superadmin Action Notifications ────────────────────────────────────────
// Checks for any new tasks, invoices, meetings, projects, clients created
// since the last check and fires an immediate local notification for each.
async function checkNewActivity(lastCheck) {
  const since = lastCheck ? new Date(lastCheck).toISOString() : null;
  if (!since) return; // First run — just set the baseline, don't notify

  const results = await Promise.allSettled([
    taskAPI.getAll({ createdAfter: since }),
    invoiceAPI.getAll({ createdAfter: since }),
    meetingAPI.getAll({ createdAfter: since }),
    projectAPI.getAll({ createdAfter: since }),
    clientAPI.getAll({ createdAfter: since }),
  ]);

  const [tasksRes, invoicesRes, meetingsRes, projectsRes, clientsRes] = results;

  const newItems = [
    {
      label: 'Task',
      icon: '✅',
      items: filterNew(tasksRes, lastCheck),
      nameKey: 'title',
    },
    {
      label: 'Invoice',
      icon: '🧾',
      items: filterNew(invoicesRes, lastCheck),
      nameKey: 'invoiceNumber',
    },
    {
      label: 'Meeting',
      icon: '📅',
      items: filterNew(meetingsRes, lastCheck),
      nameKey: 'title',
    },
    {
      label: 'Project',
      icon: '📁',
      items: filterNew(projectsRes, lastCheck),
      nameKey: 'name',
    },
    {
      label: 'Client',
      icon: '👤',
      items: filterNew(clientsRes, lastCheck),
      nameKey: 'name',
    },
  ];

  for (const { label, icon, items, nameKey } of newItems) {
    if (items.length === 0) continue;
    const names = items.slice(0, 3).map((i) => i[nameKey] || 'Untitled').join(', ');
    const body =
      items.length === 1
        ? `New ${label}: ${names}`
        : `${items.length} new ${label}s: ${names}${items.length > 3 ? '…' : ''}`;
    await sendLocalNotification(`${icon} ${label} Created`, body, { type: 'superadmin_action', entity: label.toLowerCase() });
  }
}

function filterNew(settledResult, since) {
  if (settledResult.status !== 'fulfilled') return [];
  const data = settledResult.value?.data?.data || settledResult.value?.data || [];
  const all = Array.isArray(data) ? data : [];
  return all.filter((item) => {
    if (!item.createdAt) return false;
    return new Date(item.createdAt) > new Date(since);
  });
}

// ─── Main entry point ────────────────────────────────────────────────────────
export async function runNotificationCheck(currentUser) {
  if (!currentUser) return;

  const granted = await requestNotificationPermission();
  if (!granted) return;

  try {
    // Always schedule task reminders for assigned tasks
    await scheduleTaskReminders(currentUser);

    // Superadmin also gets real-time action notifications
    if (currentUser.role === 'superadmin') {
      const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY);
      await checkNewActivity(lastCheck);
    }
  } catch {
    // Non-critical
  } finally {
    // Always update the last check timestamp
    await AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());
  }
}
