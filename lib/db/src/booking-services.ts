import type { BookingCategory } from "./booking-catalog";

export const bookingServiceCategories = ["Pregnancy", "Fertility", "Gynae", "PCOS & hormonal", "Family planning", "Menopause", "Tests & scans", "Other"] as const;
export type BookingServiceCategory = typeof bookingServiceCategories[number];
export interface BookingService {
    id: string;
    name: string;
    category: string;
    description?: string | null;
    price: number;
    bookingCategoryIds?: number[];
}

export function bookingServiceCategory(service: Pick<BookingService, "name" | "category">): BookingServiceCategory {
    const text = `${service.name} ${service.category}`.toLowerCase();
    if (/scan|ultrasound|\busg\b|lab|test|screening|pap smear|blood|urine/.test(text)) return "Tests & scans";
    if (/contracept|family planning|sterili[sz]|copper.?t|\biucd\b|\biud\b/.test(text)) return "Family planning";
    if (/menopaus/.test(text)) return "Menopause";
    if (/pcos|pcod|hormon|menstrual|irregular period/.test(text)) return "PCOS & hormonal";
    if (/fertility|conception|ovulation|\biui\b|\bivf\b/.test(text)) return "Fertility";
    if (/pregnan|antenatal|obstetric|postnatal|postpartum|\banc\b/.test(text)) return "Pregnancy";
    if (/gynae|gyne|women.?s health/.test(text)) return "Gynae";
    return "Other";
}

export function suggestedBookingCategory(careArea: string): BookingServiceCategory | null {
    if (careArea === "Pregnant" || careArea === "Pregnancy") return "Pregnancy";
    if (careArea === "PCOS") return "PCOS & hormonal";
    return careArea === "Fertility" || careArea === "Gynae" ? careArea : null;
}

function routineCheckup(service: BookingService) {
    return /^(?:(?:general|routine|gynae|gynecology|gynaecology)\s+)?(?:consultation|follow[\s-]?up(?:\s+(?:consultation|visit|check[\s-]?up))?|check[\s-]?up)(?:\s+consultation)?$/i.test(service.name.trim())
        && ["Other", "Gynae"].includes(bookingServiceCategory(service));
}

function menopauseConsultation(service: BookingService) {
    return routineCheckup(service) || bookingServiceCategory(service) === "Gynae"
        && /^(?:gynae|gyne(?:cology|cologist)|gynae(?:cology|cologist))\s+(?:consultation|follow[\s-]?up(?:\s+consultation)?)(?:\s+(?:with\s+)?dr\.?\s+.+)?$/i.test(service.name.trim());
}

export function groupBookingServices(services: BookingService[], filter: string, suggested: string | null, configured?: BookingCategory[]) {
    if (configured) {
        const active = configured.filter((category) => category.isActive).sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
        const ordered = filter === "Suggested" ? [...active.filter((category) => String(category.id) === suggested), ...active.filter((category) => String(category.id) !== suggested)] : active;
        const matching = ordered.filter((category) => filter === "All" || filter === "Suggested" || String(category.id) === filter);
        const seen = new Set<string>();
        const groups = matching.map((category) => ({
            category: String(category.id),
            label: filter === "Suggested" && String(category.id) === suggested ? `Suggested for ${category.name.toLowerCase()}` : category.name,
            services: services.filter((service) => {
                if (!service.bookingCategoryIds?.includes(category.id) || seen.has(service.id)) return false;
                seen.add(service.id); return true;
            }),
        })).filter((group) => group.services.length > 0);
        if (filter === "All" || filter === "Suggested") {
            const unassigned = services.filter((service) => !seen.has(service.id));
            if (unassigned.length) groups.push({ category: "unassigned", label: "Unassigned", services: unassigned });
        }
        return groups;
    }
    const pregnancyView = filter === "Pregnancy" || filter === "Suggested" && suggested === "Pregnancy";
    const menopauseView = filter === "Menopause" || filter === "Suggested" && suggested === "Menopause";
    const consultationCategory = pregnancyView ? "Pregnancy" : menopauseView ? "Menopause" : null;
    const categories = filter === "Suggested" && suggested
        ? [suggested, ...bookingServiceCategories.filter((category) => category !== suggested)]
        : bookingServiceCategories;
    return categories.map((category) => ({
        category,
        label: filter === "Suggested" && category === suggested ? `Suggested for ${category.toLowerCase()}` : category,
        services: services.filter((service) => consultationCategory && (menopauseView ? menopauseConsultation(service) : routineCheckup(service))
            ? category === consultationCategory : bookingServiceCategory(service) === category),
    })).filter((group) => group.services.length > 0 && (filter === "All" || filter === "Suggested" || filter === group.category));
}
