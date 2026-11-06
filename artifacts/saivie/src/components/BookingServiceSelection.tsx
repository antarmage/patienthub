import { useState } from "react";
import { Baby, CheckCircle2, FlaskConical, Flower2, Heart, Leaf, ShieldCheck, Stethoscope, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bookingServiceCategories, groupBookingServices, suggestedBookingCategory, type BookingService, type BookingServiceCategory } from "@/lib/bookingServices";
import type { BookingCategory } from "../../../../lib/db/src/booking-catalog";

const categoryIcons = {
    Pregnancy: Baby, Fertility: Leaf, Gynae: Stethoscope, "PCOS & hormonal": Flower2,
    "Family planning": ShieldCheck, Menopause: Sun, "Tests & scans": FlaskConical, Other: Heart,
};

export function BookingServiceSelection({ services, selectedId, onSelect, careArea, loading, error, onRetry, categories }: {
    services: BookingService[];
    selectedId: string;
    onSelect: (id: string) => void;
    careArea: string;
    loading: boolean;
    error: boolean;
    onRetry: () => void;
    categories?: BookingCategory[];
}) {
    const activeCategories = categories?.filter((category) => category.isActive);
    const area = careArea === "Pregnant" ? "Pregnancy" : careArea;
    const suggested = categories ? String(activeCategories?.find((category) => category.careArea === area && area !== "")?.id || "") : suggestedBookingCategory(careArea);
    const [filter, setFilter] = useState<string>("Suggested");
    const tabs = [{ id: "Suggested", name: "Suggested" }, { id: "All", name: "All" },
        ...(activeCategories ? [...activeCategories].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id).map((category) => ({ id: String(category.id), name: category.name }))
            : bookingServiceCategories.map((name) => ({ id: name, name })))];
    const effectiveFilter = tabs.some((tab) => tab.id === filter) ? filter : "All";
    const groups = groupBookingServices(services, effectiveFilter, suggested, categories);
    return <div className="space-y-5">
        <div className="space-y-1">
            <h2 className="font-serif text-2xl font-bold text-[#1f4a42]">What does she need?</h2>
            <p className="text-sm text-[#52645e]">Pick one reason for this appointment. Tap the selected option again to clear it.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Service categories">
            {tabs.map((category) => <Button
                key={category.id} type="button" variant="outline" aria-pressed={effectiveFilter === category.id}
                onClick={() => setFilter(effectiveFilter === category.id ? "All" : category.id)}
                className={`h-10 rounded-full px-4 ${effectiveFilter === category.id ? "border-[#2d6a5f] bg-[#2d6a5f] text-white hover:bg-[#24574e] hover:text-white" : "border-[#d2dfd9] bg-white text-[#243b35]"}`}>
                {category.name}
            </Button>)}
        </div>
        {loading ? <p role="status" className="text-sm text-[#52645e]">Loading appointment options...</p>
            : error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not load appointment options. <Button type="button" variant="link" onClick={onRetry}>Retry services</Button></div>
            : groups.length === 0 ? <p role="status" className="rounded-xl border border-[#d2dfd9] bg-white p-4 text-sm text-[#52645e]">{services.length === 0 ? "No active services are available. Ask the clinic to update its service catalog." : "No services in this category. Choose All to see every available option."}</p>
            : groups.map((group) => {
                const Icon = categories ? Stethoscope : categoryIcons[group.category as BookingServiceCategory] || Heart;
                return <section key={group.category} aria-label={group.label} className="space-y-2">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[#52645e]">{group.label}</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {group.services.map((service) => <button key={service.id} type="button"
                            aria-pressed={selectedId === service.id} onClick={() => onSelect(selectedId === service.id ? "" : service.id)}
                            data-testid={`booking-service-${service.id}`}
                            className={`flex min-h-20 items-center gap-3 rounded-2xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saivie-teal focus-visible:ring-offset-2 ${selectedId === service.id ? "border-[#2d6a5f] bg-[#f0f7f4] ring-1 ring-[#2d6a5f]" : "border-[#d2dfd9] bg-white hover:bg-[#f0f7f4]"}`}>
                            <Icon aria-hidden="true" className="h-6 w-6 shrink-0 text-[#2d6a5f]" />
                            <div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold text-[#243b35]">{service.name}</p>
                                {service.description && <p className="mt-0.5 break-words text-xs text-[#52645e]">{service.description}</p>}
                            </div>
                            {selectedId === service.id && <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 fill-[#2d6a5f] text-white" />}
                        </button>)}
                    </div>
                </section>;
            })}
        {!categories && (filter === "Pregnancy" || filter === "Suggested" && suggested === "Pregnancy") && <p className="text-xs text-[#52645e]">For an antenatal check-up, choose the clinic's consultation or follow-up service. Postpartum review is for after delivery. Existing catalog fees are unchanged.</p>}
        {!categories && (filter === "Menopause" || filter === "Suggested" && suggested === "Menopause") && <p className="text-xs text-[#52645e]">For menopause concerns, choose the clinic's consultation or follow-up service. Existing catalog fees are unchanged. Booking does not diagnose menopause or enable the care pathway; your doctor decides that separately.</p>}
        {activeCategories?.filter((category) => category.description && (String(category.id) === effectiveFilter || effectiveFilter === "Suggested" && String(category.id) === suggested))
            .map((category) => <p key={category.id} className="text-xs text-[#52645e]">{category.description}</p>)}
        <p className="text-[10px] leading-relaxed text-[#52645e]">Options come from your clinic's active service catalog. Suggested ordering follows the patient's care area when available; everything remains available under All.</p>
    </div>;
}
