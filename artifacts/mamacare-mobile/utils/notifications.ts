import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// ─── Storage key helpers ──────────────────────────────────────────────────────

const medNotifKey = (id: string) => `@saiviemom_notif_ids_med_${id}`;
const apptNotifKey = (id: string) => `@saiviemom_notif_ids_appt_${id}`;
const waterDateKey = (dateStr: string) => `@saiviemom_notif_water_${dateStr}`;

function todayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

async function cancelIds(Notifications: Notifs, ids: string[]): Promise<void> {
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Already fired or cancelled — ignore
    }
  }
}

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifs();
  if (!Notifications) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// ─── Medicine reminders ───────────────────────────────────────────────────────
// Schedules finite DATE triggers (times × min(durationDays, 30) days) so
// reminders stop automatically at the end of the medication course.

export async function scheduleMedicineReminder(
  medicineId: string,
  name: string,
  dosage: string,
  times: string[],
  durationDays: number,
  startDate?: Date,
): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;

  const start = startDate ?? new Date();
  const maxDays = Math.min(durationDays, 30);
  const now = new Date();
  const ids: string[] = [];

  for (let day = 0; day < maxDays; day++) {
    for (const timeStr of times) {
      const [hh, mm] = timeStr.split(":").map(Number);
      if (isNaN(hh) || isNaN(mm)) continue;
      const trigger = new Date(start);
      trigger.setDate(trigger.getDate() + day);
      trigger.setHours(hh, mm, 0, 0);
      if (trigger <= now) continue;

      const id = `med_${medicineId}_d${day}_${String(hh).padStart(2, "0")}${String(mm).padStart(2, "0")}`;
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title: `Time for ${name}`,
            body: `Take your ${dosage} dose now`,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: trigger,
          },
        });
        ids.push(id);
      } catch {
        // Silently ignore individual failures
      }
    }
  }

  await AsyncStorage.setItem(medNotifKey(medicineId), JSON.stringify(ids));
}

export async function cancelMedicineReminder(medicineId: string): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;
  const key = medNotifKey(medicineId);
  const stored = await AsyncStorage.getItem(key);
  if (stored) {
    await cancelIds(Notifications, JSON.parse(stored));
  }
  await AsyncStorage.removeItem(key);
}

// ─── Appointment reminders ────────────────────────────────────────────────────
// Schedules one-time DATE triggers 24 h and 1 h before the appointment.

export async function scheduleAppointmentReminder(
  appointmentId: string,
  doctorName: string,
  clinicName: string,
  dateTime: Date,
): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;

  const now = new Date();
  const clinic = clinicName ? ` at ${clinicName}` : "";
  const timeStr = dateTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const slots = [
    {
      id: `appt_${appointmentId}_24h`,
      date: new Date(dateTime.getTime() - 24 * 60 * 60 * 1000),
      title: "Appointment tomorrow",
      body: `Dr. ${doctorName}${clinic} — tomorrow at ${timeStr}`,
    },
    {
      id: `appt_${appointmentId}_1h`,
      date: new Date(dateTime.getTime() - 60 * 60 * 1000),
      title: "Appointment in 1 hour",
      body: `Dr. ${doctorName}${clinic} — get ready!`,
    },
  ];

  const ids: string[] = [];
  for (const slot of slots) {
    if (slot.date <= now) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: slot.id,
        content: { title: slot.title, body: slot.body, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: slot.date,
        },
      });
      ids.push(slot.id);
    } catch {
      // Silently ignore
    }
  }

  await AsyncStorage.setItem(apptNotifKey(appointmentId), JSON.stringify(ids));
}

export async function cancelAppointmentReminder(
  appointmentId: string,
): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;
  const key = apptNotifKey(appointmentId);
  const stored = await AsyncStorage.getItem(key);
  if (stored) {
    await cancelIds(Notifications, JSON.parse(stored));
  }
  await AsyncStorage.removeItem(key);
}

// ─── Water nudge ──────────────────────────────────────────────────────────────
// Schedules individual DATE triggers for each of the next `days` days at 3 PM.
// Each day is keyed separately so cancelling today's nudge (when goal is met)
// does not affect future days.

export async function scheduleWaterNudge(days = 14): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;

  const now = new Date();

  for (let i = 0; i < days; i++) {
    const target = new Date(now);
    target.setDate(target.getDate() + i);
    target.setHours(15, 0, 0, 0);
    if (target <= now) continue;

    const dateStr = target.toISOString().split("T")[0];
    const key = waterDateKey(dateStr);
    const existing = await AsyncStorage.getItem(key);
    if (existing) continue; // already scheduled for this date

    const id = `water_nudge_${dateStr}`;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: "Hydration check",
          body: "Don't forget your water intake today — you and baby need it!",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: target,
        },
      });
      await AsyncStorage.setItem(key, id);
    } catch {
      // Silently ignore
    }
  }
}

export async function cancelTodayWaterNudge(): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;
  const key = waterDateKey(todayDateStr());
  const id = await AsyncStorage.getItem(key);
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or cancelled
  }
  await AsyncStorage.removeItem(key);
}

export async function cancelAllWaterNudges(): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;
  const allKeys = await AsyncStorage.getAllKeys();
  const waterKeys = allKeys.filter((k) => k.startsWith("@saiviemom_notif_water_"));
  for (const key of waterKeys) {
    const id = await AsyncStorage.getItem(key);
    if (id) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {
        // Already fired or cancelled
      }
    }
    await AsyncStorage.removeItem(key);
  }
}
