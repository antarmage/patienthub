import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Notifs = typeof import("expo-notifications");
let _notifs: Notifs | null = null;

async function getNotifs(): Promise<Notifs | null> {
  if (Platform.OS === "web") return null;
  if (_notifs) return _notifs;
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
}

async function tryCancelId(Notifications: Notifs, id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or not found
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifs();
  if (!Notifications) return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

// Schedules finite DATE triggers for each dose/day over the full medicine course.
// Cancels any existing reminders for this medicine before scheduling, making the
// function safe to call on add and on reschedule. IDs are persisted to AsyncStorage.
export async function scheduleMedicineReminders(
  medicineId: string,
  name: string,
  dosage: string,
  times: string[],
  durationDays: number,
  startDate?: Date,
): Promise<string[]> {
  const Notifications = await getNotifs();
  if (!Notifications) return [];

  await cancelMedicineReminders(medicineId);

  const start = startDate ?? new Date();
  const now = new Date();
  const ids: string[] = [];

  for (let day = 0; day < durationDays; day++) {
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
      } catch (err) {
        console.warn(`[notifications] Failed to schedule medicine reminder ${id}:`, err);
      }
    }
  }

  if (ids.length > 0) {
    await AsyncStorage.setItem(`@saiviemom_notif_ids_med_${medicineId}`, JSON.stringify(ids));
  }
  return ids;
}

export async function cancelMedicineReminders(medicineId: string): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;
  const key = `@saiviemom_notif_ids_med_${medicineId}`;
  const stored = await AsyncStorage.getItem(key);
  if (stored) {
    const ids: string[] = JSON.parse(stored);
    for (const id of ids) {
      await tryCancelId(Notifications, id);
    }
  }
  await AsyncStorage.removeItem(key);
}

// Schedules DATE triggers 24 h and 1 h before the appointment.
// Cancels any existing reminders for this appointment before scheduling.
export async function scheduleAppointmentReminders(
  appointmentId: string,
  doctorName: string,
  clinicName: string,
  dateTime: Date,
): Promise<string[]> {
  const Notifications = await getNotifs();
  if (!Notifications) return [];

  await cancelAppointmentReminders(appointmentId);

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
    } catch (err) {
      console.warn(`[notifications] Failed to schedule appointment reminder ${slot.id}:`, err);
    }
  }

  if (ids.length > 0) {
    await AsyncStorage.setItem(
      `@saiviemom_notif_ids_appt_${appointmentId}`,
      JSON.stringify(ids),
    );
  }
  return ids;
}

export async function cancelAppointmentReminders(appointmentId: string): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;
  const key = `@saiviemom_notif_ids_appt_${appointmentId}`;
  const stored = await AsyncStorage.getItem(key);
  if (stored) {
    const ids: string[] = JSON.parse(stored);
    for (const id of ids) {
      await tryCancelId(Notifications, id);
    }
  }
  await AsyncStorage.removeItem(key);
}

// Schedules one DATE trigger per day at 3 PM for the next `days` days.
// Each day is keyed separately so cancelling today does not affect future days.
// Skips dates already scheduled. Call scheduleWaterReminders() on tracker focus
// to extend the window as days pass.
const WATER_NUDGE_DAYS = 7;
const waterDateKey = (dateStr: string) => `@saiviemom_notif_water_${dateStr}`;

export async function scheduleWaterReminders(days = WATER_NUDGE_DAYS): Promise<void> {
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
    if (existing) continue;

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
    } catch (err) {
      console.warn(`[notifications] Failed to schedule water nudge for ${dateStr}:`, err);
    }
  }
}

// Cancels today's water nudge (e.g. when the daily goal is reached).
// Future days' nudges remain scheduled and will fire at 3 PM.
export async function cancelWaterNudge(): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;
  const todayStr = new Date().toISOString().split("T")[0];
  const key = waterDateKey(todayStr);
  const id = await AsyncStorage.getItem(key);
  if (!id) return;
  await tryCancelId(Notifications, id);
  await AsyncStorage.removeItem(key);
}

// Cancels all pending water nudges (e.g. when the user disables water reminders).
export async function cancelAllWaterReminders(): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;
  const allKeys = await AsyncStorage.getAllKeys();
  const waterKeys = allKeys.filter((k) => k.startsWith("@saiviemom_notif_water_"));
  for (const key of waterKeys) {
    const id = await AsyncStorage.getItem(key);
    if (id) await tryCancelId(Notifications, id);
    await AsyncStorage.removeItem(key);
  }
}
