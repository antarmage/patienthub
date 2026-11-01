import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VaccinationSeal } from "./HpvBadge";
import { HPV_BADGE_COPY, hpvVaccinationStatus, type HpvProtection, type HpvVaccinationStatus } from "@/lib/hpvProtection";

const copy: Record<HpvVaccinationStatus, { label: string; message: string }> = {
    ...HPV_BADGE_COPY,
    "not-vaccinated": { label: "HPV not vaccinated", message: "Patient reports no HPV vaccination. Discuss vaccination with the care team." },
    unknown: { label: "HPV vaccination unknown", message: "Patient is unsure of their HPV vaccination status." },
    "not-recorded": { label: "HPV vaccination not recorded", message: "No vaccination answer or clinic dose status is available." },
};

export function HpvPrintBadge({ status }: { status: HpvVaccinationStatus }) {
    const positive = status === "protected" || status === "in-progress";
    return <div data-testid={`hpv-print-badge-${status}`} style={{
        display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", margin: "0 0 16px",
        border: "1px solid #9aafa8", borderRadius: 12, breakInside: "avoid",
        background: status === "protected" ? "#CFE2DC" : status === "in-progress" ? "#E5C4DB" : "#FFFFFC",
        color: "#55344F", printColorAdjust: "exact", WebkitPrintColorAdjust: "exact",
    }}>
        {positive && <VaccinationSeal complete={status === "protected"} style={{ width: 64, height: 64, flexShrink: 0 }} />}
        <div>
            <strong style={{ display: "block", fontSize: 14 }}>{copy[status].label}</strong>
            <span style={{ display: "block", marginTop: 4, fontSize: 11 }}>{copy[status].message}</span>
        </div>
    </div>;
}

export function hpvPrintBadgeHtml(surveyAnswer?: string | null, clinicStatus?: HpvProtection | null): string {
    return renderToStaticMarkup(<HpvPrintBadge status={hpvVaccinationStatus(surveyAnswer, clinicStatus)} />);
}
