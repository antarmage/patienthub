export const bookingVisitReasons = ["Routine check-up", "Follow-up", "New concern", "Report review", "Other"] as const;
export type BookingVisitReason = typeof bookingVisitReasons[number];

export function bookingVisitContext(reason: BookingVisitReason | "", notes: string): string | null {
    return [reason, notes.trim()].filter(Boolean).join("\n") || null;
}

export function bookingVisitModeLabel(mode: string): string {
    return ({ "in-clinic": "In clinic", "home-visit": "Home visit", telemedicine: "Video call" } as Record<string, string>)[mode] || mode;
}
