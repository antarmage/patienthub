export const bookingServiceCategories = ["Pregnancy", "Fertility", "Gynae", "PCOS & hormonal", "Family planning", "Menopause", "Tests & scans", "Other"] as const;
export type BookingServiceCategory = typeof bookingServiceCategories[number];
export interface BookingService {
    id: string;
    name: string;
    category: string;
    description?: string | null;
    price: number;
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

function pregnancyCheckup(service: BookingService) {
    return /^(?:(?:general|routine|gynae|gynecology|gynaecology)\s+)?(?:consultation|follow[\s-]?up(?:\s+(?:consultation|visit|check[\s-]?up))?|check[\s-]?up)(?:\s+consultation)?$/i.test(service.name.trim())
        && ["Other", "Gynae"].includes(bookingServiceCategory(service));
}

export function groupBookingServices(services: BookingService[], filter: string, suggested: BookingServiceCategory | null) {
    const pregnancyView = filter === "Pregnancy" || filter === "Suggested" && suggested === "Pregnancy";
    const categories = filter === "Suggested" && suggested
        ? [suggested, ...bookingServiceCategories.filter((category) => category !== suggested)]
        : bookingServiceCategories;
    return categories.map((category) => ({
        category,
        label: filter === "Suggested" && category === suggested ? `Suggested for ${category.toLowerCase()}` : category,
        services: services.filter((service) => pregnancyView && pregnancyCheckup(service)
            ? category === "Pregnancy" : bookingServiceCategory(service) === category),
    })).filter((group) => group.services.length > 0 && (filter === "All" || filter === "Suggested" || filter === group.category));
}
