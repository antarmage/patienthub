import { Platform } from "react-native";

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  try {
    const { default: Notifications } = await import("expo-notifications");
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function scheduleWaterReminders(): Promise<void> {
  return;
}

export async function scheduleMedicineReminders(
  _medicineId: string,
  _name: string,
  _dosage: string,
  _times: string[],
  _durationDays: number,
): Promise<string[]> {
  return [];
}

export async function scheduleAppointmentReminders(
  _appointmentId: string,
  _doctorName: string,
  _clinicName: string,
  _dateTime: Date,
): Promise<string[]> {
  return [];
}

export async function cancelNotifications(_ids: string[]): Promise<void> {
  return;
}
