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

// Cancel a single scheduled notification, ignoring errors if it has already fired.
async function tryCancelId(Notifications: Notifs, id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or not found — not an error
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

// Schedules a DAILY repeating trigger for each time slot in `times` (["HH:MM", ...]).
// Returns the list of successfully scheduled notification IDs and persists them.
// Call cancelMedicineReminders() when the medicine is deleted or its course expires.
export async function scheduleMedicineReminders(
  medicineId: string,
  name: string,
  dosage: string,
  times: string[],
): Promise<string[]> {
  const Notifications = await getNotifs();
  if (!Notifications) return [];

  const ids: string[] = [];
  for (const timeStr of times) {
    const [hh, mm] = timeStr.split(":").map(Number);
    if (isNaN(hh) || isNaN(mm)) continue;
    const id = `med_${medicineId}_${String(hh).padStart(2, "0")}${String(mm).padStart(2, "0")}`;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: id,
        content: {
          title: `Time for ${name}`,
          body: `Take your ${dosage} dose now`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: hh,
          minute: mm,
        },
      });
      ids.push(id);
    } catch (err) {
      console.warn(`[notifications] Failed to schedule medicine reminder ${id}:`, err);
    }
  }

  if (ids.length > 0) {
    await AsyncStorage.setItem(`@saiviemom_notif_ids_med_${medicineId}`, JSON.stringify(ids));
  }
  return ids;
}

// Reads persisted IDs for the medicine, cancels them all, and clears storage.
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

// Schedules two DATE triggers: 24 h before and 1 h before the appointment.
// Returns the list of successfully scheduled IDs and persists them.
// Triggers in the past are skipped silently.
export async function scheduleAppointmentReminders(
  appointmentId: string,
  doctorName: string,
  clinicName: string,
  dateTime: Date,
): Promise<string[]> {
  const Notifications = await getNotifs();
  if (!Notifications) return [];

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

// Reads persisted IDs for the appointment, cancels them all, and clears storage.
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

// Water nudge constants
const WATER_NUDGE_ID = "water_nudge_3pm";
const WATER_NUDGE_DATE_KEY = "@saiviemom_notif_water_scheduled_date";

// Schedules a one-time DATE trigger for today at 3 PM if:
//   a) it is still before 3 PM today, and
//   b) a nudge has not already been scheduled for today.
// Call this on water tracker focus (when goal is unmet) and on first permission grant.
// Call cancelWaterNudge() when the daily goal is reached.
// The next day's nudge is scheduled on the next app open, keeping scheduling on-demand.
export async function scheduleWaterReminders(): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;

  const now = new Date();
  const todayAt3PM = new Date(now);
  todayAt3PM.setHours(15, 0, 0, 0);
  if (todayAt3PM <= now) return;

  const todayStr = now.toISOString().split("T")[0];
  const scheduledDate = await AsyncStorage.getItem(WATER_NUDGE_DATE_KEY);
  if (scheduledDate === todayStr) return;

  await tryCancelId(Notifications, WATER_NUDGE_ID);

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: WATER_NUDGE_ID,
      content: {
        title: "Hydration check",
        body: "Don't forget your water intake today — you and baby need it!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: todayAt3PM,
      },
    });
    await AsyncStorage.setItem(WATER_NUDGE_DATE_KEY, todayStr);
  } catch (err) {
    console.warn("[notifications] Failed to schedule water nudge:", err);
  }
}

// Cancels today's water nudge (e.g. when the daily goal is reached).
export async function cancelWaterNudge(): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;
  await tryCancelId(Notifications, WATER_NUDGE_ID);
  await AsyncStorage.removeItem(WATER_NUDGE_DATE_KEY);
}

// Cancels the water nudge and clears all related state (e.g. when toggling off).
export async function cancelAllWaterReminders(): Promise<void> {
  await cancelWaterNudge();
}
