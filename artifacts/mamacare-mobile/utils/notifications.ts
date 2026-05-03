import { Platform } from "react-native";

type Notifs = typeof import("expo-notifications");

const WATER_NUDGE_ID = "water_nudge_3pm";

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
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function cancelNotifications(ids: string[]): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications || !ids?.length) return;
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Silently ignore — notification may have already fired or been cancelled
    }
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
    } catch {
      // Silently ignore individual scheduling failures
    }
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
  const timeStr = dateTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  const now = new Date();

  const oneDayBefore = new Date(dateTime.getTime() - 24 * 60 * 60 * 1000);
  if (oneDayBefore > now) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Appointment tomorrow",
          body: `Dr. ${doctorName}${clinic} — tomorrow at ${timeStr}`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: oneDayBefore,
        },
      });
      ids.push(id);
    } catch {
      // Silently ignore
    }
  }

  const oneHourBefore = new Date(dateTime.getTime() - 60 * 60 * 1000);
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
    } catch {
      // Silently ignore
    }
  }

  return ids;
}

/**
 * Schedules a durable daily water nudge at 3 PM.
 * Repeats every day until explicitly cancelled via cancelWaterNudge().
 */
export async function scheduleWaterReminders(): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;

  // Cancel before re-scheduling to avoid duplicates
  try {
    await Notifications.cancelScheduledNotificationAsync(WATER_NUDGE_ID);
  } catch {
    // May not exist yet
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: WATER_NUDGE_ID,
      content: {
        title: "Hydration check",
        body: "Don't forget your water intake today — you and baby need it!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 15,
        minute: 0,
      },
    });
  } catch {
    // Silently ignore
  }
}

export async function cancelWaterNudge(): Promise<void> {
  const Notifications = await getNotifs();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(WATER_NUDGE_ID);
  } catch {
    // May not exist
  }
}

export async function cancelAllWaterReminders(): Promise<void> {
  await cancelWaterNudge();
}
