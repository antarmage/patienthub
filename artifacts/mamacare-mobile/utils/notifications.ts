import { Platform } from "react-native";

type Notifs = typeof import("expo-notifications");

let _notifs: Notifs | null = null;

async function getNotifs(): Promise<Notifs | null> {
  if (Platform.OS === "web") return null;
  if (_notifs) return _notifs;
  try {
    _notifs = await import("expo-notifications");
    _notifs.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    return _notifs;
  } catch {
    return null;
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifs();
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function cancelNotifications(ids: string[]): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications || !ids?.length) return;
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
}

export async function scheduleMedicineReminders(
  _medicineId: string,
  name: string,
  dosage: string,
  times: string[],
  _durationDays: number,
): Promise<string[]> {
  const Notifications = await getNotifs();
  if (!Notifications) return [];

  const ids: string[] = [];
  for (const time of times) {
    const [hourStr, minuteStr] = time.split(":");
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    if (isNaN(hour) || isNaN(minute)) continue;
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Time for ${name}`,
          body: `Take your ${dosage} dose now`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
      ids.push(id);
    } catch {}
  }
  return ids;
}

export async function scheduleAppointmentReminders(
  _appointmentId: string,
  doctorName: string,
  clinicName: string,
  dateTime: Date,
): Promise<string[]> {
  const Notifications = await getNotifs();
  if (!Notifications) return [];

  const ids: string[] = [];
  const clinic = clinicName ? ` at ${clinicName}` : "";

  const oneDayBefore = new Date(dateTime.getTime() - 24 * 60 * 60 * 1000);
  const oneHourBefore = new Date(dateTime.getTime() - 60 * 60 * 1000);
  const now = new Date();

  if (oneDayBefore > now) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Appointment tomorrow",
          body: `Dr. ${doctorName}${clinic} — tomorrow at ${dateTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneDayBefore,
        },
      });
      ids.push(id);
    } catch {}
  }

  if (oneHourBefore > now) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Appointment in 1 hour",
          body: `Dr. ${doctorName}${clinic} — get ready!`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneHourBefore,
        },
      });
      ids.push(id);
    } catch {}
  }

  return ids;
}

const WATER_REMINDER_HOURS = [9, 11, 13, 15, 17, 19];

export async function scheduleWaterReminders(): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;

  await cancelWaterReminders(Notifications);

  const messages = [
    "Time for a glass of water",
    "Stay hydrated for you and baby",
    "Drink up! You're doing great",
    "Hydration check — have you had water lately?",
    "A glass of water keeps the doctor away",
    "Evening hydration reminder",
  ];

  for (let i = 0; i < WATER_REMINDER_HOURS.length; i++) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: `water_reminder_${WATER_REMINDER_HOURS[i]}`,
        content: {
          title: "Hydration reminder",
          body: messages[i] ?? "Time for a glass of water",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: WATER_REMINDER_HOURS[i],
          minute: 0,
        },
      });
    } catch {}
  }
}

async function cancelWaterReminders(Notifications: Notifs): Promise<void> {
  for (const hour of WATER_REMINDER_HOURS) {
    try {
      await Notifications.cancelScheduledNotificationAsync(`water_reminder_${hour}`);
    } catch {}
  }
}

export async function cancelAllWaterReminders(): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;
  await cancelWaterReminders(Notifications);
}
